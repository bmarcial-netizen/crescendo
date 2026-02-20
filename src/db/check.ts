import { db, client } from './index';
import { artists, riskControls, ledgerAccounts } from './schema';
import { eq, sql } from 'drizzle-orm';
import { evaluateChecks, formatReport, EXPECTED_TABLES, PLATFORM_ACCOUNTS } from './check.model';

async function check() {
  console.log('Connecting to database...');

  try {
    // 1. Fetch existing tables from information_schema
    const tableRows = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const existingTables = (tableRows as { table_name: string }[]).map(
      (r) => r.table_name,
    );

    // 2. Count artists
    let artistCount = 0;
    try {
      const artistRows = await db.select().from(artists);
      artistCount = artistRows.length;
    } catch {
      // table may not exist
    }

    // 3. Count global risk controls
    let globalRiskControlCount = 0;
    try {
      const riskRows = await db
        .select()
        .from(riskControls)
        .where(eq(riskControls.isGlobal, true));
      globalRiskControlCount = riskRows.length;
    } catch {
      // table may not exist
    }

    // 4. Check platform ledger accounts
    let platformAccountNames: string[] = [];
    try {
      const accountRows = await db.select().from(ledgerAccounts);
      platformAccountNames = accountRows
        .map((r) => r.name)
        .filter((n) => (PLATFORM_ACCOUNTS as readonly string[]).includes(n));
    } catch {
      // table may not exist
    }

    // Evaluate and print
    const results = evaluateChecks({
      existingTables,
      artistCount,
      globalRiskControlCount,
      platformAccountNames,
    });

    const report = formatReport(results);
    console.log(report);

    const allPassed = results.every((r) => r.passed);
    await client.end();
    process.exit(allPassed ? 0 : 1);
  } catch (err: any) {
    console.error('\n  [FAIL] Database connection failed');
    console.error(`         ${err.message}\n`);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

check();
