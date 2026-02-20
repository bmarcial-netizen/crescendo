/**
 * Pure Traction Index computation module.
 * No DB calls, no side effects — takes snapshots in, returns scores out.
 *
 * Model:
 *   Stage score  = percentile-rank of (Spotify monthly listeners, playlist reach,
 *                  TikTok top views, Shazam, YouTube channel views, airplay spins)
 *   Followers score = percentile-rank of (Spotify followers, IG followers,
 *                     TikTok followers, YouTube subs)
 *   base = 0.80 * stage + 0.20 * followers
 *   modifiers (±0.05 max each):
 *     - fan conversion (followers / monthly listeners) — high = good
 *     - listener-to-follower ratio (monthly listeners / followers) — high = viral reach
 *   tractionIndex = clamp(base + modifiers, 0, 100)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ArtistSnapshot {
  artistId: string;
  spotifyMonthlyListeners: number | null;
  spotifyFollowers: number | null;
  playlistReach: number | null;
  tiktokFollowers: number | null;
  tiktokTopViews: number | null;
  instagramFollowers: number | null;
  youtubeSubscribers: number | null;
  youtubeChannelViews: number | null;
  shazamTotal: number | null;
  airplaySpins: number | null;
  fanConversionRate: number | null;
  spotifyListenerToFollowerRatio: number | null;
  metricSnapshotId?: string;
}

export interface TractionDebug {
  artistId: string;
  stageRaw: Record<string, number>;
  stagePercentiles: Record<string, number>;
  stageScore: number;
  followersRaw: Record<string, number>;
  followersPercentiles: Record<string, number>;
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

// ── Stage & Followers metric keys ──────────────────────────────────────────

const STAGE_KEYS: (keyof ArtistSnapshot)[] = [
  'spotifyMonthlyListeners',
  'playlistReach',
  'tiktokTopViews',
  'shazamTotal',
  'youtubeChannelViews',
  'airplaySpins',
];

const FOLLOWERS_KEYS: (keyof ArtistSnapshot)[] = [
  'spotifyFollowers',
  'instagramFollowers',
  'tiktokFollowers',
  'youtubeSubscribers',
];

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
 * Compute the average percentile score across a set of metric keys.
 * Metrics with all-zero cohort values are skipped (no signal).
 */
function compositePercentile(
  snapshot: ArtistSnapshot,
  keys: (keyof ArtistSnapshot)[],
  cohortTransformed: Map<string, number[]>,
): { score: number; rawValues: Record<string, number>; percentiles: Record<string, number> } {
  const rawValues: Record<string, number> = {};
  const percentiles: Record<string, number> = {};
  let sum = 0;
  let count = 0;

  for (const key of keys) {
    const raw = snapshot[key] as number | null;
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
    sum += pct;
    count++;
  }

  const score = count > 0 ? sum / count : 50;
  return { score: Math.round(score * 100) / 100, rawValues, percentiles };
}

/**
 * Compute fan conversion modifier.
 * Fan conversion = followers / monthly listeners.
 * Higher is better (artist converts listeners to fans).
 * Percentile-ranked across cohort, then mapped to ±0.05 range.
 */
function fanConversionModifier(
  snapshot: ArtistSnapshot,
  cohortRatios: number[],
): number {
  const listeners = snapshot.spotifyMonthlyListeners ?? 0;
  const followers = snapshot.spotifyFollowers ?? 0;
  if (listeners <= 0 || followers <= 0) return 0;

  const ratio = followers / listeners;
  const pct = percentileRank(ratio, cohortRatios);
  // Map 0-100 percentile to -0.05..+0.05
  return Math.round(((pct - 50) / 50) * 5 * 100) / 100;
}

/**
 * Compute listener-to-follower ratio modifier.
 * L/F ratio = monthly listeners / followers.
 * Higher means more reach relative to base (viral/playlist-driven).
 * Percentile-ranked, mapped to ±0.05.
 */
function listenerFollowerModifier(
  snapshot: ArtistSnapshot,
  cohortRatios: number[],
): number {
  const listeners = snapshot.spotifyMonthlyListeners ?? 0;
  const followers = snapshot.spotifyFollowers ?? 0;
  if (listeners <= 0 || followers <= 0) return 0;

  const ratio = listeners / followers;
  const pct = percentileRank(ratio, cohortRatios);
  return Math.round(((pct - 50) / 50) * 5 * 100) / 100;
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

  // Pre-compute log1p-transformed values for the entire cohort
  const cohortTransformed = new Map<string, number[]>();
  const allKeys = [...STAGE_KEYS, ...FOLLOWERS_KEYS];

  for (const key of allKeys) {
    cohortTransformed.set(
      key,
      snapshots.map((s) => log1pTransform(s[key] as number | null))
    );
  }

  // Pre-compute modifier cohort arrays
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
    const stage = compositePercentile(snapshot, STAGE_KEYS, cohortTransformed);
    const followers = compositePercentile(snapshot, FOLLOWERS_KEYS, cohortTransformed);

    const baseScore = 0.80 * stage.score + 0.20 * followers.score;
    const fcMod = fanConversionModifier(snapshot, fanConvRatios);
    const lfMod = listenerFollowerModifier(snapshot, lfRatios);

    const rawFinal = baseScore + fcMod + lfMod;
    const finalScore = Math.round(Math.max(0, Math.min(100, rawFinal)) * 100) / 100;

    const debug: TractionDebug = {
      artistId: snapshot.artistId,
      stageRaw: stage.rawValues,
      stagePercentiles: stage.percentiles,
      stageScore: stage.score,
      followersRaw: followers.rawValues,
      followersPercentiles: followers.percentiles,
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
