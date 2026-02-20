import { describe, it, expect } from 'vitest';
import { getIntervalStart, initCandle, updateCandle, CandleData } from './candle';

// ── getIntervalStart ────────────────────────────────────────────────────────

describe('getIntervalStart', () => {
  it('truncates to hour for 1h interval', () => {
    const time = new Date('2026-02-19T14:37:22.000Z');
    const start = getIntervalStart(time, '1h');
    expect(start.toISOString()).toBe('2026-02-19T14:00:00.000Z');
  });

  it('truncates to day for 1d interval', () => {
    const time = new Date('2026-02-19T14:37:22.000Z');
    const start = getIntervalStart(time, '1d');
    expect(start.toISOString()).toBe('2026-02-19T00:00:00.000Z');
  });

  it('already-truncated time stays the same', () => {
    const time = new Date('2026-02-19T14:00:00.000Z');
    const start = getIntervalStart(time, '1h');
    expect(start.toISOString()).toBe('2026-02-19T14:00:00.000Z');
  });
});

// ── initCandle ──────────────────────────────────────────────────────────────

describe('initCandle', () => {
  it('creates a candle with all fields set to the first trade', () => {
    const candle = initCandle(1.05, 100);
    expect(candle.open).toBe(1.05);
    expect(candle.high).toBe(1.05);
    expect(candle.low).toBe(1.05);
    expect(candle.close).toBe(1.05);
    expect(candle.volume).toBe(100);
    expect(candle.tradeCount).toBe(1);
  });
});

// ── updateCandle ────────────────────────────────────────────────────────────

describe('updateCandle', () => {
  const firstCandle: CandleData = initCandle(1.00, 50);

  it('open remains the first trade price', () => {
    const updated = updateCandle(firstCandle, 1.10, 30);
    expect(updated.open).toBe(1.00);
  });

  it('close becomes the latest trade price', () => {
    const updated = updateCandle(firstCandle, 1.10, 30);
    expect(updated.close).toBe(1.10);
  });

  it('high is updated when new price is higher', () => {
    const updated = updateCandle(firstCandle, 1.10, 30);
    expect(updated.high).toBe(1.10);
  });

  it('low is updated when new price is lower', () => {
    const updated = updateCandle(firstCandle, 0.90, 30);
    expect(updated.low).toBe(0.90);
  });

  it('high is preserved when new price is not higher', () => {
    const withHigh: CandleData = { ...firstCandle, high: 1.20 };
    const updated = updateCandle(withHigh, 1.10, 30);
    expect(updated.high).toBe(1.20);
  });

  it('low is preserved when new price is not lower', () => {
    const withLow: CandleData = { ...firstCandle, low: 0.80 };
    const updated = updateCandle(withLow, 0.90, 30);
    expect(updated.low).toBe(0.80);
  });

  it('volume accumulates across trades', () => {
    let candle = initCandle(1.00, 50);
    candle = updateCandle(candle, 1.05, 30);
    candle = updateCandle(candle, 0.95, 20);
    expect(candle.volume).toBe(100); // 50 + 30 + 20
    expect(candle.tradeCount).toBe(3);
  });

  it('full scenario: 4 trades produce correct OHLCV', () => {
    // Trade 1: open at $1.00, qty 10
    let candle = initCandle(1.00, 10);
    // Trade 2: price rises to $1.15, qty 20
    candle = updateCandle(candle, 1.15, 20);
    // Trade 3: price drops to $0.90, qty 15
    candle = updateCandle(candle, 0.90, 15);
    // Trade 4: price recovers to $1.05, qty 5
    candle = updateCandle(candle, 1.05, 5);

    expect(candle.open).toBe(1.00);   // first trade
    expect(candle.high).toBe(1.15);   // trade 2
    expect(candle.low).toBe(0.90);    // trade 3
    expect(candle.close).toBe(1.05);  // last trade
    expect(candle.volume).toBe(50);   // 10+20+15+5
    expect(candle.tradeCount).toBe(4);
  });
});
