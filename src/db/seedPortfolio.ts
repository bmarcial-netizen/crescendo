/**
 * Seed fabricated portfolio data for the demo user.
 *
 * Creates holdings in BBDB, MNIT, ESDK, and PRTX as if the user
 * invested $1,500 exactly one week ago. The cost basis uses the
 * price-from-7-days-ago and unrealised P&L reflects real price change.
 *
 * Usage:  npx tsx src/db/seedPortfolio.ts
 */
import { db, client } from './index';
import {
  users,
  artists,
  ledgerAccounts,
  investorPositions,
  orders,
  ledgerEntries,
} from './schema';
import { eq, and, ne } from 'drizzle-orm';
import { getDailyCandles } from '../services/dailyPrice.service';
import { v4 as uuidv4 } from 'uuid';

// ── Configuration ───────────────────────────────────────────────────────────

const TOTAL_INVESTMENT = 1500; // $1,500 starting balance
const STARTING_WALLET = 1500; // user was given $1,500

// How to split the $1,500 across artists (approximate dollar allocation)
const ALLOCATIONS: { symbol: string; dollarAmount: number }[] = [
  { symbol: 'BBDB', dollarAmount: 450 },  // Beabadoobee  — 30%
  { symbol: 'MNIT', dollarAmount: 350 },  // Men I Trust  — 23%
  { symbol: 'ESDK', dollarAmount: 450 },  // Eso.Xo.Supreme (ESDEEKID) — 30%
  { symbol: 'PRTX', dollarAmount: 250 },  // Paris Texas  — 17%
];

async function main() {
  console.log('=== Seeding fabricated portfolio ===\n');

  // ── 1. Find the user ──────────────────────────────────────────────────
  // Get the most recently created non-admin, non-demo user
  const allUsers = await db
    .select()
    .from(users)
    .where(ne(users.role, 'admin'));

  // Find non-artist, non-demo investor users (real sign-ups)
  const realUsers = allUsers.filter(
    (u) => u.role === 'investor' && !u.email.endsWith('@demo.crescendo.io')
  );

  if (realUsers.length === 0) {
    console.error('No investor user found! Sign up first.');
    await client.end();
    process.exit(1);
  }

  // Use the most recently created real user
  const user = realUsers.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  console.log(`Target user: ${user.email} (${user.id})`);

  // ── 2. Get wallet ─────────────────────────────────────────────────────
  const walletName = `user:${user.id}:wallet`;
  const [wallet] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.name, walletName))
    .limit(1);

  if (!wallet) {
    console.error('Wallet not found for user!');
    await client.end();
    process.exit(1);
  }

  console.log(`Wallet: ${wallet.id} — current balance: $${wallet.balance}`);

  // ── 3. Get platform cash account ──────────────────────────────────────
  const [platformCash] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.name, 'platform:cash'))
    .limit(1);

  if (!platformCash) {
    console.error('platform:cash account not found!');
    await client.end();
    process.exit(1);
  }

  // ── 4. Look up artists and their prices 7 days ago ────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const buyDateStr = sevenDaysAgo.toISOString().slice(0, 10);
  const buyTimestamp = new Date(buyDateStr + 'T14:00:00Z'); // 2 PM UTC

  console.log(`\nSimulated buy date: ${buyDateStr}\n`);

  interface HoldingPlan {
    artist: typeof artistRows[0];
    symbol: string;
    dollarAmount: number;
    priceAtBuy: number;     // price from 7-day-old candle
    currentPrice: number;   // latest candle close
    shares: number;         // floor(dollarAmount / priceAtBuy)
    actualCost: number;     // shares * priceAtBuy
  }
  const artistRows = await db.select().from(artists);
  const holdings: HoldingPlan[] = [];

  for (const alloc of ALLOCATIONS) {
    const artist = artistRows.find((a) => a.symbol === alloc.symbol);
    if (!artist) {
      console.error(`Artist ${alloc.symbol} not found!`);
      continue;
    }

    const candles = await getDailyCandles(artist.id);
    if (candles.length < 2) {
      console.error(`Not enough candle data for ${alloc.symbol}`);
      continue;
    }

    // Find the candle closest to 7 days ago
    const targetDate = buyDateStr;
    let buyCandle = candles[0];
    for (const c of candles) {
      if (c.t <= targetDate) buyCandle = c;
    }
    const currentCandle = candles[candles.length - 1];

    // Use the ask price (buy at ask = close + half spread)
    const spreadBps = 500;
    const halfSpread = buyCandle.c * (spreadBps / 10000 / 2);
    const priceAtBuy = Math.round((buyCandle.c + halfSpread) * 10000) / 10000;
    const currentPrice = currentCandle.c;

    const shares = Math.floor(alloc.dollarAmount / priceAtBuy);
    const actualCost = Math.round(shares * priceAtBuy * 10000) / 10000;

    holdings.push({
      artist,
      symbol: alloc.symbol,
      dollarAmount: alloc.dollarAmount,
      priceAtBuy,
      currentPrice,
      shares,
      actualCost,
    });

    const pnl = shares * (currentPrice - priceAtBuy);
    const pnlPct = ((currentPrice - priceAtBuy) / priceAtBuy) * 100;
    console.log(
      `${alloc.symbol}: ${shares} shares @ $${priceAtBuy.toFixed(4)} = $${actualCost.toFixed(2)}  |  now $${currentPrice.toFixed(4)}  |  P&L: $${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`
    );
  }

  const totalSpent = holdings.reduce((s, h) => s + h.actualCost, 0);
  const remainingCash = Math.round((STARTING_WALLET - totalSpent) * 10000) / 10000;
  console.log(`\nTotal invested: $${totalSpent.toFixed(2)}`);
  console.log(`Remaining cash: $${remainingCash.toFixed(4)}`);

  // ── 5. Clear existing positions & orders for this user ─────────────────
  console.log('\nClearing existing positions & orders for this user...');
  await db.delete(orders).where(eq(orders.userId, user.id));
  await db.delete(investorPositions).where(eq(investorPositions.userId, user.id));
  // Clear existing ledger entries for this wallet
  await db.delete(ledgerEntries).where(eq(ledgerEntries.accountId, wallet.id));

  // ── 6. Set wallet balance to remaining cash ────────────────────────────
  // Directly set the balance (we're fabricating data, so skip double-entry for the deposit)
  await db
    .update(ledgerAccounts)
    .set({ balance: remainingCash.toFixed(4) })
    .where(eq(ledgerAccounts.id, wallet.id));
  console.log(`Wallet balance set to: $${remainingCash.toFixed(4)}`);

  // ── 7. Insert positions and orders ─────────────────────────────────────
  for (const h of holdings) {
    // Insert investor position
    await db.insert(investorPositions).values({
      userId: user.id,
      artistId: h.artist.id,
      sharesHeld: h.shares,
      avgCostBasis: h.priceAtBuy.toFixed(4),
      createdAt: buyTimestamp,
      updatedAt: buyTimestamp,
    });

    // Insert a fake filled order
    const txnId = uuidv4();
    await db.insert(orders).values({
      userId: user.id,
      artistId: h.artist.id,
      side: 'buy',
      quantity: h.shares,
      pricePerShare: h.priceAtBuy.toFixed(4),
      totalAmount: h.actualCost.toFixed(4),
      spreadAmount: '0',
      status: 'filled',
      ledgerTransactionId: txnId,
      createdAt: buyTimestamp,
    });

    console.log(`  Created position: ${h.shares} shares of ${h.symbol} @ $${h.priceAtBuy.toFixed(4)}`);
  }

  // ── 8. Summary ─────────────────────────────────────────────────────────
  const totalMarketValue = holdings.reduce(
    (s, h) => s + h.shares * h.currentPrice,
    0
  );
  const totalPnL = totalMarketValue - totalSpent;
  const totalReturn = (totalPnL / totalSpent) * 100;

  console.log('\n=== Portfolio Summary ===');
  console.log(`Holdings value:  $${totalMarketValue.toFixed(2)}`);
  console.log(`Total cost:      $${totalSpent.toFixed(2)}`);
  console.log(`Unrealised P&L:  $${totalPnL.toFixed(2)} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%)`);
  console.log(`Cash balance:    $${remainingCash.toFixed(2)}`);
  console.log(`Total account:   $${(totalMarketValue + remainingCash).toFixed(2)}`);

  console.log('\nDone!');
  await client.end();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await client.end();
  process.exit(1);
});
