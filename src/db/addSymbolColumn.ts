/**
 * One-time migration: add symbol column to artists table.
 * Usage: npx tsx src/db/addSymbolColumn.ts
 */
import { db, client } from './index';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Adding symbol column to artists...');
  await db.execute(sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS symbol VARCHAR(20)`);
  console.log('Column added.');

  console.log('Creating unique index on symbol...');
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS artists_symbol_unique ON artists(symbol) WHERE symbol IS NOT NULL`);
  console.log('Index created.');

  console.log('Done.');
  await client.end();
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
