import { Router, Request, Response } from 'express';
import { db } from '../db';
import { artists, tractionIndexSnapshots } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getPriceQuote } from '../services/pricing.service';
import { NotFoundError } from '../utils/errors';

const router = Router();

// List all artists (public)
router.get('/artists', async (_req: Request, res: Response) => {
  const allArtists = await db
    .select({
      id: artists.id,
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

export default router;
