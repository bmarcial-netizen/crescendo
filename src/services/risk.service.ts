import { db } from '../db';
import {
  artists,
  riskControls,
  investorPositions,
  tradeCooldowns,
  dailyTradeTracking,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  RiskLimitError,
  CircuitBreakerError,
  CooldownError,
} from '../utils/errors';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface RiskCheckParams {
  userId: string;
  artistId: string;
  quantity: number;
  totalCost: number;
  side: 'buy' | 'sell';
}

export async function runRiskChecks(tx: Tx, params: RiskCheckParams) {
  const { userId, artistId, quantity, totalCost, side } = params;

  // Fetch artist
  const [artist] = await tx.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  if (!artist) throw new RiskLimitError('Artist not found');

  // 1. Circuit breaker check
  if (artist.circuitBreakerStatus === 'tripped') {
    throw new CircuitBreakerError(artist.stageName);
  }

  // Get risk controls (artist-specific or global)
  const [artistControl] = await tx
    .select()
    .from(riskControls)
    .where(eq(riskControls.artistId, artistId))
    .limit(1);

  const [globalControl] = await tx
    .select()
    .from(riskControls)
    .where(eq(riskControls.isGlobal, true))
    .limit(1);

  const control = artistControl || globalControl;
  if (!control) return; // No risk controls configured

  // Get current position
  const [position] = await tx
    .select()
    .from(investorPositions)
    .where(
      and(
        eq(investorPositions.userId, userId),
        eq(investorPositions.artistId, artistId)
      )
    )
    .limit(1);

  const currentShares = position?.sharesHeld ?? 0;

  if (side === 'buy') {
    // 2. Position cap (absolute)
    if (control.maxPositionShares) {
      if (currentShares + quantity > control.maxPositionShares) {
        throw new RiskLimitError(
          `Position cap exceeded: ${currentShares + quantity} > ${control.maxPositionShares} max shares`
        );
      }
    }

    // 3. Position cap (%)
    if (control.maxPositionPct && artist.sharesOutstanding > 0) {
      const newPct = (currentShares + quantity) / artist.sharesOutstanding;
      if (newPct > parseFloat(control.maxPositionPct)) {
        throw new RiskLimitError(
          `Position % cap exceeded: ${(newPct * 100).toFixed(1)}% > ${(parseFloat(control.maxPositionPct) * 100).toFixed(1)}% max`
        );
      }
    }
  }

  if (side === 'sell') {
    if (currentShares < quantity) {
      throw new RiskLimitError(
        `Insufficient shares: holding ${currentShares}, trying to sell ${quantity}`
      );
    }
  }

  // 4. Daily trade cap
  const today = new Date().toISOString().slice(0, 10);
  const [dailyTrack] = await tx
    .select()
    .from(dailyTradeTracking)
    .where(
      and(
        eq(dailyTradeTracking.userId, userId),
        eq(dailyTradeTracking.artistId, artistId),
        eq(dailyTradeTracking.tradeDate, today)
      )
    )
    .limit(1);

  const tradedSharesToday = dailyTrack?.totalSharesTraded ?? 0;
  const tradedUsdToday = parseFloat(dailyTrack?.totalUsdTraded ?? '0');

  if (control.dailyTradeCapShares) {
    if (tradedSharesToday + quantity > control.dailyTradeCapShares) {
      throw new RiskLimitError(
        `Daily share cap exceeded: ${tradedSharesToday + quantity} > ${control.dailyTradeCapShares}`
      );
    }
  }

  if (control.dailyTradeCapUsd) {
    if (tradedUsdToday + totalCost > parseFloat(control.dailyTradeCapUsd)) {
      throw new RiskLimitError(
        `Daily USD cap exceeded: $${(tradedUsdToday + totalCost).toFixed(2)} > $${control.dailyTradeCapUsd}`
      );
    }
  }

  // 5. Cooldown check
  if (control.cooldownMinutes && control.cooldownMinutes > 0) {
    const [cooldown] = await tx
      .select()
      .from(tradeCooldowns)
      .where(
        and(
          eq(tradeCooldowns.userId, userId),
          eq(tradeCooldowns.artistId, artistId)
        )
      )
      .limit(1);

    if (cooldown && new Date(cooldown.cooldownExpiresAt) > new Date()) {
      throw new CooldownError(new Date(cooldown.cooldownExpiresAt));
    }
  }
}
