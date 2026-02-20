import { describe, it, expect } from 'vitest';
import {
  evaluateChecks,
  formatReport,
  EXPECTED_TABLES,
  PLATFORM_ACCOUNTS,
  DbCheckInput,
} from './check.model';

function fullInput(overrides: Partial<DbCheckInput> = {}): DbCheckInput {
  return {
    existingTables: [...EXPECTED_TABLES],
    artistCount: 3,
    globalRiskControlCount: 1,
    platformAccountNames: [...PLATFORM_ACCOUNTS],
    ...overrides,
  };
}

describe('evaluateChecks', () => {
  it('all pass when everything is present', () => {
    const results = evaluateChecks(fullInput());
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('fails when tables are missing', () => {
    const results = evaluateChecks(
      fullInput({ existingTables: ['users', 'artists'] }),
    );
    const schema = results.find((r) => r.name.includes('22 tables'));
    expect(schema?.passed).toBe(false);
    expect(schema?.actual).toContain('missing');
  });

  it('passes with extra tables beyond the 22', () => {
    const results = evaluateChecks(
      fullInput({ existingTables: [...EXPECTED_TABLES, 'some_extra_table'] }),
    );
    const schema = results.find((r) => r.name.includes('22 tables'));
    expect(schema?.passed).toBe(true);
  });

  it('fails when artist count is 0', () => {
    const results = evaluateChecks(fullInput({ artistCount: 0 }));
    const check = results.find((r) => r.name.includes('artists'));
    expect(check?.passed).toBe(false);
    expect(check?.actual).toBe('0');
  });

  it('fails when artist count is 2 (need >= 3)', () => {
    const results = evaluateChecks(fullInput({ artistCount: 2 }));
    const check = results.find((r) => r.name.includes('artists'));
    expect(check?.passed).toBe(false);
  });

  it('passes when artist count is exactly 3', () => {
    const results = evaluateChecks(fullInput({ artistCount: 3 }));
    const check = results.find((r) => r.name.includes('artists'));
    expect(check?.passed).toBe(true);
  });

  it('passes when artist count exceeds 3', () => {
    const results = evaluateChecks(fullInput({ artistCount: 10 }));
    const check = results.find((r) => r.name.includes('artists'));
    expect(check?.passed).toBe(true);
  });

  it('fails when global risk controls missing', () => {
    const results = evaluateChecks(fullInput({ globalRiskControlCount: 0 }));
    const check = results.find((r) => r.name.includes('risk_controls'));
    expect(check?.passed).toBe(false);
    expect(check?.actual).toBe('0');
  });

  it('passes with multiple global risk control rows', () => {
    const results = evaluateChecks(fullInput({ globalRiskControlCount: 3 }));
    const check = results.find((r) => r.name.includes('risk_controls'));
    expect(check?.passed).toBe(true);
  });

  it('fails when platform accounts are missing', () => {
    const results = evaluateChecks(
      fullInput({ platformAccountNames: ['platform:cash'] }),
    );
    const check = results.find((r) => r.name.includes('platform ledger'));
    expect(check?.passed).toBe(false);
    expect(check?.actual).toContain('platform:spread-revenue');
    expect(check?.actual).toContain('platform:fee-revenue');
  });

  it('fails when all platform accounts are missing', () => {
    const results = evaluateChecks(fullInput({ platformAccountNames: [] }));
    const check = results.find((r) => r.name.includes('platform ledger'));
    expect(check?.passed).toBe(false);
  });

  it('reports multiple failures independently', () => {
    const results = evaluateChecks(
      fullInput({
        existingTables: [],
        artistCount: 0,
        globalRiskControlCount: 0,
        platformAccountNames: [],
      }),
    );
    expect(results.filter((r) => !r.passed)).toHaveLength(4);
  });
});

describe('formatReport', () => {
  it('shows ALL CHECKS PASSED when all pass', () => {
    const results = evaluateChecks(fullInput());
    const report = formatReport(results);
    expect(report).toContain('ALL CHECKS PASSED');
    expect(report).toContain('[PASS]');
    expect(report).not.toContain('[FAIL]');
  });

  it('shows FAILED count when checks fail', () => {
    const results = evaluateChecks(fullInput({ artistCount: 0 }));
    const report = formatReport(results);
    expect(report).toContain('1 CHECK(S) FAILED');
    expect(report).toContain('[FAIL]');
  });

  it('shows expected/actual for failed checks only', () => {
    const results = evaluateChecks(
      fullInput({ artistCount: 0, globalRiskControlCount: 0 }),
    );
    const report = formatReport(results);
    expect(report).toContain('2 CHECK(S) FAILED');
    // Failed checks show expected/actual lines
    expect(report).toContain('expected:');
    expect(report).toContain('actual:');
  });

  it('includes the header line', () => {
    const results = evaluateChecks(fullInput());
    const report = formatReport(results);
    expect(report).toContain('=== Crescendo DB Check ===');
  });
});
