import { describe, it, expect } from 'vitest';
import {
  computeTractionIndexCohort,
  log1pTransform,
  percentileRank,
  ArtistSnapshot,
} from './tractionIndex';

// ── Helper to build snapshots ──────────────────────────────────────────────

function makeSnapshot(overrides: Partial<ArtistSnapshot> & { artistId: string }): ArtistSnapshot {
  return {
    spotifyMonthlyListeners: null,
    spotifyFollowers: null,
    playlistReach: null,
    tiktokFollowers: null,
    tiktokTopViews: null,
    instagramFollowers: null,
    youtubeSubscribers: null,
    youtubeChannelViews: null,
    shazamTotal: null,
    airplaySpins: null,
    fanConversionRate: null,
    spotifyListenerToFollowerRatio: null,
    ...overrides,
  };
}

// ── log1pTransform ─────────────────────────────────────────────────────────

describe('log1pTransform', () => {
  it('returns 0 for null', () => {
    expect(log1pTransform(null)).toBe(0);
  });

  it('returns 0 for 0', () => {
    expect(log1pTransform(0)).toBe(0);
  });

  it('returns 0 for negative values', () => {
    expect(log1pTransform(-100)).toBe(0);
  });

  it('compresses large values', () => {
    const small = log1pTransform(1000);
    const large = log1pTransform(1000000);
    // 1M is 1000x bigger but log1p is only ~2x bigger
    expect(large / small).toBeLessThan(3);
    expect(large / small).toBeGreaterThan(1);
  });
});

// ── percentileRank ─────────────────────────────────────────────────────────

describe('percentileRank', () => {
  it('returns 50 for empty array', () => {
    expect(percentileRank(10, [])).toBe(50);
  });

  it('returns 50 for single-element array', () => {
    expect(percentileRank(10, [10])).toBe(50);
  });

  it('returns correct percentile for sorted values', () => {
    const values = [10, 20, 30, 40, 50];
    // 10 is the lowest: 0 below + 0.5*1 equal = 0.5/5 = 10%
    expect(percentileRank(10, values)).toBe(10);
    // 50 is the highest: 4 below + 0.5*1 equal = 4.5/5 = 90%
    expect(percentileRank(50, values)).toBe(90);
    // 30 is the median: 2 below + 0.5*1 equal = 2.5/5 = 50%
    expect(percentileRank(30, values)).toBe(50);
  });
});

// ── computeTractionIndexCohort ─────────────────────────────────────────────

describe('computeTractionIndexCohort', () => {
  it('returns empty array for empty input', () => {
    expect(computeTractionIndexCohort([])).toEqual([]);
  });

  it('returns 50 for a single artist with all nulls', () => {
    const results = computeTractionIndexCohort([
      makeSnapshot({ artistId: 'a1' }),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].tractionIndex).toBe(50);
  });

  it('produces stable ordering across cohort', () => {
    const snapshots = [
      makeSnapshot({
        artistId: 'big',
        spotifyMonthlyListeners: 5000000,
        spotifyFollowers: 800000,
        playlistReach: 10000000,
        tiktokFollowers: 1000000,
        tiktokTopViews: 20000000,
        instagramFollowers: 2000000,
        youtubeSubscribers: 500000,
        youtubeChannelViews: 50000000,
        shazamTotal: 100000,
        airplaySpins: 5000,
      }),
      makeSnapshot({
        artistId: 'mid',
        spotifyMonthlyListeners: 500000,
        spotifyFollowers: 100000,
        playlistReach: 1000000,
        tiktokFollowers: 100000,
        tiktokTopViews: 2000000,
        instagramFollowers: 200000,
        youtubeSubscribers: 50000,
        youtubeChannelViews: 5000000,
        shazamTotal: 10000,
        airplaySpins: 500,
      }),
      makeSnapshot({
        artistId: 'small',
        spotifyMonthlyListeners: 50000,
        spotifyFollowers: 10000,
        playlistReach: 100000,
        tiktokFollowers: 10000,
        tiktokTopViews: 200000,
        instagramFollowers: 20000,
        youtubeSubscribers: 5000,
        youtubeChannelViews: 500000,
        shazamTotal: 1000,
        airplaySpins: 50,
      }),
    ];

    const results = computeTractionIndexCohort(snapshots);

    // Should be sorted descending by traction index
    expect(results[0].artistId).toBe('big');
    expect(results[1].artistId).toBe('mid');
    expect(results[2].artistId).toBe('small');

    // Big should score highest, small lowest
    expect(results[0].tractionIndex).toBeGreaterThan(results[1].tractionIndex);
    expect(results[1].tractionIndex).toBeGreaterThan(results[2].tractionIndex);
  });

  it('is deterministic — same input always produces same output', () => {
    const snapshots = [
      makeSnapshot({ artistId: 'a', spotifyMonthlyListeners: 1000000, spotifyFollowers: 200000 }),
      makeSnapshot({ artistId: 'b', spotifyMonthlyListeners: 500000, spotifyFollowers: 100000 }),
    ];

    const run1 = computeTractionIndexCohort(snapshots);
    const run2 = computeTractionIndexCohort(snapshots);

    expect(run1[0].tractionIndex).toBe(run2[0].tractionIndex);
    expect(run1[1].tractionIndex).toBe(run2[1].tractionIndex);
    expect(run1[0].debug).toEqual(run2[0].debug);
  });

  it('handles null metrics gracefully — defaults to neutral 50', () => {
    const results = computeTractionIndexCohort([
      makeSnapshot({ artistId: 'null-artist' }),
      makeSnapshot({
        artistId: 'has-data',
        spotifyMonthlyListeners: 1000000,
        spotifyFollowers: 200000,
      }),
    ]);

    // Null artist should get 50 (neutral) for metrics where cohort has no signal
    // and lower than has-data for metrics where cohort does have signal
    const nullResult = results.find((r) => r.artistId === 'null-artist')!;
    const dataResult = results.find((r) => r.artistId === 'has-data')!;
    expect(dataResult.tractionIndex).toBeGreaterThan(nullResult.tractionIndex);
  });

  it('output is always 0–100', () => {
    const snapshots = [
      makeSnapshot({
        artistId: 'extreme',
        spotifyMonthlyListeners: 999999999,
        spotifyFollowers: 999999999,
        playlistReach: 999999999,
        tiktokFollowers: 999999999,
        tiktokTopViews: 999999999,
        instagramFollowers: 999999999,
        youtubeSubscribers: 999999999,
        youtubeChannelViews: 999999999,
        shazamTotal: 999999999,
        airplaySpins: 999999999,
      }),
      makeSnapshot({ artistId: 'zero' }),
    ];

    const results = computeTractionIndexCohort(snapshots);
    for (const r of results) {
      expect(r.tractionIndex).toBeGreaterThanOrEqual(0);
      expect(r.tractionIndex).toBeLessThanOrEqual(100);
    }
  });

  it('stage score has 80% weight, followers 20%', () => {
    // Artist with huge stage metrics but no followers
    const stageHeavy = makeSnapshot({
      artistId: 'stage-heavy',
      spotifyMonthlyListeners: 10000000,
      playlistReach: 50000000,
      tiktokTopViews: 100000000,
      shazamTotal: 500000,
      youtubeChannelViews: 200000000,
      airplaySpins: 10000,
      // No follower metrics
    });

    // Artist with huge follower metrics but no stage
    const followersHeavy = makeSnapshot({
      artistId: 'followers-heavy',
      spotifyFollowers: 5000000,
      instagramFollowers: 10000000,
      tiktokFollowers: 8000000,
      youtubeSubscribers: 3000000,
      // No stage metrics
    });

    const results = computeTractionIndexCohort([stageHeavy, followersHeavy]);
    const stageResult = results.find((r) => r.artistId === 'stage-heavy')!;
    const followResult = results.find((r) => r.artistId === 'followers-heavy')!;

    // Stage-heavy should score higher because stage weight is 80%
    expect(stageResult.tractionIndex).toBeGreaterThan(followResult.tractionIndex);
  });

  it('modifiers are bounded to ±5', () => {
    const snapshots = [
      makeSnapshot({
        artistId: 'high-conversion',
        spotifyMonthlyListeners: 100000,
        spotifyFollowers: 90000, // very high conversion
      }),
      makeSnapshot({
        artistId: 'low-conversion',
        spotifyMonthlyListeners: 1000000,
        spotifyFollowers: 10000, // very low conversion
      }),
    ];

    const results = computeTractionIndexCohort(snapshots);
    for (const r of results) {
      expect(Math.abs(r.fanConversionModifier)).toBeLessThanOrEqual(5);
      expect(Math.abs(r.listenerFollowerModifier)).toBeLessThanOrEqual(5);
    }
  });

  it('debug object contains all expected fields', () => {
    const results = computeTractionIndexCohort([
      makeSnapshot({ artistId: 'debug-test', spotifyMonthlyListeners: 500000 }),
    ]);

    const debug = results[0].debug;
    expect(debug.artistId).toBe('debug-test');
    expect(debug).toHaveProperty('stageRaw');
    expect(debug).toHaveProperty('stagePercentiles');
    expect(debug).toHaveProperty('stageScore');
    expect(debug).toHaveProperty('followersRaw');
    expect(debug).toHaveProperty('followersPercentiles');
    expect(debug).toHaveProperty('followersScore');
    expect(debug).toHaveProperty('baseScore');
    expect(debug).toHaveProperty('fanConversionModifier');
    expect(debug).toHaveProperty('listenerFollowerModifier');
    expect(debug).toHaveProperty('finalScore');
    expect(debug).toHaveProperty('cohortSize');
    expect(debug.cohortSize).toBe(1);
  });
});
