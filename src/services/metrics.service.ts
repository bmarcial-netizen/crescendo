import { z } from 'zod';
import { db } from '../db';
import { artistMetricSnapshots, artists } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { parseCsv } from '../utils/csv';
import { recomputeTractionAfterSnapshotInsert } from './tractionIndex.service';

// ── Zod Schema ─────────────────────────────────────────────────────────────

const metricsFieldsSchema = z.object({
  // Spotify
  spotifyMonthlyListeners: z.number().nonnegative().optional(),
  spotifyFollowers: z.number().nonnegative().optional(),
  spotifyPopularity: z.number().min(0).max(100).optional(),

  // Playlist / reach
  playlistReach: z.number().nonnegative().optional(),
  playlistCount: z.number().nonnegative().optional(),

  // TikTok
  tiktokFollowers: z.number().nonnegative().optional(),
  tiktokLikes: z.number().nonnegative().optional(),
  tiktokTopViews: z.number().nonnegative().optional(),

  // Instagram
  instagramFollowers: z.number().nonnegative().optional(),

  // YouTube
  youtubeSubscribers: z.number().nonnegative().optional(),
  youtubeChannelViews: z.number().nonnegative().optional(),

  // Radio / Shazam
  shazamTotal: z.number().nonnegative().optional(),
  airplaySpins: z.number().nonnegative().optional(),

  // Scores
  songstatsScore: z.number().optional(),
  chartmetricScore: z.number().optional(),

  // Derived — accepted but also auto-computed
  fanConversionRate: z.number().optional(),
  reachFollowersRatio: z.number().optional(),
  spotifyListenerToFollowerRatio: z.number().optional(),
}).passthrough(); // allow extra fields in metricsJson

export const chartmetricSnapshotSchema = z.object({
  artistId: z.string().uuid(),
  capturedAt: z.string().datetime({ offset: true }).or(z.string().date()),
  metrics: metricsFieldsSchema,
});

export type ChartmetricSnapshotInput = z.infer<typeof chartmetricSnapshotSchema>;

// ── Derived Ratio Computation ──────────────────────────────────────────────

interface DerivedRatios {
  spotifyListenerToFollowerRatio: number | null;
  fanConversionRate: number | null;
  reachFollowersRatio: number | null;
}

function computeDerivedRatios(m: z.infer<typeof metricsFieldsSchema>): DerivedRatios {
  const listeners = m.spotifyMonthlyListeners ?? 0;
  const followers = m.spotifyFollowers ?? 0;
  const reach = m.playlistReach ?? 0;

  return {
    spotifyListenerToFollowerRatio:
      followers > 0 ? Math.round((listeners / followers) * 1000000) / 1000000 : null,
    fanConversionRate:
      listeners > 0 ? Math.round((followers / listeners) * 1000000) / 1000000 : null,
    reachFollowersRatio:
      followers > 0 ? Math.round((reach / followers) * 1000000) / 1000000 : null,
  };
}

// ── Insert Snapshot (JSON body) ────────────────────────────────────────────

export async function insertMetricSnapshot(input: ChartmetricSnapshotInput, upsert = false) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, input.artistId))
    .limit(1);
  if (!artist) throw new NotFoundError(`Artist not found: ${input.artistId}`);

  const m = input.metrics;
  const derived = computeDerivedRatios(m);

  const row = {
    artistId: input.artistId,
    source: 'chartmetric_manual' as const,
    capturedAt: new Date(input.capturedAt),
    metricsJson: input.metrics as Record<string, unknown>,

    spotifyMonthlyListeners: numOrNull(m.spotifyMonthlyListeners),
    spotifyFollowers: numOrNull(m.spotifyFollowers),
    spotifyPopularity: numOrNull(m.spotifyPopularity),
    spotifyListenerToFollowerRatio: numOrNull(derived.spotifyListenerToFollowerRatio),

    playlistReach: numOrNull(m.playlistReach),
    playlistCount: numOrNull(m.playlistCount),

    fanConversionRate: numOrNull(derived.fanConversionRate),
    reachFollowersRatio: numOrNull(derived.reachFollowersRatio),

    tiktokFollowers: numOrNull(m.tiktokFollowers),
    tiktokLikes: numOrNull(m.tiktokLikes),
    tiktokTopViews: numOrNull(m.tiktokTopViews),

    instagramFollowers: numOrNull(m.instagramFollowers),

    youtubeSubscribers: numOrNull(m.youtubeSubscribers),
    youtubeChannelViews: numOrNull(m.youtubeChannelViews),

    shazamTotal: numOrNull(m.shazamTotal),
    airplaySpins: numOrNull(m.airplaySpins),

    songstatsScore: numOrNull(m.songstatsScore),
    chartmetricScore: numOrNull(m.chartmetricScore),
  };

  let snapshot;
  if (upsert) {
    // Upsert on (artistId, source, capturedAt) unique index
    const { artistId: _a, source: _s, capturedAt: _c, ...updateFields } = row;
    [snapshot] = await db
      .insert(artistMetricSnapshots)
      .values(row)
      .onConflictDoUpdate({
        target: [artistMetricSnapshots.artistId, artistMetricSnapshots.source, artistMetricSnapshots.capturedAt],
        set: updateFields,
      })
      .returning();
  } else {
    [snapshot] = await db
      .insert(artistMetricSnapshots)
      .values(row)
      .returning();
  }

  // Trigger cohort traction recompute (fire-and-forget for API latency)
  recomputeTractionAfterSnapshotInsert().catch((err) =>
    console.error('Traction recompute after snapshot insert failed:', err)
  );

  return { snapshot, derived };
}

// ── Get Latest Snapshot ────────────────────────────────────────────────────

export async function getLatestSnapshot(artistId: string) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  if (!artist) throw new NotFoundError(`Artist not found: ${artistId}`);

  const [snapshot] = await db
    .select()
    .from(artistMetricSnapshots)
    .where(eq(artistMetricSnapshots.artistId, artistId))
    .orderBy(desc(artistMetricSnapshots.capturedAt))
    .limit(1);

  if (!snapshot) throw new NotFoundError('No metric snapshots found for this artist');

  return snapshot;
}

// ── CSV Upload with Profile Detection ──────────────────────────────────────

// Known column header aliases → canonical field name
const COLUMN_MAP: Record<string, keyof z.infer<typeof metricsFieldsSchema> | 'artist_id' | 'captured_at' | 'symbol'> = {
  // Identity
  'artist_id': 'artist_id',
  'artistid': 'artist_id',
  'symbol': 'symbol',
  'ticker': 'symbol',
  'captured_at': 'captured_at',
  'capturedat': 'captured_at',
  'date': 'captured_at',
  'snapshot_date': 'captured_at',

  // Spotify
  'spotify_monthly_listeners': 'spotifyMonthlyListeners',
  'monthly_listeners': 'spotifyMonthlyListeners',
  'sp_monthly_listeners': 'spotifyMonthlyListeners',
  'spotify_followers': 'spotifyFollowers',
  'sp_followers': 'spotifyFollowers',
  'spotify_popularity': 'spotifyPopularity',
  'sp_popularity': 'spotifyPopularity',

  // Playlist
  'playlist_reach': 'playlistReach',
  'playlist_total_reach': 'playlistReach',
  'playlist_count': 'playlistCount',
  'num_playlists': 'playlistCount',

  // TikTok
  'tiktok_followers': 'tiktokFollowers',
  'tt_followers': 'tiktokFollowers',
  'tiktok_likes': 'tiktokLikes',
  'tt_likes': 'tiktokLikes',
  'tiktok_top_views': 'tiktokTopViews',
  'tt_top_views': 'tiktokTopViews',

  // Instagram
  'instagram_followers': 'instagramFollowers',
  'ig_followers': 'instagramFollowers',

  // YouTube
  'youtube_subscribers': 'youtubeSubscribers',
  'yt_subscribers': 'youtubeSubscribers',
  'youtube_channel_views': 'youtubeChannelViews',
  'yt_channel_views': 'youtubeChannelViews',

  // Radio / Shazam
  'shazam_total': 'shazamTotal',
  'shazam_count': 'shazamTotal',
  'airplay_spins': 'airplaySpins',
  'radio_spins': 'airplaySpins',

  // Scores
  'songstats_score': 'songstatsScore',
  'chartmetric_score': 'chartmetricScore',
  'cm_score': 'chartmetricScore',
};

interface CsvParseResult {
  inserted: number;
  errors: string[];
  snapshots: Array<{ artistId: string; capturedAt: string; fieldsFound: string[] }>;
}

export async function parseAndInsertMetricsCsv(buffer: Buffer): Promise<CsvParseResult> {
  const rawRows = parseCsv<Record<string, string>>(buffer);
  if (rawRows.length === 0) throw new BadRequestError('CSV is empty');

  // Profile detection: map CSV headers to canonical field names
  const csvHeaders = Object.keys(rawRows[0]);
  const headerMapping: Record<string, string> = {};
  const unmappedHeaders: string[] = [];

  for (const header of csvHeaders) {
    const normalized = header.toLowerCase().trim().replace(/[\s-]+/g, '_');
    const canonical = COLUMN_MAP[normalized];
    if (canonical) {
      headerMapping[header] = canonical;
    } else {
      unmappedHeaders.push(header);
    }
  }

  // Validate we have the two required columns (artist_id OR symbol, plus date)
  const mappedValues = Object.values(headerMapping);
  const hasArtistId = mappedValues.includes('artist_id');
  const hasSymbol = mappedValues.includes('symbol');
  if (!hasArtistId && !hasSymbol) {
    throw new BadRequestError(
      `CSV missing artist_id or symbol column. Found headers: [${csvHeaders.join(', ')}]. ` +
      `Recognized: [${Object.keys(headerMapping).join(', ')}]. ` +
      `Unrecognized: [${unmappedHeaders.join(', ')}]`
    );
  }
  if (!mappedValues.includes('captured_at')) {
    throw new BadRequestError(
      `CSV missing captured_at/date column. Found headers: [${csvHeaders.join(', ')}]. ` +
      `Recognized: [${Object.keys(headerMapping).join(', ')}]. ` +
      `Unrecognized: [${unmappedHeaders.join(', ')}]`
    );
  }

  // Build a symbol→artistId cache for symbol-based lookups
  const symbolCache: Record<string, string> = {};

  const result: CsvParseResult = { inserted: 0, errors: [], snapshots: [] };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row

    try {
      // Remap CSV row to canonical fields
      const mapped: Record<string, string> = {};
      for (const [csvCol, canonicalName] of Object.entries(headerMapping)) {
        if (row[csvCol] !== undefined && row[csvCol] !== '') {
          mapped[canonicalName] = row[csvCol];
        }
      }

      // Resolve artistId — from artist_id column or symbol lookup
      let artistId = mapped['artist_id'];
      if (!artistId && mapped['symbol']) {
        const sym = mapped['symbol'].toUpperCase();
        if (!symbolCache[sym]) {
          const [found] = await db
            .select({ id: artists.id })
            .from(artists)
            .where(eq(artists.symbol, sym))
            .limit(1);
          if (!found) { result.errors.push(`Row ${rowNum}: artist symbol "${sym}" not found`); continue; }
          symbolCache[sym] = found.id;
        }
        artistId = symbolCache[sym];
      }
      const capturedAt = mapped['captured_at'];
      if (!artistId) { result.errors.push(`Row ${rowNum}: missing artist_id or symbol`); continue; }
      if (!capturedAt) { result.errors.push(`Row ${rowNum}: missing captured_at`); continue; }

      // Build metrics object from numeric fields
      const metrics: Record<string, number> = {};
      const fieldsFound: string[] = [];

      for (const [key, val] of Object.entries(mapped)) {
        if (key === 'artist_id' || key === 'captured_at' || key === 'symbol') continue;
        const num = parseFloat(val);
        if (!isNaN(num)) {
          metrics[key] = num;
          fieldsFound.push(key);
        }
      }

      // Validate with zod
      const parsed = chartmetricSnapshotSchema.parse({
        artistId,
        capturedAt: new Date(capturedAt).toISOString(),
        metrics,
      });

      // Use upsert: update existing row on (artistId, source, capturedAt) conflict
      const { snapshot } = await insertMetricSnapshot(parsed, true);
      result.inserted++;
      result.snapshots.push({ artistId, capturedAt, fieldsFound });

    } catch (err: any) {
      if (err?.issues) {
        // Zod validation error
        const msgs = err.issues.map((iss: any) => `${iss.path.join('.')}: ${iss.message}`);
        result.errors.push(`Row ${rowNum}: ${msgs.join('; ')}`);
      } else if (err?.statusCode) {
        result.errors.push(`Row ${rowNum}: ${err.message}`);
      } else {
        result.errors.push(`Row ${rowNum}: ${err?.message || 'Unknown error'}`);
      }
    }
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function numOrNull(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}
