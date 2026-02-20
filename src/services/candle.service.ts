import { db } from '../db';
import { artistCandles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getIntervalStart } from '../model/candle';

/**
 * Record a trade into the OHLCV candle for the current interval.
 * Upserts: creates candle on first trade of the interval, updates thereafter.
 *
 * Called fire-and-forget after each successful trade.
 */
export async function recordTradeCandle(
  artistId: string,
  price: number,
  quantity: number,
  tradeTime: Date = new Date(),
  interval: string = '1h',
): Promise<void> {
  const startTime = getIntervalStart(tradeTime, interval);

  const [existing] = await db
    .select()
    .from(artistCandles)
    .where(
      and(
        eq(artistCandles.artistId, artistId),
        eq(artistCandles.interval, interval),
        eq(artistCandles.startTime, startTime),
      )
    )
    .limit(1);

  if (existing) {
    const newHigh = Math.max(parseFloat(existing.high), price);
    const newLow = Math.min(parseFloat(existing.low), price);

    await db
      .update(artistCandles)
      .set({
        high: newHigh.toString(),
        low: newLow.toString(),
        close: price.toString(),
        volume: existing.volume + quantity,
        tradeCount: existing.tradeCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(artistCandles.id, existing.id));
  } else {
    await db.insert(artistCandles).values({
      artistId,
      interval,
      startTime,
      open: price.toString(),
      high: price.toString(),
      low: price.toString(),
      close: price.toString(),
      volume: quantity,
      tradeCount: 1,
    });
  }
}
