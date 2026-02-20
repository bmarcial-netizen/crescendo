import { db } from '../db';
import { artists, artistMetricSnapshots, tractionIndexSnapshots, riskControls } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { computeTractionIndexCohort, ArtistSnapshot, TractionResult } from '../model/tractionIndex';
import { computePrice, getSpreadBps } from './pricing.service';

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
 */
async function persistResult(result: TractionResult) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, result.artistId))
    .limit(1);
  if (!artist) return;

  const newPrice = computePrice(parseFloat(artist.basePrice), result.tractionIndex);
  const spreadBps = await getSpreadBps(result.artistId);
  const halfSpread = newPrice * (spreadBps / 10000 / 2);
  const bid = Math.round((newPrice - halfSpread) * 10000) / 10000;
  const ask = Math.round((newPrice + halfSpread) * 10000) / 10000;

  await db.transaction(async (tx) => {
    // Check circuit breaker
    const oldPrice = parseFloat(artist.currentPrice);
    const pctChange = oldPrice > 0 ? Math.abs((newPrice - oldPrice) / oldPrice) : 0;

    const [control] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.artistId, result.artistId))
      .limit(1);
    const threshold = parseFloat(control?.circuitBreakerThresholdPct ?? '0.20');

    if (pctChange > threshold && oldPrice > 0) {
      await tx
        .update(artists)
        .set({
          circuitBreakerStatus: 'tripped',
          circuitBreakerTrippedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, result.artistId));
    }

    // Update artist price
    await tx
      .update(artists)
      .set({
        currentPrice: newPrice.toString(),
        currentBid: bid.toString(),
        currentAsk: ask.toString(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, result.artistId));

    // Insert traction index snapshot with new Chartmetric-driven fields
    await tx.insert(tractionIndexSnapshots).values({
      artistId: result.artistId,
      // Legacy fields — fill with the new model's decomposition
      albumVelocityScore: '0',
      catalogSizeScore: '0',
      revenueGrowthScore: '0',
      socialFollowersScore: result.followersScore.toString(),
      externalPopularityScore: '0',
      // New Chartmetric-driven fields
      stageScore: result.stageScore.toString(),
      followersScore: result.followersScore.toString(),
      fanConversionModifier: result.fanConversionModifier.toString(),
      listenerFollowerModifier: result.listenerFollowerModifier.toString(),
      metricSnapshotId: result.metricSnapshotId || null,
      tractionDebugJson: result.debug as unknown as Record<string, unknown>,
      tractionScore: result.tractionIndex.toString(),
      computedPrice: newPrice.toString(),
    });
  });

  return { artistId: result.artistId, tractionIndex: result.tractionIndex, newPrice, bid, ask };
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
