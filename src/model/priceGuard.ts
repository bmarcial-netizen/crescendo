/**
 * Price guard module — pure functions for:
 *   1. Daily return cap: clamp price moves to ±DAILY_RETURN_CAP
 *   2. Circuit breaker detection: flag when raw move exceeds threshold
 *   3. Price band validation: reject trade fills that deviate too far from reference
 *
 * All functions are deterministic. No DB, no side effects.
 */

export const DAILY_RETURN_CAP = 0.12; // ±12%
export const PRICE_BAND_PCT = 0.08;   // ±8%

// ── Daily Return Cap ────────────────────────────────────────────────────────

export interface ClampResult {
  clampedPrice: number;
  wasClamped: boolean;
  rawPctChange: number;
}

/**
 * Clamp a new price so it does not move more than ±cap from the old price.
 * All math is deterministic and uses 4-decimal rounding.
 */
export function clampDailyReturn(
  newPrice: number,
  oldPrice: number,
  cap: number = DAILY_RETURN_CAP,
): ClampResult {
  if (oldPrice <= 0) {
    return { clampedPrice: round4(newPrice), wasClamped: false, rawPctChange: 0 };
  }

  const rawPctChange = (newPrice - oldPrice) / oldPrice;
  const maxPrice = round4(oldPrice * (1 + cap));
  const minPrice = round4(oldPrice * (1 - cap));
  const clamped = round4(Math.max(minPrice, Math.min(maxPrice, newPrice)));

  return {
    clampedPrice: clamped,
    wasClamped: Math.abs(clamped - round4(newPrice)) > 0.00005,
    rawPctChange: Math.round(rawPctChange * 1000000) / 1000000,
  };
}

// ── Circuit Breaker Detection ───────────────────────────────────────────────

/**
 * Determine whether a price move should trip the circuit breaker.
 * Evaluates against the RAW (unclamped) price change so the breaker
 * fires even when the cap would have limited the actual move.
 */
export function shouldCircuitBreakerTrip(
  rawNewPrice: number,
  oldPrice: number,
  threshold: number,
): boolean {
  if (oldPrice <= 0) return false;
  const pctChange = Math.abs((rawNewPrice - oldPrice) / oldPrice);
  return pctChange > threshold;
}

// ── Price Band Validation ───────────────────────────────────────────────────

export interface PriceBandCheck {
  allowed: boolean;
  deviation: number;
  fillPrice: number;
  referencePrice: number;
}

/**
 * Check whether a trade fill price is within the allowed band
 * relative to the reference (locked) price.
 */
export function checkPriceBand(
  fillPrice: number,
  referencePrice: number,
  bandPct: number = PRICE_BAND_PCT,
): PriceBandCheck {
  if (referencePrice <= 0) {
    return { allowed: true, deviation: 0, fillPrice, referencePrice };
  }

  const deviation = Math.round(Math.abs((fillPrice - referencePrice) / referencePrice) * 1000000) / 1000000;

  return {
    allowed: deviation <= bandPct,
    deviation,
    fillPrice,
    referencePrice,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
