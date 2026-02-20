/**
 * Daily Price Series Service — Growth-Based Pricing with Volatility Noise
 *
 * Computes a deterministic daily close price for each artist from their
 * daily metric snapshots, with per-artist seeded noise for realistic
 * volatility. Also generates synthetic intraday points (every 15–30 min).
 *
 * Approach:
 *   1. Fetch ALL metric snapshots sorted by date
 *   2. Compute a base price from first-day popularity (listeners weighted heavily)
 *   3. For each day, compute WEIGHTED GROWTH RATE across metrics
 *   4. Add deterministic noise (seeded by artistId + date) for volatility
 *   5. Clamp daily returns to ±12%
 *   6. Generate OHLC from close series, with realistic wicks from noise
 *   7. Optionally generate intraday synthetic candles (15 min intervals)
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

export interface IntradayPoint {
  t: string;   // ISO datetime string
  p: number;   // price
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

/** Growth amplification factor. */
const GROWTH_AMPLIFICATION = 3.5;

/** Deterministic noise amplitude (fraction of price). ±2.5% daily noise. */
const NOISE_AMPLITUDE = 0.025;

// ── Seeded PRNG ─────────────────────────────────────────────────────────

/** Mulberry32: deterministic PRNG. Same seed → same sequence. */
function seededRng(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a 32-bit integer for use as RNG seed. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Popularity & Base Price ─────────────────────────────────────────────

/**
 * Compute popularity score using a TWO-TIER approach.
 * Tier 1: Spotify monthly listeners (sqrt scale) — dominates to ensure
 *         artists with very different listener counts get different prices.
 * Tier 2: Other social/platform metrics (log scale) — secondary signal.
 */
function computePopularityScore(row: MetricRow): number {
  // Tier 1: listeners on sqrt scale for better spread across magnitudes
  const listeners = numOrNull(row.spotifyMonthlyListeners);
  const listenerScore = listeners && listeners > 0 ? Math.sqrt(listeners) : 0;
  const listenerNorm = listenerScore / 1000; // sqrt(22M)≈4.69, sqrt(6M)≈2.45, sqrt(800K)≈0.89

  // Tier 2: non-listener metrics on log scale
  const otherWeights = METRIC_WEIGHTS.filter(m => m.key !== 'spotifyMonthlyListeners');
  let totalWeight = 0;
  let weightedSum = 0;
  for (const m of otherWeights) {
    const val = numOrNull(row[m.key]);
    if (val !== null && val > 0) {
      weightedSum += m.weight * Math.log1p(val);
      totalWeight += m.weight;
    }
  }
  const otherScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Blend: listeners dominate (55%) for differentiation
  return listenerNorm * 0.55 + otherScore * 0.45;
}

/**
 * Base price from first-day popularity.
 * Approximate mapping:
 *   ESDK (22M listeners): ~$5.20
 *   MCTD (12M listeners): ~$3.90
 *   BBDB (6M listeners):  ~$2.80
 *   JRJR (800K listeners): ~$1.50
 */
function computeInitialBasePrice(firstDayScore: number): number {
  if (firstDayScore <= 0) return 1.0;
  const price = 0.35 * Math.pow(firstDayScore, 1.05);
  return round4(Math.max(0.10, price));
}

/**
 * Weighted average growth rate between two metric rows.
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
 * Generate daily OHLCV candles for an artist.
 * Deterministic: same artistId + data → same output.
 * Includes per-artist seeded noise for realistic volatility.
 */
export async function getDailyCandles(
  artistId: string,
  startDate?: string,
  endDate?: string,
): Promise<DailyCandle[]> {
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

  const baselineScore = computePopularityScore(allRows[0]);
  const basePrice = computeInitialBasePrice(baselineScore);

  // Seed the RNG from artistId for per-artist noise patterns
  const rng = seededRng(hashString(artistId));

  // ── Pass 1: compute "clean" close prices from metric growth ──────────
  const cleanCloses: number[] = [basePrice];
  for (let i = 1; i < allRows.length; i++) {
    const dailyGrowth = computeGrowthRate(allRows[i], allRows[i - 1]);
    const amplifiedReturn = dailyGrowth * GROWTH_AMPLIFICATION;
    let rawClose = cleanCloses[i - 1] * (1 + amplifiedReturn);

    // Clamp
    const maxClose = cleanCloses[i - 1] * 1.12;
    const minClose = cleanCloses[i - 1] * 0.88;
    rawClose = Math.max(minClose, Math.min(maxClose, rawClose));

    cleanCloses.push(round4(Math.max(0.01, rawClose)));
  }

  // ── Pass 2: add noise that mean-reverts to the clean trajectory ──────
  // For each day, add a noise offset. On the LAST day, snap back to clean close.
  const noisyCloses: number[] = [];
  let accNoise = 0; // accumulated noise offset (as fraction of price)

  for (let i = 0; i < cleanCloses.length; i++) {
    const isLastDay = i === cleanCloses.length - 1;

    if (i === 0 || isLastDay) {
      // First and last day: no noise (exact match)
      noisyCloses.push(cleanCloses[i]);
      accNoise = 0;
      continue;
    }

    // Noise term: gaussian-ish from uniform via Box-Muller lite
    const u1 = rng();
    const u2 = rng();
    const gaussish = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);

    // Daily noise: random walk with mean-reversion toward clean trajectory
    const reversion = -accNoise * 0.3; // pull 30% back toward clean line each day
    const dailyNoise = gaussish * NOISE_AMPLITUDE + reversion;
    accNoise += dailyNoise;

    // Clamp accumulated noise to ±8% of price
    accNoise = Math.max(-0.08, Math.min(0.08, accNoise));

    const noisyClose = round4(Math.max(0.01, cleanCloses[i] * (1 + accNoise)));
    noisyCloses.push(noisyClose);
  }

  // ── Pass 3: generate OHLC from noisy closes with realistic wicks ─────
  const allCandles: DailyCandle[] = [];
  for (let i = 0; i < noisyCloses.length; i++) {
    const date = allRows[i].capturedAt.toISOString().slice(0, 10);
    const close = noisyCloses[i];
    const open = i === 0 ? close : noisyCloses[i - 1];

    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const bodyRange = bodyHigh - bodyLow;

    // Wicks: seeded random extension for varied candle shapes
    const wickUp = Math.max(bodyRange * 0.3, close * 0.004) * (0.5 + rng());
    const wickDown = Math.max(bodyRange * 0.3, close * 0.004) * (0.5 + rng());

    allCandles.push({
      t: date,
      o: round4(open),
      h: round4(bodyHigh + wickUp),
      l: round4(Math.max(0.01, bodyLow - wickDown)),
      c: round4(close),
      v: Math.floor(rng() * 5000 + 500), // synthetic volume
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
 * Generate synthetic intraday points (every 15 min) for a single daily candle.
 * Creates a random-walk path from open → close that hits high/low along the way.
 * Fully deterministic via artistId + date seed.
 */
export function generateIntradayPoints(
  artistId: string,
  candle: DailyCandle,
  intervalMinutes: number = 15,
): IntradayPoint[] {
  const steps = Math.floor((16 * 60) / intervalMinutes); // 16 trading hours
  const rng = seededRng(hashString(artistId + candle.t));
  const { o, h, l, c } = candle;
  const points: IntradayPoint[] = [];

  // Generate a random walk path that starts at open and ends at close
  // while touching the high and low at some point
  const rawPath: number[] = [o];
  for (let i = 1; i < steps; i++) {
    const progress = i / (steps - 1); // 0 → 1
    // Interpolate toward close with noise
    const target = o + (c - o) * progress;
    const noise = (rng() - 0.5) * (h - l) * 0.4;
    let price = target + noise;
    // Keep within high/low bounds
    price = Math.max(l, Math.min(h, price));
    rawPath.push(round4(price));
  }
  // Last point is exactly the close
  rawPath[rawPath.length - 1] = c;

  // Inject the high and low at random positions
  const hiIdx = Math.floor(rng() * (steps * 0.6)) + Math.floor(steps * 0.1);
  const loIdx = Math.floor(rng() * (steps * 0.6)) + Math.floor(steps * 0.3);
  if (hiIdx < rawPath.length) rawPath[hiIdx] = h;
  if (loIdx < rawPath.length) rawPath[loIdx] = l;

  // Generate timestamps starting at 09:30 ET
  const baseDate = candle.t; // YYYY-MM-DD
  for (let i = 0; i < rawPath.length; i++) {
    const totalMinutes = 9 * 60 + 30 + i * intervalMinutes;
    const hrs = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const mins = (totalMinutes % 60).toString().padStart(2, '0');
    points.push({
      t: `${baseDate}T${hrs}:${mins}:00`,
      p: rawPath[i],
    });
  }

  return points;
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
  const spreadBps = 500;
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
  returnPct: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  bestDayReturn: number;
  worstDayReturn: number;
  sharpeRatio: number;
  totalDays: number;
}

export function computeFinancialAnalysis(candles: DailyCandle[]): FinancialAnalysis | null {
  if (candles.length < 2) return null;

  const closes = candles.map(c => c.c);
  const n = closes.length;

  const dailyReturns: number[] = [];
  for (let i = 1; i < n; i++) {
    if (closes[i - 1] > 0) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  if (dailyReturns.length === 0) return null;

  const returnPct = round4((closes[n - 1] / closes[0] - 1) * 100);
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVolatility = round4(dailyVol * Math.sqrt(365) * 100);

  let peak = closes[0];
  let maxDrawdown = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    const drawdown = (close - peak) / peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  const bestDayReturn = round4(Math.max(...dailyReturns) * 100);
  const worstDayReturn = round4(Math.min(...dailyReturns) * 100);
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
