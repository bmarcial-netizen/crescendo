import { db } from '../db';
import { artists, artistMetricSnapshots, tractionIndexSnapshots, riskControls } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { computeTractionIndexCohort, ArtistSnapshot, TractionResult } from '../model/tractionIndex';
import { computePrice, getSpreadBps } from './pricing.service';
import { clampDailyReturn, shouldCircuitBreakerTrip } from '../model/priceGuard';

/**
 * Build ArtistSnapshot from a DB metric snapshot row.
 * Handles the decimal-string → number | null conversion.
 */
function toArtistSnapshot(
  artistId: string,
  row: typeof artistMetricSnapshots.$inferSelect
): ArtistSnapshot {
  return {
    artistId,
    spotifyMonthlyListeners: numOrNull(row.spotifyMonthlyListeners),
    spotifyFollowers: numOrNull(row.spotifyFollowers),
    spotifyPopularity: numOrNull(row.spotifyPopularity),
    playlistReach: numOrNull(row.playlistReach),
    tiktokFollowers: numOrNull(row.tiktokFollowers),
    tiktokTopViews: numOrNull(row.tiktokTopViews),
    instagramFollowers: numOrNull(row.instagramFollowers),
    youtubeSubscribers: numOrNull(row.youtubeSubscribers),
    youtubeChannelViews: numOrNull(row.youtubeChannelViews),
    shazamTotal: numOrNull(row.shazamTotal),
    airplaySpins: numOrNull(row.airplaySpins),
    fanConversionRate: numOrNull(row.fanConversionRate),
    spotifyListenerToFollowerRatio: numOrNull(row.spotifyListenerToFollowerRatio),
    metricSnapshotId: row.id,
  };
}

function numOrNull(v: string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/**
 * Fetch the latest metric snapshot for each artist.
 * Prefers `chartmetric_manual` source; falls back to any source.
 *
 * Uses a single query with DISTINCT ON to get the most recent snapshot per artist,
 * with chartmetric_manual sorted first.
 */
async function fetchCohortSnapshots(): Promise<ArtistSnapshot[]> {
  // Get all artists
  const allArtists = await db.select({ id: artists.id }).from(artists);
  if (allArtists.length === 0) return [];

  const snapshots: ArtistSnapshot[] = [];

  for (const artist of allArtists) {
    // Try chartmetric_manual first
    let [row] = await db
      .select()
      .from(artistMetricSnapshots)
      .where(
        sql`${artistMetricSnapshots.artistId} = ${artist.id} AND ${artistMetricSnapshots.source} = 'chartmetric_manual'`
      )
      .orderBy(desc(artistMetricSnapshots.capturedAt))
      .limit(1);

    // Fallback to any source
    if (!row) {
      [row] = await db
        .select()
        .from(artistMetricSnapshots)
        .where(eq(artistMetricSnapshots.artistId, artist.id))
        .orderBy(desc(artistMetricSnapshots.capturedAt))
        .limit(1);
    }

    if (row) {
      snapshots.push(toArtistSnapshot(artist.id, row));
    }
  }

  return snapshots;
}

/**
 * Persist a TractionResult: update the artist's price and insert a traction_index_snapshot.
 *
 * Safety mechanisms:
 *   1. Circuit breaker: if the RAW price move exceeds the threshold, trip the
 *      breaker and BLOCK the price write. A snapshot is still inserted (for audit)
 *      with computedPrice = the old (unchanged) price.
 *   2. Daily return cap: clamp the actual price move to ±12% of the previous price.
 */
async function persistResult(result: TractionResult) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, result.artistId))
    .limit(1);
  if (!artist) return;

  const rawNewPrice = computePrice(parseFloat(artist.basePrice), result.tractionIndex);
  const oldPrice = parseFloat(artist.currentPrice);

  await db.transaction(async (tx) => {
    const [control] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.artistId, result.artistId))
      .limit(1);
    const threshold = parseFloat(control?.circuitBreakerThresholdPct ?? '0.20');

    // 1. Circuit breaker check on RAW (unclamped) price change
    if (shouldCircuitBreakerTrip(rawNewPrice, oldPrice, threshold)) {
      // Trip the breaker
      await tx
        .update(artists)
        .set({
          circuitBreakerStatus: 'tripped',
          circuitBreakerTrippedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, result.artistId));

      // Insert audit snapshot with OLD price (price was NOT updated)
      await tx.insert(tractionIndexSnapshots).values({
        artistId: result.artistId,
        albumVelocityScore: '0',
        catalogSizeScore: '0',
        revenueGrowthScore: '0',
        socialFollowersScore: result.followersScore.toString(),
        externalPopularityScore: '0',
        stageScore: result.stageScore.toString(),
        followersScore: result.followersScore.toString(),
        fanConversionModifier: result.fanConversionModifier.toString(),
        listenerFollowerModifier: result.listenerFollowerModifier.toString(),
        metricSnapshotId: result.metricSnapshotId || null,
        tractionDebugJson: result.debug as unknown as Record<string, unknown>,
        tractionScore: result.tractionIndex.toString(),
        computedPrice: oldPrice.toString(), // unchanged — breaker blocked
      });

      // BLOCK: do NOT update price
      return;
    }

    // 2. Apply daily return cap (±12%)
    const { clampedPrice } = clampDailyReturn(rawNewPrice, oldPrice);

    // Recompute bid/ask from the clamped price
    const spreadBps = await getSpreadBps(result.artistId);
    const halfSpread = clampedPrice * (spreadBps / 10000 / 2);
    const bid = Math.round((clampedPrice - halfSpread) * 10000) / 10000;
    const ask = Math.round((clampedPrice + halfSpread) * 10000) / 10000;

    // 3. Update artist price with clamped value
    await tx
      .update(artists)
      .set({
        currentPrice: clampedPrice.toString(),
        currentBid: bid.toString(),
        currentAsk: ask.toString(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, result.artistId));

    // 4. Insert traction index snapshot
    await tx.insert(tractionIndexSnapshots).values({
      artistId: result.artistId,
      albumVelocityScore: '0',
      catalogSizeScore: '0',
      revenueGrowthScore: '0',
      socialFollowersScore: result.followersScore.toString(),
      externalPopularityScore: '0',
      stageScore: result.stageScore.toString(),
      followersScore: result.followersScore.toString(),
      fanConversionModifier: result.fanConversionModifier.toString(),
      listenerFollowerModifier: result.listenerFollowerModifier.toString(),
      metricSnapshotId: result.metricSnapshotId || null,
      tractionDebugJson: result.debug as unknown as Record<string, unknown>,
      tractionScore: result.tractionIndex.toString(),
      computedPrice: clampedPrice.toString(),
    });
  });

  // If breaker tripped, the inner `return` exits the transaction callback.
  // We still return the old price so the caller sees it as "no change".
  const spreadBps = await getSpreadBps(result.artistId);
  // Re-read artist to get whatever price ended up persisted
  const [updated] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, result.artistId))
    .limit(1);
  if (!updated) return;

  const finalPrice = parseFloat(updated.currentPrice);
  const halfSpread = finalPrice * (spreadBps / 10000 / 2);

  return {
    artistId: result.artistId,
    tractionIndex: result.tractionIndex,
    newPrice: finalPrice,
    bid: Math.round((finalPrice - halfSpread) * 10000) / 10000,
    ask: Math.round((finalPrice + halfSpread) * 10000) / 10000,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface RunTractionIndexResult {
  cohortSize: number;
  computed: number;
  skipped: number;
  results: Array<{
    artistId: string;
    tractionIndex: number;
    newPrice: number;
    bid: number;
    ask: number;
  }>;
  sampleDebug: TractionResult['debug'][];
}

/**
 * Recompute the Traction Index for ALL artists in the cohort.
 * Fetches latest metric snapshots, runs the pure model, persists results.
 */
export async function runTractionIndexForAll(): Promise<RunTractionIndexResult> {
  const cohortSnapshots = await fetchCohortSnapshots();
  const allArtists = await db.select({ id: artists.id }).from(artists);

  if (cohortSnapshots.length === 0) {
    return { cohortSize: allArtists.length, computed: 0, skipped: allArtists.length, results: [], sampleDebug: [] };
  }

  const tractionResults = computeTractionIndexCohort(cohortSnapshots);

  const persisted = [];
  for (const result of tractionResults) {
    const p = await persistResult(result);
    if (p) persisted.push(p);
  }

  // Return up to 2 debug samples
  const sampleDebug = tractionResults.slice(0, 2).map((r) => r.debug);

  return {
    cohortSize: allArtists.length,
    computed: persisted.length,
    skipped: allArtists.length - cohortSnapshots.length,
    results: persisted,
    sampleDebug,
  };
}

/**
 * Recompute traction for all artists.
 * Called after a new snapshot is inserted for any artist.
 * MVP approach: full cohort recompute (N is small for hackathon).
 */
export async function recomputeTractionAfterSnapshotInsert(): Promise<void> {
  await runTractionIndexForAll();
}
