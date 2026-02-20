/**
 * Pure OHLCV candle computation.
 * No DB, no side effects.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

// ── Interval Bucketing ──────────────────────────────────────────────────────

/**
 * Truncate a timestamp to the start of its interval bucket.
 * Supported intervals: '1h' (hourly), '1d' (daily).
 */
export function getIntervalStart(time: Date, interval: string): Date {
  const d = new Date(time);
  if (interval === '1d') {
    d.setUTCHours(0, 0, 0, 0);
  } else {
    // Default: 1h
    d.setUTCMinutes(0, 0, 0);
  }
  return d;
}

// ── Candle Operations ───────────────────────────────────────────────────────

/**
 * Initialize a new candle from the first trade in an interval.
 */
export function initCandle(price: number, quantity: number): CandleData {
  return {
    open: price,
    high: price,
    low: price,
    close: price,
    volume: quantity,
    tradeCount: 1,
  };
}

/**
 * Update an existing candle with a new trade.
 * Open stays as-is (first trade), close becomes the latest trade,
 * high/low are updated to extrema, volume accumulates.
 */
export function updateCandle(
  existing: CandleData,
  price: number,
  quantity: number,
): CandleData {
  return {
    open: existing.open,
    high: Math.max(existing.high, price),
    low: Math.min(existing.low, price),
    close: price,
    volume: existing.volume + quantity,
    tradeCount: existing.tradeCount + 1,
  };
}
