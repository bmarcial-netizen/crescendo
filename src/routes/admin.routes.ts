import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { db } from '../db';
import { artists, riskControls, ledgerEntries, ledgerAccounts } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { updateArtistPrice } from '../services/pricing.service';
import { getArtistAlbums, computeAlbumVelocityScore, computeCatalogSizeScore } from '../services/spotify.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { runTractionIndexForAll } from '../services/tractionIndex.service';
import { resetDemo } from '../services/demo.service';
import { recomputeArtistBasePrices } from '../services/dailyPrice.service';

const router = Router();

router.use(requireAuth('admin'));

// Recompute Chartmetric-driven Traction Index for all artists
router.post('/run-traction-index', async (_req: AuthRequest, res: Response) => {
  const result = await runTractionIndexForAll();
  res.json(result);
});

// Trigger legacy traction index update for an artist
router.post('/traction-index/update', async (req: AuthRequest, res: Response) => {
  const { artistId, albumVelocity, catalogSize, revenueGrowth, socialFollowers, externalPopularity } = req.body;

  if (!artistId) throw new BadRequestError('artistId required');

  // If Spotify data not provided, try to fetch it
  let albumVel = albumVelocity;
  let catSize = catalogSize;

  if (albumVel === undefined || catSize === undefined) {
    const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
    if (!artist) throw new NotFoundError('Artist not found');

    if (artist.spotifyArtistId) {
      try {
        const albums = await getArtistAlbums(artist.spotifyArtistId);
        if (albumVel === undefined) albumVel = computeAlbumVelocityScore(albums);
        if (catSize === undefined) catSize = computeCatalogSizeScore(albums.length);
      } catch (err) {
        console.error('Spotify fetch failed, using defaults:', err);
        if (albumVel === undefined) albumVel = 50;
        if (catSize === undefined) catSize = 50;
      }
    } else {
      if (albumVel === undefined) albumVel = 50;
      if (catSize === undefined) catSize = 50;
    }
  }

  const result = await updateArtistPrice(artistId, {
    albumVelocity: albumVel ?? 50,
    catalogSize: catSize ?? 50,
    revenueGrowth: revenueGrowth ?? 50,
    socialFollowers: socialFollowers ?? 50,
    externalPopularity: externalPopularity ?? 50,
  });

  res.json(result);
});

// Update risk controls for an artist
router.put('/risk-controls/:artistId', async (req: AuthRequest, res: Response) => {
  const artistId = req.params.artistId as string;
  const {
    maxPositionShares,
    maxPositionPct,
    dailyTradeCapShares,
    dailyTradeCapUsd,
    cooldownMinutes,
    circuitBreakerThresholdPct,
    spreadBps,
  } = req.body;

  const [existing] = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.artistId, artistId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(riskControls)
      .set({
        ...(maxPositionShares !== undefined && { maxPositionShares }),
        ...(maxPositionPct !== undefined && { maxPositionPct: maxPositionPct.toString() }),
        ...(dailyTradeCapShares !== undefined && { dailyTradeCapShares }),
        ...(dailyTradeCapUsd !== undefined && { dailyTradeCapUsd: dailyTradeCapUsd.toString() }),
        ...(cooldownMinutes !== undefined && { cooldownMinutes }),
        ...(circuitBreakerThresholdPct !== undefined && { circuitBreakerThresholdPct: circuitBreakerThresholdPct.toString() }),
        ...(spreadBps !== undefined && { spreadBps }),
        updatedAt: new Date(),
      })
      .where(eq(riskControls.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(riskControls)
      .values({
        artistId,
        maxPositionShares,
        maxPositionPct: maxPositionPct?.toString(),
        dailyTradeCapShares,
        dailyTradeCapUsd: dailyTradeCapUsd?.toString(),
        cooldownMinutes,
        circuitBreakerThresholdPct: circuitBreakerThresholdPct?.toString(),
        spreadBps,
      })
      .returning();
    res.status(201).json(created);
  }
});

// Reset circuit breaker
router.post('/circuit-breaker/:artistId/reset', async (req: AuthRequest, res: Response) => {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, req.params.artistId as string))
    .limit(1);

  if (!artist) throw new NotFoundError('Artist not found');

  const [updated] = await db
    .update(artists)
    .set({
      circuitBreakerStatus: 'closed',
      circuitBreakerTrippedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, req.params.artistId as string))
    .returning();

  res.json(updated);
});

// Ledger integrity check
router.get('/ledger/integrity', async (_req: AuthRequest, res: Response) => {
  const [result] = await db
    .select({
      netBalance: sql<string>`
        SUM(CASE WHEN ${ledgerEntries.entryType} = 'debit' THEN ${ledgerEntries.amount}::decimal ELSE -${ledgerEntries.amount}::decimal END)
      `,
      totalEntries: sql<number>`COUNT(*)`,
    })
    .from(ledgerEntries);

  const accounts = await db
    .select({
      name: ledgerAccounts.name,
      accountType: ledgerAccounts.accountType,
      balance: ledgerAccounts.balance,
    })
    .from(ledgerAccounts);

  res.json({
    integrity: {
      netBalance: result.netBalance || '0',
      isBalanced: parseFloat(result.netBalance || '0') === 0,
      totalEntries: result.totalEntries,
    },
    accounts,
  });
});

// Update global risk controls
router.put('/risk-controls', async (req: AuthRequest, res: Response) => {
  const {
    maxPositionShares,
    maxPositionPct,
    dailyTradeCapShares,
    dailyTradeCapUsd,
    cooldownMinutes,
    circuitBreakerThresholdPct,
    spreadBps,
  } = req.body;

  const [existing] = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.isGlobal, true))
    .limit(1);

  if (!existing) throw new NotFoundError('Global risk controls not found — run seed first');

  const [updated] = await db
    .update(riskControls)
    .set({
      ...(maxPositionShares !== undefined && { maxPositionShares }),
      ...(maxPositionPct !== undefined && { maxPositionPct: maxPositionPct.toString() }),
      ...(dailyTradeCapShares !== undefined && { dailyTradeCapShares }),
      ...(dailyTradeCapUsd !== undefined && { dailyTradeCapUsd: dailyTradeCapUsd.toString() }),
      ...(cooldownMinutes !== undefined && { cooldownMinutes }),
      ...(circuitBreakerThresholdPct !== undefined && { circuitBreakerThresholdPct: circuitBreakerThresholdPct.toString() }),
      ...(spreadBps !== undefined && { spreadBps }),
      updatedAt: new Date(),
    })
    .where(eq(riskControls.id, existing.id))
    .returning();

  res.json(updated);
});

// Recompute daily prices from metrics (deterministic)
router.post('/recompute-prices', async (_req: AuthRequest, res: Response) => {
  await recomputeArtistBasePrices();
  res.json({ success: true, message: 'Daily prices recomputed from metrics data' });
});

// Demo reset — wipes trades/positions/dividends, preserves artists, reruns traction index
router.post('/demo/reset', async (_req: AuthRequest, res: Response) => {
  const result = await resetDemo();
  res.json(result);
});

export default router;
