import { describe, it, expect } from 'vitest';
import {
  computeTractionIndexCohort,
  log1pTransform,
  percentileRank,
  MODIFIER_MAX_POINTS,
  ArtistSnapshot,
} from './tractionIndex';

// ── Helper to build snapshots ──────────────────────────────────────────────

function makeSnapshot(overrides: Partial<ArtistSnapshot> & { artistId: string }): ArtistSnapshot {
  return {
    spotifyMonthlyListeners: null,
    spotifyFollowers: null,
    spotifyPopularity: null,
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
        spotifyPopularity: 85,
        playlistReach: 10000000,
        tiktokFollowers: 1000000,
        tiktokTopViews: 20000000,
        instagramFollowers: 2000000,
        youtubeSubscribers: 500000,
        youtubeChannelViews: 50000000,
      }),
      makeSnapshot({
        artistId: 'mid',
        spotifyMonthlyListeners: 500000,
        spotifyFollowers: 100000,
        spotifyPopularity: 55,
        playlistReach: 1000000,
        tiktokFollowers: 100000,
        tiktokTopViews: 2000000,
        instagramFollowers: 200000,
        youtubeSubscribers: 50000,
        youtubeChannelViews: 5000000,
      }),
      makeSnapshot({
        artistId: 'small',
        spotifyMonthlyListeners: 50000,
        spotifyFollowers: 10000,
        spotifyPopularity: 25,
        playlistReach: 100000,
        tiktokFollowers: 10000,
        tiktokTopViews: 200000,
        instagramFollowers: 20000,
        youtubeSubscribers: 5000,
        youtubeChannelViews: 500000,
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

  it('null metrics are skipped — not penalized (missing-metrics safe)', () => {
    // spotifyOnly has Spotify data only, no TikTok/YouTube/Instagram
    const spotifyOnly = makeSnapshot({
      artistId: 'spotify-only',
      spotifyMonthlyListeners: 1000000,
      spotifyFollowers: 200000,
      spotifyPopularity: 70,
      playlistReach: 5000000,
    });

    // allPlatforms has same Spotify data PLUS other platforms
    const allPlatforms = makeSnapshot({
      artistId: 'all-platforms',
      spotifyMonthlyListeners: 1000000,
      spotifyFollowers: 200000,
      spotifyPopularity: 70,
      playlistReach: 5000000,
      tiktokFollowers: 500000,
      tiktokTopViews: 10000000,
      instagramFollowers: 800000,
      youtubeSubscribers: 300000,
      youtubeChannelViews: 20000000,
    });

    const results = computeTractionIndexCohort([spotifyOnly, allPlatforms]);
    const spotifyResult = results.find(r => r.artistId === 'spotify-only')!;
    const allResult = results.find(r => r.artistId === 'all-platforms')!;

    // spotify-only should NOT be dragged down to near-zero
    // Their Spotify metrics are identical, so spotify-only should score reasonably
    expect(spotifyResult.tractionIndex).toBeGreaterThan(30);

    // allPlatforms may score higher due to extra data, but the gap should not be huge
    // since the core Spotify metrics are identical
    expect(allResult.tractionIndex - spotifyResult.tractionIndex).toBeLessThan(30);
  });

  it('0 values ARE scored as genuinely zero (different from null)', () => {
    // This artist has TikTok but it's truly zero views
    const zeroTiktok = makeSnapshot({
      artistId: 'zero-tiktok',
      spotifyMonthlyListeners: 1000000,
      spotifyFollowers: 200000,
      spotifyPopularity: 70,
      playlistReach: 5000000,
      tiktokTopViews: 0, // explicitly zero — should count as low
    });

    // This artist doesn't have TikTok at all
    const nullTiktok = makeSnapshot({
      artistId: 'null-tiktok',
      spotifyMonthlyListeners: 1000000,
      spotifyFollowers: 200000,
      spotifyPopularity: 70,
      playlistReach: 5000000,
      tiktokTopViews: null, // missing — should be skipped
    });

    // Third artist with high TikTok (needed for percentile to matter)
    const highTiktok = makeSnapshot({
      artistId: 'high-tiktok',
      spotifyMonthlyListeners: 1000000,
      spotifyFollowers: 200000,
      spotifyPopularity: 70,
      playlistReach: 5000000,
      tiktokTopViews: 10000000,
    });

    const results = computeTractionIndexCohort([zeroTiktok, nullTiktok, highTiktok]);
    const zeroResult = results.find(r => r.artistId === 'zero-tiktok')!;
    const nullResult = results.find(r => r.artistId === 'null-tiktok')!;

    // null-tiktok should score >= zero-tiktok because null is skipped (neutral)
    // while 0 is scored as genuinely low
    expect(nullResult.tractionIndex).toBeGreaterThanOrEqual(zeroResult.tractionIndex);
  });

  it('shazamTotal and airplaySpins are NOT used in scoring', () => {
    const withShazam = makeSnapshot({
      artistId: 'with-shazam',
      spotifyMonthlyListeners: 500000,
      spotifyFollowers: 100000,
      shazamTotal: 999999999,
      airplaySpins: 999999999,
    });

    const withoutShazam = makeSnapshot({
      artistId: 'without-shazam',
      spotifyMonthlyListeners: 500000,
      spotifyFollowers: 100000,
      shazamTotal: null,
      airplaySpins: null,
    });

    const results = computeTractionIndexCohort([withShazam, withoutShazam]);
    const shazamResult = results.find(r => r.artistId === 'with-shazam')!;
    const noShazamResult = results.find(r => r.artistId === 'without-shazam')!;

    // Scores should be identical since shazam/airplay aren't scored
    expect(shazamResult.tractionIndex).toBe(noShazamResult.tractionIndex);
  });

  it('spotifyPopularity is used in stage scoring', () => {
    const highPop = makeSnapshot({
      artistId: 'high-pop',
      spotifyMonthlyListeners: 500000,
      spotifyFollowers: 100000,
      spotifyPopularity: 90,
    });

    const lowPop = makeSnapshot({
      artistId: 'low-pop',
      spotifyMonthlyListeners: 500000,
      spotifyFollowers: 100000,
      spotifyPopularity: 10,
    });

    const results = computeTractionIndexCohort([highPop, lowPop]);
    const highResult = results.find(r => r.artistId === 'high-pop')!;
    const lowResult = results.find(r => r.artistId === 'low-pop')!;

    expect(highResult.stageScore).toBeGreaterThan(lowResult.stageScore);
  });

  it('output is always 0–100', () => {
    const snapshots = [
      makeSnapshot({
        artistId: 'extreme',
        spotifyMonthlyListeners: 999999999,
        spotifyFollowers: 999999999,
        spotifyPopularity: 100,
        playlistReach: 999999999,
        tiktokFollowers: 999999999,
        tiktokTopViews: 999999999,
        instagramFollowers: 999999999,
        youtubeSubscribers: 999999999,
        youtubeChannelViews: 999999999,
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
    // Three artists: one strong in stage, one strong in followers, one baseline
    // All three provide data for ALL metrics so percentiles work properly
    const stageHeavy = makeSnapshot({
      artistId: 'stage-heavy',
      spotifyMonthlyListeners: 10000000,
      spotifyPopularity: 95,
      playlistReach: 50000000,
      tiktokTopViews: 100000000,
      youtubeChannelViews: 200000000,
      spotifyFollowers: 100,       // minimal followers
      instagramFollowers: 100,
      tiktokFollowers: 100,
      youtubeSubscribers: 100,
    });

    const followersHeavy = makeSnapshot({
      artistId: 'followers-heavy',
      spotifyMonthlyListeners: 100,     // minimal stage
      spotifyPopularity: 5,
      playlistReach: 100,
      tiktokTopViews: 100,
      youtubeChannelViews: 100,
      spotifyFollowers: 5000000,
      instagramFollowers: 10000000,
      tiktokFollowers: 8000000,
      youtubeSubscribers: 3000000,
    });

    const baseline = makeSnapshot({
      artistId: 'baseline',
      spotifyMonthlyListeners: 500000,
      spotifyPopularity: 50,
      playlistReach: 2000000,
      tiktokTopViews: 5000000,
      youtubeChannelViews: 10000000,
      spotifyFollowers: 200000,
      instagramFollowers: 500000,
      tiktokFollowers: 400000,
      youtubeSubscribers: 150000,
    });

    const results = computeTractionIndexCohort([stageHeavy, followersHeavy, baseline]);
    const stageResult = results.find((r) => r.artistId === 'stage-heavy')!;
    const followResult = results.find((r) => r.artistId === 'followers-heavy')!;

    // Stage-heavy should score higher because stage weight is 80%
    expect(stageResult.tractionIndex).toBeGreaterThan(followResult.tractionIndex);
  });

  it('modifiers are bounded to ±MODIFIER_MAX_POINTS', () => {
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
      expect(Math.abs(r.fanConversionModifier)).toBeLessThanOrEqual(MODIFIER_MAX_POINTS);
      expect(Math.abs(r.listenerFollowerModifier)).toBeLessThanOrEqual(MODIFIER_MAX_POINTS);
    }
  });

  it('debug object contains all expected fields including weights', () => {
    const results = computeTractionIndexCohort([
      makeSnapshot({ artistId: 'debug-test', spotifyMonthlyListeners: 500000 }),
    ]);

    const debug = results[0].debug;
    expect(debug.artistId).toBe('debug-test');
    expect(debug).toHaveProperty('stageRaw');
    expect(debug).toHaveProperty('stagePercentiles');
    expect(debug).toHaveProperty('stageWeightsUsed');
    expect(debug).toHaveProperty('stageScore');
    expect(debug).toHaveProperty('followersRaw');
    expect(debug).toHaveProperty('followersPercentiles');
    expect(debug).toHaveProperty('followersWeightsUsed');
    expect(debug).toHaveProperty('followersScore');
    expect(debug).toHaveProperty('baseScore');
    expect(debug).toHaveProperty('fanConversionModifier');
    expect(debug).toHaveProperty('listenerFollowerModifier');
    expect(debug).toHaveProperty('finalScore');
    expect(debug).toHaveProperty('cohortSize');
    expect(debug.cohortSize).toBe(1);
  });

  it('weights renormalize correctly when metrics are missing', () => {
    // Artist with only Spotify listeners (weight 40 in stage)
    const results = computeTractionIndexCohort([
      makeSnapshot({
        artistId: 'spotify-only-a',
        spotifyMonthlyListeners: 1000000,
      }),
      makeSnapshot({
        artistId: 'spotify-only-b',
        spotifyMonthlyListeners: 500000,
      }),
    ]);

    // Both should have stage scores since both have spotifyMonthlyListeners
    // The weights should renormalize to just spotifyMonthlyListeners = 100% of stage
    const aResult = results.find(r => r.artistId === 'spotify-only-a')!;
    expect(aResult.debug.stageWeightsUsed).toHaveProperty('spotifyMonthlyListeners');
    // Only one key should be in weightsUsed since others are null
    expect(Object.keys(aResult.debug.stageWeightsUsed)).toHaveLength(1);
  });
});
