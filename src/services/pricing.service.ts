import { db } from '../db';
import { artists, riskControls, tractionIndexSnapshots } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { TractionComponents, PriceQuote } from '../types';

const WEIGHTS = {
  albumVelocity: 0.25,
  catalogSize: 0.10,
  revenueGrowth: 0.30,
  socialFollowers: 0.20,
  externalPopularity: 0.15,
};

export function computeTractionScore(components: TractionComponents): number {
  const score =
    components.albumVelocity * WEIGHTS.albumVelocity +
    components.catalogSize * WEIGHTS.catalogSize +
    components.revenueGrowth * WEIGHTS.revenueGrowth +
    components.socialFollowers * WEIGHTS.socialFollowers +
    components.externalPopularity * WEIGHTS.externalPopularity;
  return Math.round(score * 100) / 100;
}

export function computePrice(basePrice: number, tractionScore: number): number {
  // At score=50, price=base. At score=75, price=base*1.5
  const price = basePrice * (1 + 0.02 * (tractionScore - 50));
  return Math.round(price * 10000) / 10000;
}

export async function getSpreadBps(artistId: string): Promise<number> {
  // Check artist-specific risk controls first
  const [artistControl] = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.artistId, artistId))
    .limit(1);

  if (artistControl?.spreadBps) return artistControl.spreadBps;

  // Fall back to global
  const [globalControl] = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.isGlobal, true))
    .limit(1);

  return globalControl?.spreadBps ?? 500;
}

export async function getPriceQuote(artistId: string): Promise<PriceQuote> {
  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new Error('Artist not found');

  const mid = parseFloat(artist.currentPrice);
  const spreadBps = await getSpreadBps(artistId);
  const halfSpread = mid * (spreadBps / 10000 / 2);

  return {
    mid,
    bid: Math.round((mid - halfSpread) * 10000) / 10000,
    ask: Math.round((mid + halfSpread) * 10000) / 10000,
    spreadBps,
  };
}

export async function updateArtistPrice(
  artistId: string,
  components: TractionComponents
): Promise<{ tractionScore: number; computedPrice: number }> {
  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new Error('Artist not found');

  const tractionScore = computeTractionScore(components);
  const newPrice = computePrice(parseFloat(artist.basePrice), tractionScore);
  const spreadBps = await getSpreadBps(artistId);
  const halfSpread = newPrice * (spreadBps / 10000 / 2);

  const bid = Math.round((newPrice - halfSpread) * 10000) / 10000;
  const ask = Math.round((newPrice + halfSpread) * 10000) / 10000;

  await db.transaction(async (tx) => {
    // Check circuit breaker threshold
    const oldPrice = parseFloat(artist.currentPrice);
    const pctChange = Math.abs((newPrice - oldPrice) / oldPrice);

    const [control] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.artistId, artistId))
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
        .where(eq(artists.id, artistId));
    }

    await tx
      .update(artists)
      .set({
        currentPrice: newPrice.toString(),
        currentBid: bid.toString(),
        currentAsk: ask.toString(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    await tx.insert(tractionIndexSnapshots).values({
      artistId,
      albumVelocityScore: components.albumVelocity.toString(),
      catalogSizeScore: components.catalogSize.toString(),
      revenueGrowthScore: components.revenueGrowth.toString(),
      socialFollowersScore: components.socialFollowers.toString(),
      externalPopularityScore: components.externalPopularity.toString(),
      tractionScore: tractionScore.toString(),
      computedPrice: newPrice.toString(),
    });
  });

  return { tractionScore, computedPrice: newPrice };
}
