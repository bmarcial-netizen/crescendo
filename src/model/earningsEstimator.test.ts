import { describe, it, expect } from 'vitest';
import {
  estimateEarningsBand,
  popularityMultiplier,
  fanConversionMultiplier,
  DEFAULT_PARAMS,
  EarningsEstimatorInput,
} from './earningsEstimator';

// ── Popularity Multiplier (now symmetric) ───────────────────────────────────

describe('popularityMultiplier', () => {
  it('returns 1.0 when popularity is null', () => {
    expect(popularityMultiplier(null, 50, 0.2)).toBe(1.0);
  });

  it('returns 1.0 at the midpoint', () => {
    expect(popularityMultiplier(50, 50, 0.2)).toBe(1.0);
  });

  it('returns 1 + maxAdj at popularity=100', () => {
    expect(popularityMultiplier(100, 50, 0.2)).toBe(1.2);
  });

  it('returns 1 - maxAdj at popularity=0', () => {
    expect(popularityMultiplier(0, 50, 0.2)).toBe(0.8);
  });

  it('is symmetric around midpoint', () => {
    const above = popularityMultiplier(75, 50, 0.2);
    const below = popularityMultiplier(25, 50, 0.2);
    // above should be as far above 1.0 as below is below 1.0
    expect(above - 1.0).toBeCloseTo(1.0 - below, 4);
  });

  it('clamps values outside 0-100', () => {
    const at100 = popularityMultiplier(100, 50, 0.2);
    const over = popularityMultiplier(150, 50, 0.2);
    expect(over).toBe(at100);
  });

  it('works with non-50 midpoint', () => {
    // With midpoint 40, at midpoint should be 1.0
    expect(popularityMultiplier(40, 40, 0.2)).toBe(1.0);
    // At 90 (50 above midpoint) → normalized = (90-40)/50 = 1.0 → 1.2
    expect(popularityMultiplier(90, 40, 0.2)).toBe(1.2);
  });
});

// ── Fan Conversion Multiplier ───────────────────────────────────────────────

describe('fanConversionMultiplier', () => {
  it('returns 1.0 when rate is null', () => {
    expect(fanConversionMultiplier(null, 0.05, 0.12)).toBe(1.0);
  });

  it('returns approximately 1.0 at the midpoint', () => {
    const result = fanConversionMultiplier(0.05, 0.05, 0.12);
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('returns > 1 when conversion is above midpoint', () => {
    const result = fanConversionMultiplier(0.15, 0.05, 0.12);
    expect(result).toBeGreaterThan(1.0);
  });

  it('returns < 1 when conversion is below midpoint', () => {
    const result = fanConversionMultiplier(0.01, 0.05, 0.12);
    expect(result).toBeLessThan(1.0);
  });

  it('returns 1 - maxAdj when rate is 0', () => {
    expect(fanConversionMultiplier(0, 0.05, 0.12)).toBe(0.88);
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

  it('always includes a disclaimer mentioning stream-share', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.disclaimer).toContain('conservative directional estimates');
    expect(result.disclaimer).toContain('stream-share');
  });

  it('has modelVersion 1.1.0', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.modelVersion).toBe('1.1.0');
  });

  it('includes safetyHaircut in adjustments', () => {
    const result = estimateEarningsBand(baseInput);
    expect(result.adjustments.safetyHaircut).toBe(0.85);
  });

  it('safety haircut reduces artist share vs no-haircut scenario', () => {
    const withHaircut = estimateEarningsBand(baseInput);
    const noHaircut = estimateEarningsBand(baseInput, { ...DEFAULT_PARAMS, safetyHaircut: 1.0 });
    expect(withHaircut.artistShareMonthly.base).toBeLessThan(noHaircut.artistShareMonthly.base);
    // Should be exactly 85% of the no-haircut value
    expect(withHaircut.artistShareMonthly.base).toBeCloseTo(
      noHaircut.artistShareMonthly.base * 0.85,
      2
    );
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

  it('sanity check: 1M listeners, 10% rev share, 100k shares (conservative model)', () => {
    const result = estimateEarningsBand(baseInput);
    // 1M listeners × 3.2 streams × $0.0024 = $7,680 gross
    // × 0.85 haircut = $6,528 adjusted gross
    // × 10% rev share = $652.80 artist share
    expect(result.grossMonthlyRoyalty.base).toBeGreaterThan(6000);
    expect(result.grossMonthlyRoyalty.base).toBeLessThan(10000);
    expect(result.artistShareMonthly.base).toBeGreaterThan(500);
    expect(result.artistShareMonthly.base).toBeLessThan(1000);
    // EPS = ~$0.0065
    expect(result.earningsPerShare.base).toBeGreaterThan(0.005);
    expect(result.earningsPerShare.base).toBeLessThan(0.01);
  });

  it('is more conservative than v1.0.0 defaults would have been', () => {
    const v1Params = {
      ...DEFAULT_PARAMS,
      streamsPerListenerBase: 4.0,
      usdPerStreamBase: 0.0033,
      popularityMaxAdjustment: 0.30,
      fanConversionMaxAdjustment: 0.15,
      safetyHaircut: 1.0, // no haircut
    };
    const conservative = estimateEarningsBand(baseInput);
    const v1Style = estimateEarningsBand(baseInput, v1Params);
    expect(conservative.grossMonthlyRoyalty.base).toBeLessThan(v1Style.grossMonthlyRoyalty.base);
  });
});
