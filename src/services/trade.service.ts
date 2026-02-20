import { db } from '../db';
import {
  artists,
  orders,
  investorPositions,
  tradeCooldowns,
  dailyTradeTracking,
  riskControls,
  ledgerAccounts,
} from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createDoubleEntry, getUserWalletAccount, getPlatformAccount } from './ledger.service';
import { getPriceQuote, getSpreadBps } from './pricing.service';
import { runRiskChecks } from './risk.service';
import { checkPriceBand, PRICE_BAND_PCT } from '../model/priceGuard';
import { recordTradeCandle } from './candle.service';
import {
  NotFoundError,
  InsufficientFundsError,
  BadRequestError,
  PriceBandError,
} from '../utils/errors';
import { config } from '../config';

export async function executeBuy(userId: string, artistId: string, quantity: number) {
  if (quantity <= 0) throw new BadRequestError('Quantity must be positive');

  const quote = await getPriceQuote(artistId);
  const totalCost = Math.round(quote.ask * quantity * 10000) / 10000;
  const spreadRevenue = Math.round((quote.ask - quote.mid) * quantity * 10000) / 10000;

  const result = await db.transaction(async (tx) => {
    // Lock artist row
    const [artist] = await tx
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .for('update')
      .limit(1);

    if (!artist) throw new NotFoundError('Artist not found');

    // Price band check: ensure fill price hasn't drifted from locked reference
    const referencePrice = parseFloat(artist.currentPrice);
    const bandCheck = checkPriceBand(quote.ask, referencePrice);
    if (!bandCheck.allowed) {
      throw new PriceBandError(quote.ask, referencePrice, bandCheck.deviation, PRICE_BAND_PCT);
    }

    // Run risk checks
    await runRiskChecks(tx, { userId, artistId, quantity, totalCost, side: 'buy' });

    // Get wallet and check balance
    const walletName = `user:${userId}:wallet`;
    let [wallet] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, walletName))
      .limit(1);

    if (!wallet) throw new NotFoundError('Wallet not found');

    // Auto-credit wallets stuck at $0 (users registered before starting balance was wired up)
    if (parseFloat(wallet.balance) === 0) {
      await tx
        .update(ledgerAccounts)
        .set({ balance: config.defaultStartingBalance })
        .where(eq(ledgerAccounts.id, wallet.id));
      [wallet] = await tx
        .select()
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.id, wallet.id))
        .limit(1);
    }

    if (parseFloat(wallet.balance) < totalCost) {
      throw new InsufficientFundsError(`Need $${totalCost.toFixed(4)}, have $${wallet.balance}`);
    }

    const [platformCash] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, 'platform:cash'))
      .limit(1);

    const [spreadAccount] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, 'platform:spread-revenue'))
      .limit(1);

    // Ledger entry: user wallet → platform cash (full cost at ask)
    const txnId = await createDoubleEntry(tx, {
      debitAccountId: wallet.id,
      creditAccountId: platformCash.id,
      amount: totalCost.toString(),
      txnType: 'share_purchase',
      description: `Buy ${quantity} shares of ${artist.stageName} @ $${quote.ask}`,
    });

    // Ledger entry: platform cash → spread revenue (spread portion)
    if (spreadRevenue > 0) {
      await createDoubleEntry(tx, {
        debitAccountId: platformCash.id,
        creditAccountId: spreadAccount.id,
        amount: spreadRevenue.toString(),
        txnType: 'spread_revenue',
        description: `Spread revenue on ${quantity} shares of ${artist.stageName}`,
      });
    }

    // Upsert investor position
    const [existingPos] = await tx
      .select()
      .from(investorPositions)
      .where(
        and(
          eq(investorPositions.userId, userId),
          eq(investorPositions.artistId, artistId)
        )
      )
      .limit(1);

    if (existingPos) {
      const oldTotal = existingPos.sharesHeld * parseFloat(existingPos.avgCostBasis);
      const newTotal = oldTotal + totalCost;
      const newShares = existingPos.sharesHeld + quantity;
      const newAvg = newTotal / newShares;

      await tx
        .update(investorPositions)
        .set({
          sharesHeld: newShares,
          avgCostBasis: newAvg.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(investorPositions.id, existingPos.id));
    } else {
      await tx.insert(investorPositions).values({
        userId,
        artistId,
        sharesHeld: quantity,
        avgCostBasis: quote.ask.toFixed(4),
      });
    }

    // Update cooldown
    const [control] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.artistId, artistId))
      .limit(1);
    const [globalControl] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.isGlobal, true))
      .limit(1);
    const cooldownMinutes = control?.cooldownMinutes ?? globalControl?.cooldownMinutes ?? 0;

    if (cooldownMinutes > 0) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + cooldownMinutes * 60000);

      await tx
        .insert(tradeCooldowns)
        .values({ userId, artistId, lastTradeAt: now, cooldownExpiresAt: expiresAt })
        .onConflictDoUpdate({
          target: [tradeCooldowns.userId, tradeCooldowns.artistId],
          set: { lastTradeAt: now, cooldownExpiresAt: expiresAt },
        });
    }

    // Update daily tracking
    const today = new Date().toISOString().slice(0, 10);
    await tx
      .insert(dailyTradeTracking)
      .values({
        userId,
        artistId,
        tradeDate: today,
        totalSharesTraded: quantity,
        totalUsdTraded: totalCost.toString(),
      })
      .onConflictDoUpdate({
        target: [dailyTradeTracking.userId, dailyTradeTracking.artistId, dailyTradeTracking.tradeDate],
        set: {
          totalSharesTraded: sql`${dailyTradeTracking.totalSharesTraded} + ${quantity}`,
          totalUsdTraded: sql`${dailyTradeTracking.totalUsdTraded} + ${totalCost}::decimal`,
        },
      });

    // Insert order
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        artistId,
        side: 'buy',
        quantity,
        pricePerShare: quote.ask.toString(),
        totalAmount: totalCost.toString(),
        spreadAmount: spreadRevenue.toString(),
        status: 'filled',
        ledgerTransactionId: txnId,
      })
      .returning();

    return order;
  });

  // Fire-and-forget: record OHLCV candle for this trade
  recordTradeCandle(artistId, quote.ask, quantity).catch((err) =>
    console.error('Candle update failed (buy):', err)
  );

  return result;
}

export async function executeSell(userId: string, artistId: string, quantity: number) {
  if (quantity <= 0) throw new BadRequestError('Quantity must be positive');

  const quote = await getPriceQuote(artistId);
  const totalProceeds = Math.round(quote.bid * quantity * 10000) / 10000;
  const spreadRevenue = Math.round((quote.mid - quote.bid) * quantity * 10000) / 10000;

  const result = await db.transaction(async (tx) => {
    // Lock artist row
    const [artist] = await tx
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .for('update')
      .limit(1);

    if (!artist) throw new NotFoundError('Artist not found');

    // Price band check: ensure fill price hasn't drifted from locked reference
    const referencePrice = parseFloat(artist.currentPrice);
    const bandCheck = checkPriceBand(quote.bid, referencePrice);
    if (!bandCheck.allowed) {
      throw new PriceBandError(quote.bid, referencePrice, bandCheck.deviation, PRICE_BAND_PCT);
    }

    // Run risk checks
    await runRiskChecks(tx, { userId, artistId, quantity, totalCost: totalProceeds, side: 'sell' });

    const walletName = `user:${userId}:wallet`;
    const [wallet] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, walletName))
      .limit(1);

    if (!wallet) throw new NotFoundError('Wallet not found');

    const [platformCash] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, 'platform:cash'))
      .limit(1);

    const [spreadAccount] = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, 'platform:spread-revenue'))
      .limit(1);

    // Ledger entry: platform cash → user wallet (proceeds at bid)
    const txnId = await createDoubleEntry(tx, {
      debitAccountId: platformCash.id,
      creditAccountId: wallet.id,
      amount: totalProceeds.toString(),
      txnType: 'share_sale',
      description: `Sell ${quantity} shares of ${artist.stageName} @ $${quote.bid}`,
    });

    // Spread revenue
    if (spreadRevenue > 0) {
      await createDoubleEntry(tx, {
        debitAccountId: platformCash.id,
        creditAccountId: spreadAccount.id,
        amount: spreadRevenue.toString(),
        txnType: 'spread_revenue',
        description: `Spread revenue on sell ${quantity} shares of ${artist.stageName}`,
      });
    }

    // Update investor position
    const [pos] = await tx
      .select()
      .from(investorPositions)
      .where(
        and(
          eq(investorPositions.userId, userId),
          eq(investorPositions.artistId, artistId)
        )
      )
      .limit(1);

    if (!pos) throw new BadRequestError('No position found');
    if (pos.sharesHeld < quantity) {
      throw new BadRequestError(`Insufficient shares: you hold ${pos.sharesHeld}, tried to sell ${quantity}`);
    }

    const newShares = pos.sharesHeld - quantity;
    await tx
      .update(investorPositions)
      .set({
        sharesHeld: newShares,
        updatedAt: new Date(),
      })
      .where(eq(investorPositions.id, pos.id));

    // Update cooldown
    const [control] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.artistId, artistId))
      .limit(1);
    const [globalControl] = await tx
      .select()
      .from(riskControls)
      .where(eq(riskControls.isGlobal, true))
      .limit(1);
    const cooldownMinutes = control?.cooldownMinutes ?? globalControl?.cooldownMinutes ?? 0;

    if (cooldownMinutes > 0) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + cooldownMinutes * 60000);
      await tx
        .insert(tradeCooldowns)
        .values({ userId, artistId, lastTradeAt: now, cooldownExpiresAt: expiresAt })
        .onConflictDoUpdate({
          target: [tradeCooldowns.userId, tradeCooldowns.artistId],
          set: { lastTradeAt: now, cooldownExpiresAt: expiresAt },
        });
    }

    // Update daily tracking
    const today = new Date().toISOString().slice(0, 10);
    await tx
      .insert(dailyTradeTracking)
      .values({
        userId,
        artistId,
        tradeDate: today,
        totalSharesTraded: quantity,
        totalUsdTraded: totalProceeds.toString(),
      })
      .onConflictDoUpdate({
        target: [dailyTradeTracking.userId, dailyTradeTracking.artistId, dailyTradeTracking.tradeDate],
        set: {
          totalSharesTraded: sql`${dailyTradeTracking.totalSharesTraded} + ${quantity}`,
          totalUsdTraded: sql`${dailyTradeTracking.totalUsdTraded} + ${totalProceeds}::decimal`,
        },
      });

    // Insert order
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        artistId,
        side: 'sell',
        quantity,
        pricePerShare: quote.bid.toString(),
        totalAmount: totalProceeds.toString(),
        spreadAmount: spreadRevenue.toString(),
        status: 'filled',
        ledgerTransactionId: txnId,
      })
      .returning();

    return order;
  });

  // Fire-and-forget: record OHLCV candle for this trade
  recordTradeCandle(artistId, quote.bid, quantity).catch((err) =>
    console.error('Candle update failed (sell):', err)
  );

  return result;
}
