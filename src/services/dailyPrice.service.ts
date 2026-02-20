/**
 * Daily Price Series Service — Growth-Based Pricing
 *
 * Computes a deterministic daily close price for each artist from their
 * daily metric snapshots. NO randomness, NO dependency on trade state.
 *
 * Approach:
 *   1. For each artist, fetch ALL metric snapshots sorted by date
 *   2. Compute an initial base price from first-day popularity (so bigger artists start higher)
 *   3. For each subsequent day, compute the WEIGHTED GROWTH RATE across all metrics
 *   4. Apply an amplification factor so realistic ~5% monthly growth → visible price movement
 *   5. Clamp daily returns to ±12% to avoid wild swings
 *   6. Generate OHLC deterministically from close series
 *
 * Key principle: "the stock goes up on growth regardless of numbers, more on percentages"
 */

import { db } from '../db';
import { artists, artistMetricSnapshots } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DailyCandle {
  t: string;   // ISO date string YYYY-MM-DD
  o: number;   // open
  h: number;   // high
  l: number;   // low
  c: number;   // close
  v: number;   // volume (0 for metric-derived)
}

export interface MarketSummary {
  symbol: string;
  lastPrice: number;
  prevClose: number;
  pctChange: number;
  bid: number;
  ask: number;
  spreadBps: number;
  tradingStatus: 'open' | 'halted';
  circuitBreakerActive: boolean;
  asOfDate: string;
}

// ── Metric row from DB ──────────────────────────────────────────────────

interface MetricRow {
  capturedAt: Date;
  spotifyMonthlyListeners: string | null;
  spotifyFollowers: string | null;
  playlistReach: string | null;
  tiktokFollowers: string | null;
  instagramFollowers: string | null;
  youtubeSubscribers: string | null;
  youtubeChannelViews: string | null;
}

// ── Metric weights for growth computation ───────────────────────────────

const METRIC_WEIGHTS = [
  { key: 'spotifyMonthlyListeners' as const, weight: 35 },
  { key: 'spotifyFollowers' as const,        weight: 15 },
  { key: 'playlistReach' as const,           weight: 20 },
  { key: 'instagramFollowers' as const,      weight: 10 },
  { key: 'tiktokFollowers' as const,         weight: 5 },
  { key: 'youtubeSubscribers' as const,      weight: 5 },
  { key: 'youtubeChannelViews' as const,     weight: 10 },
];

/**
 * Growth amplification factor.
 * Real-world monthly growth of ~5% across metrics → ~15-25% price movement.
 * This makes charts visually interesting and realistic for a stock-like platform.
 */
const GROWTH_AMPLIFICATION = 3.5;

/**
 * Compute a popularity score from a metric snapshot (log-scale).
 * Used ONLY for setting the initial base price so bigger artists start higher.
 */
function computePopularityScore(row: MetricRow): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const m of METRIC_WEIGHTS) {
    const val = numOrNull(row[m.key]);
    if (val !== null && val > 0) {
      weightedSum += m.weight * Math.log1p(val);
      totalWeight += m.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Compute the initial base price for an artist based on their first metric snapshot.
 * More popular artists = higher price.
 *
 * Approximate mapping:
 *   log1p(22M) ≈ 16.9 → ~$4.50  (ESDK)
 *   log1p(12M) ≈ 16.3 → ~$3.80  (MCTD)
 *   log1p(6M)  ≈ 15.6 → ~$3.00  (BBDB)
 *   log1p(800K) ≈ 13.6 → ~$1.60 (JRJR)
 */
function computeInitialBasePrice(firstDayScore: number): number {
  if (firstDayScore <= 0) return 1.0;
  const price = 0.15 * Math.pow(firstDayScore, 1.2);
  return round4(Math.max(0.10, price));
}

/**
 * Compute the weighted average growth rate between two metric rows.
 * Returns a fractional growth rate (e.g., 0.005 = +0.5%).
 * Metrics that are NULL in either row are excluded.
 */
function computeGrowthRate(current: MetricRow, previous: MetricRow): number {
  let totalWeight = 0;
  let weightedGrowth = 0;

  for (const m of METRIC_WEIGHTS) {
    const curr = numOrNull(current[m.key]);
    const prev = numOrNull(previous[m.key]);
    if (curr !== null && prev !== null && prev > 0) {
      const growth = (curr - prev) / prev;
      weightedGrowth += m.weight * growth;
      totalWeight += m.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return weightedGrowth / totalWeight;
}

// ── Main Functions ─────────────────────────────────────────────────────────

/**
 * Generate daily OHLCV candles for an artist within a date range.
 * 100% deterministic — same inputs always produce same outputs.
 *
 * Pricing model:
 *   - Base price from first-day popularity (differentiation)
 *   - Daily price driven by GROWTH RATES of metrics (percentage-based)
 *   - Amplified to produce meaningful stock-like price movement
 *   - Clamped to ±12% per day
 */
export async function getDailyCandles(
  artistId: string,
  startDate?: string,
  endDate?: string,
): Promise<DailyCandle[]> {
  // ALWAYS fetch ALL metric snapshots for this artist to compute correct prices.
  // We need the full history to get the right base price and cumulative growth.
  // We'll filter the OUTPUT candles by date range after computation.
  const allRows = await db
    .select({
      capturedAt: artistMetricSnapshots.capturedAt,
      spotifyMonthlyListeners: artistMetricSnapshots.spotifyMonthlyListeners,
      spotifyFollowers: artistMetricSnapshots.spotifyFollowers,
      playlistReach: artistMetricSnapshots.playlistReach,
      tiktokFollowers: artistMetricSnapshots.tiktokFollowers,
      instagramFollowers: artistMetricSnapshots.instagramFollowers,
      youtubeSubscribers: artistMetricSnapshots.youtubeSubscribers,
      youtubeChannelViews: artistMetricSnapshots.youtubeChannelViews,
    })
    .from(artistMetricSnapshots)
    .where(eq(artistMetricSnapshots.artistId, artistId))
    .orderBy(asc(artistMetricSnapshots.capturedAt))
    .limit(365);

  if (allRows.length === 0) return [];

  // Compute initial base price from first day popularity
  const baselineScore = computePopularityScore(allRows[0]);
  const basePrice = computeInitialBasePrice(baselineScore);

  // Generate close prices using day-over-day growth rates
  const closes: { date: string; close: number }[] = [];
  let prevClose = basePrice;

  for (let i = 0; i < allRows.length; i++) {
    const date = allRows[i].capturedAt.toISOString().slice(0, 10);

    if (i === 0) {
      closes.push({ date, close: basePrice });
      prevClose = basePrice;
      continue;
    }

    // Compute day-over-day growth rate across all metrics
    const dailyGrowth = computeGrowthRate(allRows[i], allRows[i - 1]);

    // Amplify the growth to make price movements meaningful
    const amplifiedReturn = dailyGrowth * GROWTH_AMPLIFICATION;

    // Compute raw close from previous close + amplified growth
    let rawClose = round4(prevClose * (1 + amplifiedReturn));

    // Clamp daily return to ±12%
    const maxClose = round4(prevClose * 1.12);
    const minClose = round4(prevClose * 0.88);
    rawClose = Math.max(minClose, Math.min(maxClose, rawClose));

    const close = round4(Math.max(0.01, rawClose));
    closes.push({ date, close });
    prevClose = close;
  }

  // Generate OHLC deterministically from close series
  const allCandles: DailyCandle[] = [];
  for (let i = 0; i < closes.length; i++) {
    const { date, close } = closes[i];
    const open = i === 0 ? close : closes[i - 1].close;

    // High/Low: deterministic spread based on open-close range
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const bodyRange = bodyHigh - bodyLow;

    // Wick extends by 30% of body range (minimum 0.4% of price)
    const wickExtension = Math.max(bodyRange * 0.3, close * 0.004);

    allCandles.push({
      t: date,
      o: round4(open),
      h: round4(bodyHigh + wickExtension),
      l: round4(Math.max(0.01, bodyLow - wickExtension)),
      c: round4(close),
      v: 0,
    });
  }

  // Filter by date range if specified
  if (startDate || endDate) {
    return allCandles.filter(c => {
      if (startDate && c.t < startDate) return false;
      if (endDate && c.t > endDate) return false;
      return true;
    });
  }

  return allCandles;
}

/**
 * Get market summary for an artist.
 */
export async function getMarketSummary(artistId: string): Promise<MarketSummary | null> {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  if (!artist) return null;

  // Get ALL candles (no date filter) for accurate pricing
  const candles = await getDailyCandles(artistId);

  let lastPrice = parseFloat(artist.currentPrice);
  let prevClose = lastPrice;
  let asOfDate = new Date().toISOString().slice(0, 10);

  if (candles.length >= 2) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    lastPrice = last.c;
    prevClose = prev.c;
    asOfDate = last.t;
  } else if (candles.length === 1) {
    lastPrice = candles[0].c;
    asOfDate = candles[0].t;
  }

  const pctChange = prevClose > 0 ? round4((lastPrice - prevClose) / prevClose * 100) : 0;
  const spreadBps = 500; // 5% default spread
  const halfSpread = lastPrice * (spreadBps / 10000 / 2);

  return {
    symbol: artist.symbol || '',
    lastPrice,
    prevClose,
    pctChange,
    bid: round4(lastPrice - halfSpread),
    ask: round4(lastPrice + halfSpread),
    spreadBps,
    tradingStatus: artist.circuitBreakerStatus === 'tripped' ? 'halted' : 'open',
    circuitBreakerActive: artist.circuitBreakerStatus === 'tripped',
    asOfDate,
  };
}

/**
 * Compute financial analysis from candle series.
 */
export interface FinancialAnalysis {
  returnPct: number;        // Total return over period
  annualizedVolatility: number; // Annualized volatility
  maxDrawdown: number;      // Max drawdown as negative pct
  bestDayReturn: number;    // Best single day return pct
  worstDayReturn: number;   // Worst single day return pct
  sharpeRatio: number;      // Simplified Sharpe (0% risk-free)
  totalDays: number;
}

export function computeFinancialAnalysis(candles: DailyCandle[]): FinancialAnalysis | null {
  if (candles.length < 2) return null;

  const closes = candles.map(c => c.c);
  const n = closes.length;

  // Daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < n; i++) {
    if (closes[i - 1] > 0) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  if (dailyReturns.length === 0) return null;

  // Total return
  const returnPct = round4((closes[n - 1] / closes[0] - 1) * 100);

  // Volatility (annualized)
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVolatility = round4(dailyVol * Math.sqrt(365) * 100);

  // Max drawdown
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    const drawdown = (close - peak) / peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  // Best/worst day
  const bestDayReturn = round4(Math.max(...dailyReturns) * 100);
  const worstDayReturn = round4(Math.min(...dailyReturns) * 100);

  // Sharpe ratio (simplified, 0% risk-free rate)
  const sharpeRatio = dailyVol > 0 ? round4((mean / dailyVol) * Math.sqrt(365)) : 0;

  return {
    returnPct,
    annualizedVolatility,
    maxDrawdown: round4(maxDrawdown * 100),
    bestDayReturn,
    worstDayReturn,
    sharpeRatio,
    totalDays: n,
  };
}

/**
 * Recompute and update artist base prices based on their actual metrics.
 * Called after seed to set proper base prices and reset circuit breakers.
 */
export async function recomputeArtistBasePrices(): Promise<void> {
  const allArtists = await db.select().from(artists);

  for (const artist of allArtists) {
    const candles = await getDailyCandles(artist.id);
    if (candles.length === 0) continue;

    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];

    const spreadBps = 500;
    const halfSpread = lastCandle.c * (spreadBps / 10000 / 2);

    await db
      .update(artists)
      .set({
        basePrice: firstCandle.c.toString(),
        currentPrice: lastCandle.c.toString(),
        currentBid: round4(lastCandle.c - halfSpread).toString(),
        currentAsk: round4(lastCandle.c + halfSpread).toString(),
        // Reset circuit breaker since we're recomputing from scratch
        circuitBreakerStatus: 'closed',
        circuitBreakerTrippedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function numOrNull(v: string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
