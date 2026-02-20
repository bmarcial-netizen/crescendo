import { describe, it, expect } from 'vitest';
import {
  estimateEarningsBand,
  popularityMultiplier,
  fanConversionMultiplier,
  DEFAULT_PARAMS,
  EarningsEstimatorInput,
} from './earningsEstimator';

// ── Popularity Multiplier ───────────────────────────────────────────────────

describe('popularityMultiplier', () => {
  it('returns 1.0 when popularity is null', () => {
    expect(popularityMultiplier(null, 50, 0.3)).toBe(1.0);
  });

  it('returns 1.0 at the midpoint', () => {
    expect(popularityMultiplier(50, 50, 0.3)).toBe(1.0);
  });

  it('returns 1 + maxAdj at popularity=100', () => {
    expect(popularityMultiplier(100, 50, 0.3)).toBe(1.3);
  });

  it('returns < 1 at popularity=0', () => {
    const result = popularityMultiplier(0, 50, 0.3);
    expect(result).toBeLessThan(1.0);
    expect(result).toBeGreaterThan(0);
  });

  it('clamps values outside 0-100', () => {
    const at100 = popularityMultiplier(100, 50, 0.3);
    const over = popularityMultiplier(150, 50, 0.3);
    expect(over).toBe(at100);
  });
});

// ── Fan Conversion Multiplier ───────────────────────────────────────────────

describe('fanConversionMultiplier', () => {
  it('returns 1.0 when rate is null', () => {
    expect(fanConversionMultiplier(null, 0.05, 0.15)).toBe(1.0);
  });

  it('returns approximately 1.0 at the midpoint', () => {
    const result = fanConversionMultiplier(0.05, 0.05, 0.15);
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('returns > 1 when conversion is above midpoint', () => {
    const result = fanConversionMultiplier(0.15, 0.05, 0.15);
    expect(result).toBeGreaterThan(1.0);
  });

  it('returns < 1 when conversion is below midpoint', () => {
    const result = fanConversionMultiplier(0.01, 0.05, 0.15);
    expect(result).toBeLessThan(1.0);
  });

  it('returns 1 - maxAdj when rate is 0', () => {
    expect(fanConversionMultiplier(0, 0.05, 0.15)).toBe(0.85);
  });
});

// ── estimateEarningsBand ────────────────────────────────────────────────────

describe('estimateEarningsBand', () => {
  const baseInput: EarningsEstimatorInput = {
    spotifyMonthlyListeners: 1_000_000,
    spotifyPopularity: null,
    fanConversionRate: null,
    revenueSharePct: 0.10,
    sharesOutstanding: 100_000,
  };

  it('produces low < base < high for streams', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.estimatedMonthlyStreams.low).toBeLessThan(result.estimatedMonthlyStreams.base);
    expect(result.estimatedMonthlyStreams.base).toBeLessThan(result.estimatedMonthlyStreams.high);
  });

  it('produces low < base < high for gross royalty', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.grossMonthlyRoyalty.low).toBeLessThan(result.grossMonthlyRoyalty.base);
    expect(result.grossMonthlyRoyalty.base).toBeLessThan(result.grossMonthlyRoyalty.high);
  });

  it('produces low < base < high for earnings per share', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.earningsPerShare.low).toBeLessThan(result.earningsPerShare.base);
    expect(result.earningsPerShare.base).toBeLessThan(result.earningsPerShare.high);
  });

  it('annualized = monthly × 12', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.annualizedEarningsPerShare.base).toBeCloseTo(
      result.earningsPerShare.base * 12,
      3
    );
  });

  it('returns all zeros when listeners are null', () => {
    const result = estimateEarningsBand({
      ...baseInput,
      spotifyMonthlyListeners: null,
    });
    expect(result.estimatedMonthlyStreams.base).toBe(0);
    expect(result.grossMonthlyRoyalty.base).toBe(0);
    expect(result.earningsPerShare.base).toBe(0);
  });

  it('returns zero EPS when sharesOutstanding is 0', () => {
    const result = estimateEarningsBand({
      ...baseInput,
      sharesOutstanding: 0,
    });
    expect(result.earningsPerShare.base).toBe(0);
    expect(result.earningsPerShare.high).toBe(0);
  });

  it('scales proportionally with revenue share pct', () => {
    const at10 = estimateEarningsBand({ ...baseInput, revenueSharePct: 0.10 });
    const at20 = estimateEarningsBand({ ...baseInput, revenueSharePct: 0.20 });
    expect(at20.artistShareMonthly.base).toBeCloseTo(at10.artistShareMonthly.base * 2, 2);
  });

  it('popularity adjustment increases high-pop estimates', () => {
    const neutral = estimateEarningsBand({ ...baseInput, spotifyPopularity: 50 });
    const highPop = estimateEarningsBand({ ...baseInput, spotifyPopularity: 90 });
    expect(highPop.estimatedMonthlyStreams.base).toBeGreaterThan(
      neutral.estimatedMonthlyStreams.base
    );
  });

  it('fan conversion adjustment increases high-conversion estimates', () => {
    const neutral = estimateEarningsBand({ ...baseInput, fanConversionRate: 0.05 });
    const highConv = estimateEarningsBand({ ...baseInput, fanConversionRate: 0.20 });
    expect(highConv.estimatedMonthlyStreams.base).toBeGreaterThan(
      neutral.estimatedMonthlyStreams.base
    );
  });

  it('always includes a disclaimer', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.disclaimer).toContain('directional estimates');
  });

  it('has modelVersion set', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.modelVersion).toBe('1.0.0');
  });

  it('accepts custom params', () => {
    const customParams = {
      ...DEFAULT_PARAMS,
      streamsPerListenerBase: 10.0, // very high
    };
    const result = estimateEarningsBand(baseInput, customParams);
    const defaultResult = estimateEarningsBand(baseInput);
    expect(result.estimatedMonthlyStreams.base).toBeGreaterThan(
      defaultResult.estimatedMonthlyStreams.base
    );
  });

  it('sanity check: 1M listeners, 10% rev share, 100k shares produces reasonable numbers', () => {
    const result = estimateEarningsBand(baseInput);
    // 1M listeners × 4 streams × $0.0033 = ~$13,200 gross monthly
    expect(result.grossMonthlyRoyalty.base).toBeGreaterThan(10000);
    expect(result.grossMonthlyRoyalty.base).toBeLessThan(20000);
    // Artist share (10%) = ~$1,320
    expect(result.artistShareMonthly.base).toBeGreaterThan(1000);
    expect(result.artistShareMonthly.base).toBeLessThan(2000);
    // EPS = ~$0.0132
    expect(result.earningsPerShare.base).toBeGreaterThan(0.01);
    expect(result.earningsPerShare.base).toBeLessThan(0.02);
  });
});
