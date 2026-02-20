import { Router, Request, Response } from 'express';
import { db } from '../db';
import { artists, tractionIndexSnapshots, artistMetricSnapshots, earningsModelParams, artistCandles } from '../db/schema';
import { eq, desc, and, gte, lte, asc, sql } from 'drizzle-orm';
import { getPriceQuote } from '../services/pricing.service';
import { NotFoundError } from '../utils/errors';
import { estimateEarningsBand, DEFAULT_PARAMS, EarningsModelParams } from '../model/earningsEstimator';

const router = Router();

// List all artists (public)
router.get('/artists', async (_req: Request, res: Response) => {
  const allArtists = await db
    .select({
      id: artists.id,
      symbol: artists.symbol,
      stageName: artists.stageName,
      bio: artists.bio,
      sharesOutstanding: artists.sharesOutstanding,
      maxShares: artists.maxShares,
      revenueSharePct: artists.revenueSharePct,
      currentPrice: artists.currentPrice,
      currentBid: artists.currentBid,
      currentAsk: artists.currentAsk,
      circuitBreakerStatus: artists.circuitBreakerStatus,
    })
    .from(artists);

  res.json({ artists: allArtists });
});

// Get price quote for an artist (public)
router.get('/artists/:id/quote', async (req: Request, res: Response) => {
  const quote = await getPriceQuote((req.params.id as string));
  res.json(quote);
});

// Get traction history for an artist (public)
router.get('/artists/:id/traction-history', async (req: Request, res: Response) => {
  const [artist] = await db.select().from(artists).where(eq(artists.id, (req.params.id as string))).limit(1);
  if (!artist) throw new NotFoundError('Artist not found');

  const snapshots = await db
    .select()
    .from(tractionIndexSnapshots)
    .where(eq(tractionIndexSnapshots.artistId, (req.params.id as string)))
    .orderBy(desc(tractionIndexSnapshots.computedAt))
    .limit(30);

  res.json({ artist: { id: artist.id, stageName: artist.stageName }, snapshots });
});

// Get OHLCV candles for an artist (public)
router.get('/artists/:id/candles', async (req: Request, res: Response) => {
  const artistId = req.params.id as string;
  const interval = (req.query.interval as string) || '1h';
  const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 500);

  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new NotFoundError('Artist not found');

  const candles = await db
    .select()
    .from(artistCandles)
    .where(
      and(
        eq(artistCandles.artistId, artistId),
        eq(artistCandles.interval, interval),
      )
    )
    .orderBy(desc(artistCandles.startTime))
    .limit(limit);

  res.json({
    artistId,
    interval,
    candles: candles.reverse(), // chronological order
  });
});

// Get earnings band estimate for an artist (public)
router.get('/artists/:id/earnings-band', async (req: Request, res: Response) => {
  const artistId = req.params.id as string;

  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new NotFoundError('Artist not found');

  // Get latest metric snapshot for this artist
  const [snapshot] = await db
    .select()
    .from(artistMetricSnapshots)
    .where(eq(artistMetricSnapshots.artistId, artistId))
    .orderBy(desc(artistMetricSnapshots.capturedAt))
    .limit(1);

  const listeners = snapshot?.spotifyMonthlyListeners
    ? parseFloat(snapshot.spotifyMonthlyListeners)
    : null;
  const popularity = snapshot?.spotifyPopularity
    ? parseFloat(snapshot.spotifyPopularity)
    : null;
  const fanConversion = snapshot?.fanConversionRate
    ? parseFloat(snapshot.fanConversionRate)
    : null;

  // Try to load active model params from DB, fall back to defaults
  let modelParams: EarningsModelParams = DEFAULT_PARAMS;
  try {
    const [dbParams] = await db
      .select()
      .from(earningsModelParams)
      .where(eq(earningsModelParams.isActive, true))
      .orderBy(desc(earningsModelParams.updatedAt))
      .limit(1);

    if (dbParams) {
      modelParams = {
        streamsPerListenerLow: parseFloat(dbParams.streamsPerListenerLow),
        streamsPerListenerBase: parseFloat(dbParams.streamsPerListenerBase),
        streamsPerListenerHigh: parseFloat(dbParams.streamsPerListenerHigh),
        usdPerStreamLow: parseFloat(dbParams.usdPerStreamLow),
        usdPerStreamBase: parseFloat(dbParams.usdPerStreamBase),
        usdPerStreamHigh: parseFloat(dbParams.usdPerStreamHigh),
        popularityMidpoint: parseFloat(dbParams.popularityMidpoint),
        popularityMaxAdjustment: parseFloat(dbParams.popularityMaxAdjustment),
        fanConversionMidpoint: parseFloat(dbParams.fanConversionMidpoint),
        fanConversionMaxAdjustment: parseFloat(dbParams.fanConversionMaxAdjustment),
      };
    }
  } catch {
    // DB params table may not exist yet; use defaults
  }

  const revSharePct = parseFloat(artist.revenueSharePct);
  const sharesOutstanding = artist.sharesOutstanding;
  const currentPrice = parseFloat(artist.currentPrice);

  const result = estimateEarningsBand(
    {
      spotifyMonthlyListeners: listeners,
      spotifyPopularity: popularity,
      fanConversionRate: fanConversion,
      revenueSharePct: revSharePct,
      sharesOutstanding,
    },
    modelParams,
  );

  // Compute implied yield if we have a price
  if (currentPrice > 0 && result.annualizedEarningsPerShare.base > 0) {
    result.impliedYield = {
      low: Math.round((result.annualizedEarningsPerShare.low / currentPrice) * 10000) / 10000,
      base: Math.round((result.annualizedEarningsPerShare.base / currentPrice) * 10000) / 10000,
      high: Math.round((result.annualizedEarningsPerShare.high / currentPrice) * 10000) / 10000,
    };
  }

  res.json({
    artistId: artist.id,
    stageName: artist.stageName,
    currentPrice,
    revenueSharePct: revSharePct,
    sharesOutstanding,
    snapshotUsed: snapshot
      ? { id: snapshot.id, capturedAt: snapshot.capturedAt, source: snapshot.source }
      : null,
    ...result,
  });
});

// Get daily metrics for an artist by symbol (public, for charting)
router.get('/:symbol/metrics', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol as string).toUpperCase();
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  // Look up artist by symbol
  const [artist] = await db
    .select({ id: artists.id, symbol: artists.symbol, stageName: artists.stageName })
    .from(artists)
    .where(eq(artists.symbol, symbol))
    .limit(1);

  if (!artist) throw new NotFoundError(`Artist with symbol "${symbol}" not found`);

  // Build query conditions
  const conditions = [eq(artistMetricSnapshots.artistId, artist.id)];
  if (from) {
    conditions.push(gte(artistMetricSnapshots.capturedAt, new Date(from + 'T00:00:00Z')));
  }
  if (to) {
    conditions.push(lte(artistMetricSnapshots.capturedAt, new Date(to + 'T23:59:59Z')));
  }

  const rows = await db
    .select({
      id: artistMetricSnapshots.id,
      capturedAt: artistMetricSnapshots.capturedAt,
      source: artistMetricSnapshots.source,
      spotifyMonthlyListeners: artistMetricSnapshots.spotifyMonthlyListeners,
      spotifyFollowers: artistMetricSnapshots.spotifyFollowers,
      spotifyPopularity: artistMetricSnapshots.spotifyPopularity,
      playlistReach: artistMetricSnapshots.playlistReach,
      tiktokFollowers: artistMetricSnapshots.tiktokFollowers,
      instagramFollowers: artistMetricSnapshots.instagramFollowers,
      youtubeSubscribers: artistMetricSnapshots.youtubeSubscribers,
      youtubeChannelViews: artistMetricSnapshots.youtubeChannelViews,
      fanConversionRate: artistMetricSnapshots.fanConversionRate,
      spotifyListenerToFollowerRatio: artistMetricSnapshots.spotifyListenerToFollowerRatio,
    })
    .from(artistMetricSnapshots)
    .where(and(...conditions))
    .orderBy(asc(artistMetricSnapshots.capturedAt))
    .limit(365);

  res.json({
    artist: { id: artist.id, symbol: artist.symbol, stageName: artist.stageName },
    metrics: rows,
  });
});

export default router;
