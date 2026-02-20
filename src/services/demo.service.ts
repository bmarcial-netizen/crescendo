import { db } from '../db';
import {
  dividendPayments,
  dividendDistributions,
  capTableSnapshotRows,
  capTableSnapshots,
  royaltyLineItems,
  royaltyStatements,
  orders,
  investorPositions,
  dailyTradeTracking,
  tradeCooldowns,
  artistCandles,
  ledgerEntries,
  shareIssuanceEvents,
  idempotencyKeys,
  ledgerAccounts,
  artists,
  users,
  tractionIndexSnapshots,
  artistMetricSnapshots,
} from '../db/schema';
import { sql, eq, notLike } from 'drizzle-orm';
import { runTractionIndexForAll } from './tractionIndex.service';

/**
 * Wipe all transactional data, preserve artists + risk controls + metric snapshots,
 * delete non-demo users, reset wallet balances, rerun traction index.
 *
 * Delete order respects FK constraints (children first).
 */
export async function resetDemo() {
  const steps: { step: string; detail: string }[] = [];

  await db.transaction(async (tx) => {
    // ── 1. Wipe transactional tables (FK-safe order) ──────────────────────

    const wipeTargets = [
      { name: 'dividend_payments', table: dividendPayments },
      { name: 'dividend_distributions', table: dividendDistributions },
      { name: 'cap_table_snapshot_rows', table: capTableSnapshotRows },
      { name: 'cap_table_snapshots', table: capTableSnapshots },
      { name: 'royalty_line_items', table: royaltyLineItems },
      { name: 'royalty_statements', table: royaltyStatements },
      { name: 'orders', table: orders },
      { name: 'investor_positions', table: investorPositions },
      { name: 'daily_trade_tracking', table: dailyTradeTracking },
      { name: 'trade_cooldowns', table: tradeCooldowns },
      { name: 'artist_candles', table: artistCandles },
      { name: 'ledger_entries', table: ledgerEntries },
      { name: 'share_issuance_events', table: shareIssuanceEvents },
      { name: 'idempotency_keys', table: idempotencyKeys },
    ] as const;

    for (const target of wipeTargets) {
      const result = await tx.delete(target.table);
      steps.push({ step: `wipe ${target.name}`, detail: 'cleared' });
    }

    // ── 2. Delete non-demo user wallets + users ───────────────────────────

    // Delete wallets for non-demo users first (FK: ledger_accounts → users)
    await tx.delete(ledgerAccounts).where(
      sql`${ledgerAccounts.userId} IN (
        SELECT id FROM users WHERE email NOT LIKE '%@demo.crescendo.io'
      )`,
    );

    // Delete non-demo users
    const deletedUsers = await tx.delete(users).where(
      notLike(users.email, '%@demo.crescendo.io'),
    );
    steps.push({ step: 'delete non-demo users', detail: 'cleared' });

    // ── 3. Reset demo user wallet balances to zero ────────────────────────

    await tx
      .update(ledgerAccounts)
      .set({ balance: '0' })
      .where(sql`${ledgerAccounts.userId} IS NOT NULL`);
    steps.push({ step: 'reset wallet balances', detail: '0.0000' });

    // ── 4. Reset artist prices to base ────────────────────────────────────

    await tx.execute(sql`
      UPDATE artists SET
        current_price = base_price,
        current_bid = base_price * 0.95,
        current_ask = base_price * 1.05,
        circuit_breaker_status = 'closed',
        circuit_breaker_tripped_at = NULL,
        updated_at = NOW()
    `);
    steps.push({ step: 'reset artist prices to base', detail: 'done' });

    // ── 5. Wipe old traction snapshots (re-created by index run) ──────────

    await tx.delete(tractionIndexSnapshots);
    steps.push({ step: 'wipe traction_index_snapshots', detail: 'cleared' });
  });

  // ── 6. Rerun traction index (outside transaction — it does its own) ────

  let tractionResult;
  try {
    tractionResult = await runTractionIndexForAll();
    steps.push({
      step: 'rerun traction index',
      detail: `computed ${tractionResult.computed}/${tractionResult.cohortSize} artists`,
    });
  } catch (err: any) {
    steps.push({
      step: 'rerun traction index',
      detail: `failed: ${err.message}`,
    });
  }

  return { status: 'reset_complete', steps };
}
