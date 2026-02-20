import { db, client } from './index';
import { ledgerAccounts, riskControls } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding platform accounts...');

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
      console.log(`  Created ledger account: ${acct.name}`);
    } else {
      console.log(`  Already exists: ${acct.name}`);
    }
  }

  // Seed global risk controls
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
    console.log('  Created global risk controls');
  } else {
    console.log('  Global risk controls already exist');
  }

  console.log('Seed complete!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
