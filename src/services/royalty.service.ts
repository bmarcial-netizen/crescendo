import { db } from '../db';
import {
  royaltyStatements,
  royaltyLineItems,
  dividendDistributions,
  dividendPayments,
  investorPositions,
  artists,
  ledgerAccounts,
  capTableSnapshots,
  capTableSnapshotRows,
} from '../db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { createDoubleEntry, getPlatformAccount } from './ledger.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { parseCsv } from '../utils/csv';

// ── CSV Row Shape ──────────────────────────────────────────────────────────
// Each row in the distributor CSV is a single line item.
// Required header columns: artist_id, period_start, period_end
// Revenue columns: revenue_gross, revenue_net (at least one required)
// Optional: store, territory, track_name, isrc, units, currency

interface RoyaltyLineItemCsvRow {
  artist_id: string;
  period_start: string;
  period_end: string;
  store?: string;
  territory?: string;
  track_name?: string;
  isrc?: string;
  units?: string;
  revenue_gross?: string;
  revenue_net?: string;
  currency?: string;
  [key: string]: string | undefined; // allow extra columns
}

/**
 * Upload a royalty CSV.
 *
 * Flow:
 *  1. Parse every row as a line item.
 *  2. Group rows by (artist_id, period_start, period_end) to form statements.
 *  3. For each group:
 *     a. Insert a royalty_statement with totalRoyalties computed FROM line items.
 *     b. Insert each line item referencing that statement.
 *  4. Return the created statements with line-item counts.
 */
export async function uploadRoyaltyStatement(
  buffer: Buffer,
  uploadedBy: string
) {
  const rows = parseCsv<RoyaltyLineItemCsvRow>(buffer);
  if (rows.length === 0) throw new BadRequestError('CSV is empty');

  // Validate required columns exist
  const first = rows[0];
  if (!('artist_id' in first) || !('period_start' in first) || !('period_end' in first)) {
    throw new BadRequestError(
      'CSV missing required columns: artist_id, period_start, period_end'
    );
  }
  if (!('revenue_gross' in first) && !('revenue_net' in first)) {
    throw new BadRequestError(
      'CSV must have at least one of: revenue_gross, revenue_net'
    );
  }

  // Group rows by statement key
  const groups = new Map<
    string,
    { artistId: string; periodStart: string; periodEnd: string; rows: RoyaltyLineItemCsvRow[] }
  >();

  for (const row of rows) {
    if (!row.artist_id || !row.period_start || !row.period_end) {
      throw new BadRequestError('Row missing artist_id, period_start, or period_end');
    }
    const key = `${row.artist_id}|${row.period_start}|${row.period_end}`;
    if (!groups.has(key)) {
      groups.set(key, {
        artistId: row.artist_id,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(row);
  }

  const results = [];

  for (const [, group] of groups) {
    // Verify artist exists
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, group.artistId))
      .limit(1);
    if (!artist) throw new NotFoundError(`Artist not found: ${group.artistId}`);

    const result = await db.transaction(async (tx) => {
      // Compute aggregate totals FROM line items
      let totalGross = 0;
      let totalNet = 0;

      const lineItemValues = group.rows.map((row) => {
        const gross = parseFloat(row.revenue_gross || '0');
        const net = parseFloat(row.revenue_net || row.revenue_gross || '0');
        totalGross += gross;
        totalNet += net;

        return {
          artistId: group.artistId,
          store: row.store || null,
          territory: row.territory || null,
          trackName: row.track_name || null,
          isrc: row.isrc || null,
          units: (row.units || '0').toString(),
          revenueGross: gross.toFixed(4),
          revenueNet: net.toFixed(4),
          currency: row.currency || 'USD',
          rawRowJson: row as Record<string, unknown>,
          // statementId set below after insert
        };
      });

      // Use net revenue as the total royalties (what the artist actually received)
      const totalRoyalties = Math.round(totalNet * 10000) / 10000;

      // Insert the statement with computed aggregate
      const [statement] = await tx
        .insert(royaltyStatements)
        .values({
          artistId: group.artistId,
          periodStart: group.periodStart,
          periodEnd: group.periodEnd,
          totalRoyalties: totalRoyalties.toString(),
          rawData: { lineItemCount: group.rows.length, totalGross, totalNet },
          uploadedBy,
        })
        .returning();

      // Insert all line items referencing the statement
      for (const item of lineItemValues) {
        await tx.insert(royaltyLineItems).values({
          ...item,
          statementId: statement.id,
        });
      }

      return {
        statement,
        lineItemCount: lineItemValues.length,
        totalGross: totalGross.toFixed(4),
        totalNet: totalNet.toFixed(4),
      };
    });

    results.push(result);
  }

  return results;
}

/**
 * Distribute royalties for a statement.
 *
 * Flow (all in one Postgres transaction):
 *  1. Validate statement exists and hasn't been distributed yet.
 *  2. Create a cap_table_snapshot at record_date = now.
 *  3. Insert snapshot rows for every holder with shares > 0.
 *  4. Compute dividendPerShare from statement totals + artist revenueSharePct.
 *  5. Create dividend_distribution record linked to the snapshot.
 *  6. For each snapshot row, create ledger entries + dividend_payment records.
 *
 * Distributions use the SNAPSHOT, not the live positions table.
 * This ensures consistent pro-rata even if positions change mid-distribution.
 */
export async function distributeRoyalties(statementId: string) {
  const [statement] = await db
    .select()
    .from(royaltyStatements)
    .where(eq(royaltyStatements.id, statementId))
    .limit(1);

  if (!statement) throw new NotFoundError('Royalty statement not found');

  // Check if already distributed
  const [existing] = await db
    .select()
    .from(dividendDistributions)
    .where(eq(dividendDistributions.royaltyStatementId, statementId))
    .limit(1);

  if (existing) throw new BadRequestError('Statement already distributed');

  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, statement.artistId))
    .limit(1);

  if (!artist) throw new NotFoundError('Artist not found');

  if (artist.sharesOutstanding <= 0) {
    throw new BadRequestError('No shares outstanding — cannot distribute');
  }

  const totalRoyalties = parseFloat(statement.totalRoyalties);
  const revenueSharePct = parseFloat(artist.revenueSharePct);
  const totalDistributable = Math.round(totalRoyalties * revenueSharePct * 10000) / 10000;
  const dividendPerShare = totalDistributable / artist.sharesOutstanding;

  const result = await db.transaction(async (tx) => {
    // ── Step 1: Create cap table snapshot ──────────────────────────────
    const recordDate = new Date();

    const [snapshot] = await tx
      .insert(capTableSnapshots)
      .values({
        artistId: artist.id,
        recordDate,
        totalSharesOutstanding: artist.sharesOutstanding,
        snapshotSource: 'dividend_record_date',
      })
      .returning();

    // ── Step 2: Snapshot all current holders ───────────────────────────
    const holders = await tx
      .select()
      .from(investorPositions)
      .where(
        and(
          eq(investorPositions.artistId, artist.id),
          gt(investorPositions.sharesHeld, 0)
        )
      );

    for (const holder of holders) {
      await tx.insert(capTableSnapshotRows).values({
        snapshotId: snapshot.id,
        userId: holder.userId,
        shares: holder.sharesHeld,
        avgCost: holder.avgCostBasis,
      });
    }

    // ── Step 3: Create distribution record linked to snapshot ──────────
    const [distribution] = await tx
      .insert(dividendDistributions)
      .values({
        royaltyStatementId: statementId,
        artistId: artist.id,
        capTableSnapshotId: snapshot.id,
        totalDistributable: totalDistributable.toString(),
        dividendPerShare: dividendPerShare.toFixed(8),
        sharesOutstandingAtDistribution: artist.sharesOutstanding,
      })
      .returning();

    // ── Step 4: Distribute pro-rata using SNAPSHOT rows ───────────────
    const snapshotRows = await tx
      .select()
      .from(capTableSnapshotRows)
      .where(eq(capTableSnapshotRows.snapshotId, snapshot.id));

    const platformCash = await getPlatformAccount('platform:cash');
    if (!platformCash) throw new Error('Platform cash account missing');

    const payments = [];

    for (const row of snapshotRows) {
      const amountPaid = Math.round(row.shares * dividendPerShare * 10000) / 10000;
      if (amountPaid <= 0) continue;

      const walletName = `user:${row.userId}:wallet`;
      const [wallet] = await tx
        .select()
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.name, walletName))
        .limit(1);

      if (!wallet) continue;

      const txnId = await createDoubleEntry(tx, {
        debitAccountId: platformCash.id,
        creditAccountId: wallet.id,
        amount: amountPaid.toString(),
        txnType: 'dividend_payout',
        referenceId: distribution.id,
        description: `Dividend: ${row.shares} shares × $${dividendPerShare.toFixed(8)}/share`,
        idempotencyKey: `dividend:${distribution.id}:${row.userId}`,
      });

      const [payment] = await tx
        .insert(dividendPayments)
        .values({
          distributionId: distribution.id,
          userId: row.userId,
          sharesHeld: row.shares,
          amountPaid: amountPaid.toString(),
          ledgerTransactionId: txnId,
        })
        .returning();

      payments.push(payment);
    }

    return { distribution, snapshot, payments };
  });

  return result;
}
