/**
 * Conservative monthly earnings band estimator.
 *
 * Uses Spotify monthly listeners as a proxy for streams, applies
 * conservative multipliers, and outputs a LOW / BASE / HIGH range
 * that is explicitly labeled as directional (not a guarantee).
 *
 * Model:
 *   estimatedMonthlyStreams = monthlyListeners × streamsPerListener
 *   grossMonthlyRoyalty     = estimatedMonthlyStreams × usdPerStream
 *   artistShareRoyalty      = grossMonthlyRoyalty × revenueSharePct
 *   earningsPerShare        = artistShareRoyalty / sharesOutstanding
 *
 * Adjustments:
 *   - Popularity multiplier: scales streams if spotifyPopularity is known
 *   - Fan conversion multiplier: if fanConversionRate is unusually high/low
 */

// ── Default Model Parameters ────────────────────────────────────────────────

export interface EarningsModelParams {
  streamsPerListenerLow: number;
  streamsPerListenerBase: number;
  streamsPerListenerHigh: number;
  usdPerStreamLow: number;
  usdPerStreamBase: number;
  usdPerStreamHigh: number;
  /** Popularity score (0-100) considered "average" — used as midpoint for multiplier */
  popularityMidpoint: number;
  /** Max adjustment factor from popularity (e.g., 0.3 means ±30%) */
  popularityMaxAdjustment: number;
  /** Fan conversion rate considered "average" */
  fanConversionMidpoint: number;
  /** Max adjustment factor from fan conversion (e.g., 0.15 means ±15%) */
  fanConversionMaxAdjustment: number;
}

export const DEFAULT_PARAMS: EarningsModelParams = {
  // Streams per listener: conservative range
  // Industry avg is ~4-6, we use lower band to be conservative
  streamsPerListenerLow: 2.5,
  streamsPerListenerBase: 4.0,
  streamsPerListenerHigh: 6.0,

  // USD per stream: blended payout rate across distributors
  // Spotify avg ~$0.003-0.005, but varies by market/tier
  usdPerStreamLow: 0.0025,
  usdPerStreamBase: 0.0033,
  usdPerStreamHigh: 0.0042,

  // Popularity midpoint and max adjustment
  popularityMidpoint: 50,
  popularityMaxAdjustment: 0.3,

  // Fan conversion midpoint and max adjustment
  fanConversionMidpoint: 0.05,
  fanConversionMaxAdjustment: 0.15,
};

// ── Input / Output Types ────────────────────────────────────────────────────

export interface EarningsEstimatorInput {
  spotifyMonthlyListeners: number | null;
  spotifyPopularity: number | null;
  fanConversionRate: number | null;
  revenueSharePct: number; // e.g. 0.10 = 10%
  sharesOutstanding: number;
}

export interface EarningsBand {
  low: number;
  base: number;
  high: number;
}

export interface EarningsEstimatorOutput {
  estimatedMonthlyStreams: EarningsBand;
  grossMonthlyRoyalty: EarningsBand;
  artistShareMonthly: EarningsBand;
  earningsPerShare: EarningsBand;
  annualizedEarningsPerShare: EarningsBand;
  impliedYield: EarningsBand | null;
  adjustments: {
    popularityMultiplier: number;
    fanConversionMultiplier: number;
  };
  disclaimer: string;
  modelVersion: string;
}

// ── Pure Computation ────────────────────────────────────────────────────────

/**
 * Compute popularity-based adjustment multiplier.
 * Maps spotifyPopularity (0-100) to a multiplier in [1-maxAdj, 1+maxAdj].
 * Unknown popularity → 1.0 (no adjustment).
 */
export function popularityMultiplier(
  popularity: number | null,
  midpoint: number,
  maxAdjustment: number,
): number {
  if (popularity === null || popularity === undefined) return 1.0;
  const clamped = Math.max(0, Math.min(100, popularity));
  // Linear interpolation: at midpoint → 1.0, at 100 → 1+max, at 0 → 1-max
  const offset = ((clamped - midpoint) / (100 - midpoint)) * maxAdjustment;
  return Math.round((1.0 + offset) * 10000) / 10000;
}

/**
 * Compute fan-conversion-based adjustment multiplier.
 * High conversion (followers/listeners) → artist retains audience better → slight uplift.
 * Unknown → 1.0.
 */
export function fanConversionMultiplier(
  fanConversionRate: number | null,
  midpoint: number,
  maxAdjustment: number,
): number {
  if (fanConversionRate === null || fanConversionRate === undefined) return 1.0;
  if (fanConversionRate <= 0) return 1.0 - maxAdjustment;

  // Log-scale comparison to midpoint to handle wide variance
  const logRatio = Math.log(fanConversionRate / midpoint);
  // Clamp to ±1 range before scaling
  const clamped = Math.max(-1, Math.min(1, logRatio));
  return Math.round((1.0 + clamped * maxAdjustment) * 10000) / 10000;
}

/**
 * Estimate monthly earnings bands for an artist.
 * Pure function — no DB calls.
 */
export function estimateEarningsBand(
  input: EarningsEstimatorInput,
  params: EarningsModelParams = DEFAULT_PARAMS,
): EarningsEstimatorOutput {
  const listeners = input.spotifyMonthlyListeners ?? 0;

  // Compute adjustments
  const popMult = popularityMultiplier(
    input.spotifyPopularity,
    params.popularityMidpoint,
    params.popularityMaxAdjustment,
  );
  const fcMult = fanConversionMultiplier(
    input.fanConversionRate,
    params.fanConversionMidpoint,
    params.fanConversionMaxAdjustment,
  );

  const combinedMult = popMult * fcMult;

  // Estimated monthly streams
  const streamsLow = Math.round(listeners * params.streamsPerListenerLow * combinedMult);
  const streamsBase = Math.round(listeners * params.streamsPerListenerBase * combinedMult);
  const streamsHigh = Math.round(listeners * params.streamsPerListenerHigh * combinedMult);

  // Gross monthly royalty
  const grossLow = round4(streamsLow * params.usdPerStreamLow);
  const grossBase = round4(streamsBase * params.usdPerStreamBase);
  const grossHigh = round4(streamsHigh * params.usdPerStreamHigh);

  // Artist's share
  const revPct = input.revenueSharePct;
  const artistLow = round4(grossLow * revPct);
  const artistBase = round4(grossBase * revPct);
  const artistHigh = round4(grossHigh * revPct);

  // Per-share
  const shares = input.sharesOutstanding;
  const epsLow = shares > 0 ? round6(artistLow / shares) : 0;
  const epsBase = shares > 0 ? round6(artistBase / shares) : 0;
  const epsHigh = shares > 0 ? round6(artistHigh / shares) : 0;

  // Annualized
  const annualLow = round4(epsLow * 12);
  const annualBase = round4(epsBase * 12);
  const annualHigh = round4(epsHigh * 12);

  return {
    estimatedMonthlyStreams: { low: streamsLow, base: streamsBase, high: streamsHigh },
    grossMonthlyRoyalty: { low: grossLow, base: grossBase, high: grossHigh },
    artistShareMonthly: { low: artistLow, base: artistBase, high: artistHigh },
    earningsPerShare: { low: epsLow, base: epsBase, high: epsHigh },
    annualizedEarningsPerShare: { low: annualLow, base: annualBase, high: annualHigh },
    impliedYield: null, // Filled by the route handler which has access to currentPrice
    adjustments: {
      popularityMultiplier: popMult,
      fanConversionMultiplier: fcMult,
    },
    disclaimer:
      'These figures are directional estimates only, not guarantees. ' +
      'Actual royalties depend on distribution deals, streaming tier mix, ' +
      'geographic distribution, and other factors outside this model.',
    modelVersion: '1.0.0',
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function round6(v: number): number {
  return Math.round(v * 1000000) / 1000000;
}
