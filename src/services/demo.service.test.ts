import { describe, it, expect } from 'vitest';

/**
 * The reset endpoint wipes tables in FK-safe order. These tests verify
 * that the expected wipe order is correct by checking the FK dependency
 * graph. Since the actual reset function requires a live DB, we test
 * the invariants of the design rather than executing it.
 *
 * FK rule: you cannot DELETE FROM a parent table while child rows still
 * reference it. So all children of table X must be wiped BEFORE X.
 */

// Tables wiped by resetDemo, in order.
const WIPE_ORDER = [
  'dividend_payments',       // child of: dividend_distributions, users
  'dividend_distributions',  // child of: royalty_statements, artists, cap_table_snapshots
  'cap_table_snapshot_rows', // child of: cap_table_snapshots, users
  'cap_table_snapshots',     // child of: artists
  'royalty_line_items',      // child of: royalty_statements, artists
  'royalty_statements',      // child of: artists, users
  'orders',                  // child of: users, artists
  'investor_positions',      // child of: users, artists
  'daily_trade_tracking',    // child of: users, artists
  'trade_cooldowns',         // child of: users, artists
  'artist_candles',          // child of: artists
  'ledger_entries',          // child of: ledger_accounts
  'share_issuance_events',   // child of: artists, users
  'idempotency_keys',        // (no FKs)
];

// FK graph: child → parent tables it references
const CHILD_TO_PARENTS: Record<string, string[]> = {
  dividend_payments: ['dividend_distributions', 'users'],
  dividend_distributions: ['royalty_statements', 'artists', 'cap_table_snapshots'],
  cap_table_snapshot_rows: ['cap_table_snapshots', 'users'],
  cap_table_snapshots: ['artists'],
  royalty_line_items: ['royalty_statements', 'artists'],
  royalty_statements: ['artists', 'users'],
  orders: ['users', 'artists'],
  investor_positions: ['users', 'artists'],
  daily_trade_tracking: ['users', 'artists'],
  trade_cooldowns: ['users', 'artists'],
  artist_candles: ['artists'],
  ledger_entries: ['ledger_accounts'],
  share_issuance_events: ['artists', 'users'],
  idempotency_keys: [],
};

// Invert to: parent → children that reference it
function buildParentToChildren(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [child, parents] of Object.entries(CHILD_TO_PARENTS)) {
    for (const parent of parents) {
      if (!result[parent]) result[parent] = [];
      result[parent].push(child);
    }
  }
  return result;
}

// Tables preserved by reset (never wiped)
const PRESERVED = [
  'users',
  'artists',
  'risk_controls',
  'artist_metric_snapshots',
  'ledger_accounts',
  'earnings_model_params',
  'stripe_webhook_events',
];

describe('demo reset: FK-safe wipe order', () => {
  it('every wiped table has its child tables wiped before it', () => {
    const parentToChildren = buildParentToChildren();

    for (let i = 0; i < WIPE_ORDER.length; i++) {
      const table = WIPE_ORDER[i];
      const children = parentToChildren[table] ?? [];
      const wipedBefore = new Set(WIPE_ORDER.slice(0, i));

      for (const child of children) {
        // Child must be wiped before this parent, OR not in the wipe list at all
        const childIndex = WIPE_ORDER.indexOf(child);
        if (childIndex === -1) continue; // child not being wiped (maybe preserved)

        expect(
          wipedBefore.has(child),
          `${table} (index ${i}) is a parent of ${child} (index ${childIndex}), ` +
          `but ${child} must be wiped first`,
        ).toBe(true);
      }
    }
  });

  it('covers 14 transactional tables', () => {
    expect(WIPE_ORDER).toHaveLength(14);
  });

  it('does not wipe preserved tables', () => {
    for (const p of PRESERVED) {
      expect(WIPE_ORDER).not.toContain(p);
    }
  });

  it('every wiped table has an FK entry', () => {
    for (const table of WIPE_ORDER) {
      expect(CHILD_TO_PARENTS).toHaveProperty(table);
    }
  });
});

describe('demo reset: preserved tables', () => {
  it('artists table is never wiped', () => {
    expect(WIPE_ORDER).not.toContain('artists');
  });

  it('risk_controls table is never wiped', () => {
    expect(WIPE_ORDER).not.toContain('risk_controls');
  });

  it('artist_metric_snapshots are preserved (needed for traction recompute)', () => {
    expect(WIPE_ORDER).not.toContain('artist_metric_snapshots');
  });

  it('ledger_accounts are preserved (balances reset, not deleted)', () => {
    expect(WIPE_ORDER).not.toContain('ledger_accounts');
  });
});
