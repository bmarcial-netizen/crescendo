import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { db } from '../db';
import { artists, shareIssuanceEvents, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { createConnectedAccount } from '../services/stripe.service';

const router = Router();

// Create artist profile (artist role required)
router.post('/', requireAuth('artist'), async (req: AuthRequest, res: Response) => {
  const { stageName, bio, spotifyArtistId, maxShares, revenueSharePct, basePrice } = req.body;

  if (!stageName) {
    res.status(400).json({ error: { message: 'stageName required' } });
    return;
  }

  // Check if artist profile already exists for this user
  const [existing] = await db
    .select()
    .from(artists)
    .where(eq(artists.userId, req.user!.userId))
    .limit(1);

  if (existing) {
    throw new BadRequestError('Artist profile already exists for this user');
  }

  const [artist] = await db
    .insert(artists)
    .values({
      userId: req.user!.userId,
      stageName,
      bio,
      spotifyArtistId,
      maxShares: maxShares || 100000,
      revenueSharePct: revenueSharePct?.toString() || '0.10',
      basePrice: basePrice?.toString() || '1.0000',
      currentPrice: basePrice?.toString() || '1.0000',
      currentBid: basePrice ? (parseFloat(basePrice) * 0.95).toFixed(4) : '0.9500',
      currentAsk: basePrice ? (parseFloat(basePrice) * 1.05).toFixed(4) : '1.0500',
    })
    .returning();

  res.status(201).json(artist);
});

// Get artist by ID (public)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, (req.params.id as string)))
    .limit(1);

  if (!artist) throw new NotFoundError('Artist not found');
  res.json(artist);
});

// Update artist profile (owner or admin)
router.patch('/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, (req.params.id as string)))
    .limit(1);

  if (!artist) throw new NotFoundError('Artist not found');
  if (artist.userId !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ForbiddenError('Not authorized to update this artist');
  }

  const { stageName, bio, spotifyArtistId } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (stageName) updates.stageName = stageName;
  if (bio !== undefined) updates.bio = bio;
  if (spotifyArtistId !== undefined) updates.spotifyArtistId = spotifyArtistId;

  const [updated] = await db
    .update(artists)
    .set(updates)
    .where(eq(artists.id, (req.params.id as string)))
    .returning();

  res.json(updated);
});

// Issue shares (admin only)
router.post('/:id/issue-shares', requireAuth('admin'), async (req: AuthRequest, res: Response) => {
  const { quantity, pricePerShare } = req.body;
  if (!quantity || quantity <= 0) {
    throw new BadRequestError('Positive quantity required');
  }

  const result = await db.transaction(async (tx) => {
    const [artist] = await tx
      .select()
      .from(artists)
      .where(eq(artists.id, (req.params.id as string)))
      .for('update')
      .limit(1);

    if (!artist) throw new NotFoundError('Artist not found');

    const newOutstanding = artist.sharesOutstanding + quantity;
    if (newOutstanding > artist.maxShares) {
      throw new BadRequestError(`Would exceed max shares: ${newOutstanding} > ${artist.maxShares}`);
    }

    await tx
      .update(artists)
      .set({ sharesOutstanding: newOutstanding, updatedAt: new Date() })
      .where(eq(artists.id, (req.params.id as string)));

    const [event] = await tx
      .insert(shareIssuanceEvents)
      .values({
        artistId: (req.params.id as string),
        sharesIssued: quantity,
        pricePerShare: (pricePerShare || artist.currentPrice).toString(),
        sharesOutstandingAfter: newOutstanding,
        issuedBy: req.user!.userId,
      })
      .returning();

    return { event, sharesOutstanding: newOutstanding };
  });

  res.status(201).json(result);
});

// Stripe onboarding
router.post('/:id/stripe/onboard', requireAuth('artist'), async (req: AuthRequest, res: Response) => {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, (req.params.id as string)))
    .limit(1);

  if (!artist) throw new NotFoundError('Artist not found');
  if (artist.userId !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ForbiddenError('Not authorized');
  }

  const { returnUrl, refreshUrl } = req.body;
  const result = await createConnectedAccount(
    (req.params.id as string),
    returnUrl || 'http://localhost:3000/stripe/return',
    refreshUrl || 'http://localhost:3000/stripe/refresh'
  );

  res.json(result);
});

export default router;
