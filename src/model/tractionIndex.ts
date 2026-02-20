/**
 * Pure Traction Index computation module (v1.1.0).
 * No DB calls, no side effects — takes snapshots in, returns scores out.
 *
 * Model:
 *   Stage score  = weighted percentile-rank of:
 *                  Spotify monthly listeners (40), playlist reach (25),
 *                  Spotify popularity (15), YouTube channel views (10),
 *                  TikTok top views (10)
 *   Followers score = weighted percentile-rank of:
 *                     Spotify followers (60), IG followers (20),
 *                     TikTok followers (20), YouTube subs (20)
 *
 *   base = 0.80 * stageScore + 0.20 * followersScore
 *
 *   modifiers (±MODIFIER_MAX_POINTS each, default ±5 points on 0–100 scale):
 *     - fan conversion (followers / monthly listeners) — high = good
 *     - listener-to-follower ratio (monthly listeners / followers) — high = viral reach
 *
 *   tractionIndex = clamp(base + modifiers, 0, 100)
 *
 * Missing-metrics safe:
 *   - null metrics are SKIPPED per artist (not treated as 0)
 *   - Weights renormalize over present metrics so no-TikTok ≠ penalty
 *   - 0 values ARE scored as genuinely zero (low percentile)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ArtistSnapshot {
  artistId: string;
  spotifyMonthlyListeners: number | null;
  spotifyFollowers: number | null;
  spotifyPopularity: number | null;
  playlistReach: number | null;
  tiktokFollowers: number | null;
  tiktokTopViews: number | null;
  instagramFollowers: number | null;
  youtubeSubscribers: number | null;
  youtubeChannelViews: number | null;
  /** Kept in type for backwards compat / display, but NOT scored */
  shazamTotal: number | null;
  /** Kept in type for backwards compat / display, but NOT scored */
  airplaySpins: number | null;
  fanConversionRate: number | null;
  spotifyListenerToFollowerRatio: number | null;
  metricSnapshotId?: string;
}

export interface TractionDebug {
  artistId: string;
  stageRaw: Record<string, number>;
  stagePercentiles: Record<string, number>;
  stageWeightsUsed: Record<string, number>;
  stageScore: number;
  followersRaw: Record<string, number>;
  followersPercentiles: Record<string, number>;
  followersWeightsUsed: Record<string, number>;
  followersScore: number;
  baseScore: number;
  fanConversionModifier: number;
  listenerFollowerModifier: number;
  finalScore: number;
  cohortSize: number;
}

export interface TractionResult {
  artistId: string;
  tractionIndex: number;
  stageScore: number;
  followersScore: number;
  fanConversionModifier: number;
  listenerFollowerModifier: number;
  debug: TractionDebug;
  metricSnapshotId?: string;
}

// ── Weighted metric definitions ─────────────────────────────────────────────

interface WeightedMetric {
  key: keyof ArtistSnapshot;
  weight: number;
}

const STAGE_METRICS: WeightedMetric[] = [
  { key: 'spotifyMonthlyListeners', weight: 40 },
  { key: 'playlistReach', weight: 25 },
  { key: 'spotifyPopularity', weight: 15 },
  { key: 'youtubeChannelViews', weight: 10 },
  { key: 'tiktokTopViews', weight: 10 },
];

const FOLLOWERS_METRICS: WeightedMetric[] = [
  { key: 'spotifyFollowers', weight: 60 },
  { key: 'instagramFollowers', weight: 20 },
  { key: 'tiktokFollowers', weight: 20 },
  { key: 'youtubeSubscribers', weight: 20 },
];

/** Max modifier points on the 0–100 scale (each modifier can add/subtract this much) */
export const MODIFIER_MAX_POINTS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────

/** log1p transform to compress heavy-tailed distributions */
export function log1pTransform(value: number | null): number {
  if (value === null || value <= 0) return 0;
  return Math.log1p(value);
}

/**
 * Percentile rank of `value` within `allValues` (0–100).
 * Uses midpoint method: % of values strictly below + 0.5 * % of values equal.
 */
export function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  if (allValues.length === 1) return 50;

  let below = 0;
  let equal = 0;
  for (const v of allValues) {
    if (v < value) below++;
    else if (v === value) equal++;
  }

  return ((below + 0.5 * equal) / allValues.length) * 100;
}

/**
 * Compute a weighted composite percentile score across metrics.
 *
 * Missing-metrics safe:
 *   - If snapshot[key] is null → skip that metric for this artist (no penalty)
 *   - If metric has no cohort signal (all zeros) → skip
 *   - Weights renormalize over whichever metrics are present
 *   - If no metrics are usable → returns 50 (neutral)
 */
function weightedCompositePercentile(
  snapshot: ArtistSnapshot,
  metrics: WeightedMetric[],
  cohortTransformed: Map<string, number[]>,
): {
  score: number;
  rawValues: Record<string, number>;
  percentiles: Record<string, number>;
  weightsUsed: Record<string, number>;
} {
  const rawValues: Record<string, number> = {};
  const percentiles: Record<string, number> = {};
  const weightsUsed: Record<string, number> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { key, weight } of metrics) {
    const raw = snapshot[key] as number | null;

    // null = artist doesn't have / we don't track it → SKIP (no penalty)
    if (raw === null || raw === undefined) {
      rawValues[key] = 0;
      percentiles[key] = -1; // sentinel: skipped
      continue;
    }

    // Transform the value (0 stays 0 after log1p, which is correct — it's a real zero)
    const transformed = log1pTransform(raw);
    rawValues[key] = transformed;

    const cohortValues = cohortTransformed.get(key) || [];
    // Skip metric if entire cohort has no signal
    const hasSignal = cohortValues.some((v) => v > 0);
    if (!hasSignal) {
      percentiles[key] = 50; // neutral default
      continue;
    }

    const pct = percentileRank(transformed, cohortValues);
    percentiles[key] = Math.round(pct * 100) / 100;
    weightsUsed[key] = weight;
    weightedSum += weight * pct;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 50;
  return {
    score: Math.round(score * 100) / 100,
    rawValues,
    percentiles,
    weightsUsed,
  };
}

/**
 * Compute fan conversion modifier.
 * Fan conversion = followers / monthly listeners.
 * Higher is better (artist converts listeners to fans).
 * Percentile-ranked across cohort, then mapped to ±MODIFIER_MAX_POINTS range.
 */
function fanConversionMod(
  snapshot: ArtistSnapshot,
  cohortRatios: number[],
): number {
  const listeners = snapshot.spotifyMonthlyListeners ?? 0;
  const followers = snapshot.spotifyFollowers ?? 0;
  if (listeners <= 0 || followers <= 0) return 0;

  const ratio = followers / listeners;
  const pct = percentileRank(ratio, cohortRatios);
  // Map 0-100 percentile to -MAX..+MAX points
  return Math.round(((pct - 50) / 50) * MODIFIER_MAX_POINTS * 100) / 100;
}

/**
 * Compute listener-to-follower ratio modifier.
 * L/F ratio = monthly listeners / followers.
 * Higher means more reach relative to base (viral/playlist-driven).
 * Percentile-ranked, mapped to ±MODIFIER_MAX_POINTS.
 */
function listenerFollowerMod(
  snapshot: ArtistSnapshot,
  cohortRatios: number[],
): number {
  const listeners = snapshot.spotifyMonthlyListeners ?? 0;
  const followers = snapshot.spotifyFollowers ?? 0;
  if (listeners <= 0 || followers <= 0) return 0;

  const ratio = listeners / followers;
  const pct = percentileRank(ratio, cohortRatios);
  return Math.round(((pct - 50) / 50) * MODIFIER_MAX_POINTS * 100) / 100;
}

// ── Main Computation ───────────────────────────────────────────────────────

/**
 * Compute the Traction Index for all artists in the cohort.
 * Pure function: no DB, no side effects.
 *
 * @param snapshots - latest metric snapshot for each artist
 * @returns TractionResult for each artist, sorted by tractionIndex descending
 */
export function computeTractionIndexCohort(snapshots: ArtistSnapshot[]): TractionResult[] {
  if (snapshots.length === 0) return [];

  // All metric keys we score (stage + followers)
  const allMetrics = [...STAGE_METRICS, ...FOLLOWERS_METRICS];

  // Pre-compute log1p-transformed cohort arrays.
  // IMPORTANT: only include non-null values in each metric's cohort array.
  // This way null artists don't drag down the cohort distribution.
  const cohortTransformed = new Map<string, number[]>();

  for (const { key } of allMetrics) {
    const values: number[] = [];
    for (const s of snapshots) {
      const raw = s[key] as number | null;
      if (raw !== null && raw !== undefined) {
        values.push(log1pTransform(raw));
      }
    }
    cohortTransformed.set(key, values);
  }

  // Pre-compute modifier cohort arrays (only from artists with both metrics)
  const fanConvRatios = snapshots
    .map((s) => {
      const l = s.spotifyMonthlyListeners ?? 0;
      const f = s.spotifyFollowers ?? 0;
      return l > 0 && f > 0 ? f / l : 0;
    })
    .filter((r) => r > 0);

  const lfRatios = snapshots
    .map((s) => {
      const l = s.spotifyMonthlyListeners ?? 0;
      const f = s.spotifyFollowers ?? 0;
      return l > 0 && f > 0 ? l / f : 0;
    })
    .filter((r) => r > 0);

  const results: TractionResult[] = [];

  for (const snapshot of snapshots) {
    const stage = weightedCompositePercentile(snapshot, STAGE_METRICS, cohortTransformed);
    const followers = weightedCompositePercentile(snapshot, FOLLOWERS_METRICS, cohortTransformed);

    const baseScore = 0.80 * stage.score + 0.20 * followers.score;
    const fcMod = fanConversionMod(snapshot, fanConvRatios);
    const lfMod = listenerFollowerMod(snapshot, lfRatios);

    const rawFinal = baseScore + fcMod + lfMod;
    const finalScore = Math.round(Math.max(0, Math.min(100, rawFinal)) * 100) / 100;

    const debug: TractionDebug = {
      artistId: snapshot.artistId,
      stageRaw: stage.rawValues,
      stagePercentiles: stage.percentiles,
      stageWeightsUsed: stage.weightsUsed,
      stageScore: stage.score,
      followersRaw: followers.rawValues,
      followersPercentiles: followers.percentiles,
      followersWeightsUsed: followers.weightsUsed,
      followersScore: followers.score,
      baseScore: Math.round(baseScore * 100) / 100,
      fanConversionModifier: fcMod,
      listenerFollowerModifier: lfMod,
      finalScore,
      cohortSize: snapshots.length,
    };

    results.push({
      artistId: snapshot.artistId,
      tractionIndex: finalScore,
      stageScore: stage.score,
      followersScore: followers.score,
      fanConversionModifier: fcMod,
      listenerFollowerModifier: lfMod,
      debug,
      metricSnapshotId: snapshot.metricSnapshotId,
    });
  }

  results.sort((a, b) => b.tractionIndex - a.tractionIndex);
  return results;
}
