import { db, client } from './index';
import {
  users,
  artists,
  ledgerAccounts,
  riskControls,
  artistMetricSnapshots,
} from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('=== Crescendo Seed ===\n');

  // ── 1. Platform ledger accounts ──────────────────────────────────────────
  console.log('1. Platform ledger accounts');

  const platformAccounts = [
    { name: 'platform:cash', accountType: 'asset' as const },
    { name: 'platform:spread-revenue', accountType: 'revenue' as const },
    { name: 'platform:fee-revenue', accountType: 'revenue' as const },
  ];

  for (const acct of platformAccounts) {
    const existing = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, acct.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(ledgerAccounts).values(acct);
      console.log(`   Created: ${acct.name}`);
    } else {
      console.log(`   Exists:  ${acct.name}`);
    }
  }

  // ── 2. Global risk controls ──────────────────────────────────────────────
  console.log('\n2. Global risk controls');

  const existingGlobal = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.isGlobal, true))
    .limit(1);

  if (existingGlobal.length === 0) {
    await db.insert(riskControls).values({
      isGlobal: true,
      maxPositionShares: 10000,
      maxPositionPct: '0.10',
      dailyTradeCapShares: 5000,
      dailyTradeCapUsd: '50000',
      cooldownMinutes: 0,
      circuitBreakerThresholdPct: '0.20',
      spreadBps: 500,
    });
    console.log('   Created global risk controls');
  } else {
    console.log('   Global risk controls already exist');
  }

  // ── 3. Real artists are seeded via seedChartmetric.ts ────────────────────
  // Fake demo artists (Luna Vega, Marco Beats, Sable Noir) have been removed.
  // Run `npx tsx src/db/seedChartmetric.ts` to seed real artist data.
  console.log('\n3. Skipping demo artists (use seedChartmetric.ts for real artists)');

  // ── 4. Initial traction index run ────────────────────────────────────────
  console.log('\n4. Initial traction index run');

  try {
    const { runTractionIndexForAll } = await import('../services/tractionIndex.service');
    const result = await runTractionIndexForAll();
    console.log(`   Computed ${result.computed} / ${result.cohortSize} artists`);
    for (const r of result.results) {
      console.log(`   ${r.artistId}: traction=${r.tractionIndex}, price=$${r.newPrice.toFixed(4)}, bid=$${r.bid.toFixed(4)}, ask=$${r.ask.toFixed(4)}`);
    }
  } catch (err: any) {
    console.error('   Traction index run failed:', err.message);
    console.log('   (Prices will use defaults until traction index is run)');
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\nSeed complete!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
