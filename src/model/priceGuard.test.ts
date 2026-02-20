import { describe, it, expect } from 'vitest';
import {
  clampDailyReturn,
  shouldCircuitBreakerTrip,
  checkPriceBand,
  DAILY_RETURN_CAP,
  PRICE_BAND_PCT,
} from './priceGuard';

// ── Daily Return Cap ────────────────────────────────────────────────────────

describe('clampDailyReturn', () => {
  it('passes through a move within ±12%', () => {
    const result = clampDailyReturn(1.05, 1.0);
    expect(result.clampedPrice).toBe(1.05);
    expect(result.wasClamped).toBe(false);
    expect(result.rawPctChange).toBeCloseTo(0.05, 4);
  });

  it('clamps an over-cap positive move to +12%', () => {
    // Old price $1.00, new price $1.25 (+25%) → clamped to $1.12
    const result = clampDailyReturn(1.25, 1.0);
    expect(result.clampedPrice).toBe(1.12);
    expect(result.wasClamped).toBe(true);
    expect(result.rawPctChange).toBeCloseTo(0.25, 4);
  });

  it('clamps an over-cap negative move to -12%', () => {
    // Old price $1.00, new price $0.75 (-25%) → clamped to $0.88
    const result = clampDailyReturn(0.75, 1.0);
    expect(result.clampedPrice).toBe(0.88);
    expect(result.wasClamped).toBe(true);
    expect(result.rawPctChange).toBeCloseTo(-0.25, 4);
  });

  it('handles exact +12% boundary as not clamped', () => {
    const result = clampDailyReturn(1.12, 1.0);
    expect(result.clampedPrice).toBe(1.12);
    expect(result.wasClamped).toBe(false);
  });

  it('handles exact -12% boundary as not clamped', () => {
    const result = clampDailyReturn(0.88, 1.0);
    expect(result.clampedPrice).toBe(0.88);
    expect(result.wasClamped).toBe(false);
  });

  it('handles oldPrice = 0 (no clamping)', () => {
    const result = clampDailyReturn(1.5, 0);
    expect(result.clampedPrice).toBe(1.5);
    expect(result.wasClamped).toBe(false);
    expect(result.rawPctChange).toBe(0);
  });

  it('uses custom cap', () => {
    // 5% cap: $1.00 → $1.20 → clamped to $1.05
    const result = clampDailyReturn(1.20, 1.0, 0.05);
    expect(result.clampedPrice).toBe(1.05);
    expect(result.wasClamped).toBe(true);
  });

  it('rounds to 4 decimal places', () => {
    const result = clampDailyReturn(1.111111, 1.0);
    expect(result.clampedPrice).toBe(1.1111);
  });
});

// ── Circuit Breaker Detection ───────────────────────────────────────────────

describe('shouldCircuitBreakerTrip', () => {
  it('does not trip for a move within threshold', () => {
    expect(shouldCircuitBreakerTrip(1.15, 1.0, 0.20)).toBe(false);
  });

  it('trips for a positive move exceeding threshold', () => {
    // +25% > 20% threshold
    expect(shouldCircuitBreakerTrip(1.25, 1.0, 0.20)).toBe(true);
  });

  it('trips for a negative move exceeding threshold', () => {
    // -25% > 20% threshold
    expect(shouldCircuitBreakerTrip(0.75, 1.0, 0.20)).toBe(true);
  });

  it('does not trip at exact threshold boundary', () => {
    expect(shouldCircuitBreakerTrip(1.20, 1.0, 0.20)).toBe(false);
  });

  it('does not trip when oldPrice is 0', () => {
    expect(shouldCircuitBreakerTrip(1.50, 0, 0.20)).toBe(false);
  });

  it('respects custom threshold', () => {
    // 10% threshold: +15% move should trip
    expect(shouldCircuitBreakerTrip(1.15, 1.0, 0.10)).toBe(true);
    // 10% threshold: +5% move should not trip
    expect(shouldCircuitBreakerTrip(1.05, 1.0, 0.10)).toBe(false);
  });
});

// ── Price Band Validation ───────────────────────────────────────────────────

describe('checkPriceBand', () => {
  it('allows a fill within ±8%', () => {
    const result = checkPriceBand(1.05, 1.0);
    expect(result.allowed).toBe(true);
    expect(result.deviation).toBeCloseTo(0.05, 4);
  });

  it('rejects a fill above +8%', () => {
    const result = checkPriceBand(1.10, 1.0);
    expect(result.allowed).toBe(false);
    expect(result.deviation).toBeCloseTo(0.10, 4);
  });

  it('rejects a fill below -8%', () => {
    const result = checkPriceBand(0.90, 1.0);
    expect(result.allowed).toBe(false);
    expect(result.deviation).toBeCloseTo(0.10, 4);
  });

  it('allows exact boundary', () => {
    const result = checkPriceBand(1.08, 1.0);
    expect(result.allowed).toBe(true);
  });

  it('allows when referencePrice is 0', () => {
    const result = checkPriceBand(1.0, 0);
    expect(result.allowed).toBe(true);
  });

  it('uses custom band', () => {
    // 5% band: 10% deviation should be rejected
    const result = checkPriceBand(1.10, 1.0, 0.05);
    expect(result.allowed).toBe(false);
  });

  it('returns correct fill and reference prices', () => {
    const result = checkPriceBand(1.15, 1.0);
    expect(result.fillPrice).toBe(1.15);
    expect(result.referencePrice).toBe(1.0);
  });
});
