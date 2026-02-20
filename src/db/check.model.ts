/**
 * Pure evaluation logic for db:check — no DB dependencies, fully testable.
 */

export const EXPECTED_TABLES = [
  'users',
  'artists',
  'share_issuance_events',
  'ledger_accounts',
  'ledger_entries',
  'investor_positions',
  'orders',
  'traction_index_snapshots',
  'artist_metric_snapshots',
  'royalty_statements',
  'royalty_line_items',
  'cap_table_snapshots',
  'cap_table_snapshot_rows',
  'dividend_distributions',
  'dividend_payments',
  'risk_controls',
  'idempotency_keys',
  'stripe_webhook_events',
  'trade_cooldowns',
  'daily_trade_tracking',
  'artist_candles',
  'earnings_model_params',
] as const;

export const PLATFORM_ACCOUNTS = [
  'platform:cash',
  'platform:spread-revenue',
  'platform:fee-revenue',
] as const;

export interface CheckResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface DbCheckInput {
  existingTables: string[];
  artistCount: number;
  globalRiskControlCount: number;
  platformAccountNames: string[];
}

export function evaluateChecks(input: DbCheckInput): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. Table existence
  const missingTables = EXPECTED_TABLES.filter(
    (t) => !input.existingTables.includes(t),
  );
  results.push({
    name: 'Schema: all 22 tables exist',
    passed: missingTables.length === 0,
    expected: `${EXPECTED_TABLES.length} tables`,
    actual:
      missingTables.length === 0
        ? `${EXPECTED_TABLES.length} tables found`
        : `missing: ${missingTables.join(', ')}`,
  });

  // 2. Artists seeded
  results.push({
    name: 'Seed: >= 3 artists',
    passed: input.artistCount >= 3,
    expected: '>= 3',
    actual: String(input.artistCount),
  });

  // 3. Global risk controls
  results.push({
    name: 'Seed: global risk_controls row',
    passed: input.globalRiskControlCount >= 1,
    expected: '>= 1',
    actual: String(input.globalRiskControlCount),
  });

  // 4. Platform ledger accounts
  const missingAccounts = PLATFORM_ACCOUNTS.filter(
    (a) => !input.platformAccountNames.includes(a),
  );
  results.push({
    name: 'Seed: platform ledger accounts',
    passed: missingAccounts.length === 0,
    expected: PLATFORM_ACCOUNTS.join(', '),
    actual:
      missingAccounts.length === 0
        ? 'all present'
        : `missing: ${missingAccounts.join(', ')}`,
  });

  return results;
}

export function formatReport(results: CheckResult[]): string {
  const lines: string[] = ['', '=== Crescendo DB Check ===', ''];

  const allPassed = results.every((r) => r.passed);

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    lines.push(`  [${icon}] ${r.name}`);
    if (!r.passed) {
      lines.push(`         expected: ${r.expected}`);
      lines.push(`         actual:   ${r.actual}`);
    }
  }

  lines.push('');
  lines.push(
    allPassed
      ? '  Result: ALL CHECKS PASSED'
      : `  Result: ${results.filter((r) => !r.passed).length} CHECK(S) FAILED`,
  );
  lines.push('');

  return lines.join('\n');
}
