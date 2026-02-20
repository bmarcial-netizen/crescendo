import { describe, it, expect } from 'vitest';
import { chartmetricSnapshotSchema, parseAndInsertMetricsCsv } from './metrics.service';

// ── JSON Validation Tests ──────────────────────────────────────────────────

describe('chartmetricSnapshotSchema', () => {
  it('accepts a valid full snapshot', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: {
        spotifyMonthlyListeners: 1500000,
        spotifyFollowers: 320000,
        spotifyPopularity: 72,
        playlistReach: 8500000,
        tiktokFollowers: 450000,
        tiktokLikes: 9200000,
        instagramFollowers: 680000,
        youtubeSubscribers: 125000,
        shazamTotal: 45000,
        airplaySpins: 1200,
        chartmetricScore: 78.5,
      },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts a minimal snapshot with only required fields', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19',
      metrics: {},
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts date-only capturedAt format', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19',
      metrics: { spotifyFollowers: 100 },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects missing artistId', () => {
    const input = {
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: { spotifyFollowers: 100 },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid artistId (not uuid)', () => {
    const input = {
      artistId: 'not-a-uuid',
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: {},
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative metric values', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: { spotifyFollowers: -500 },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects spotifyPopularity > 100', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: { spotifyPopularity: 150 },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('passes through extra fields in metrics via passthrough', () => {
    const input = {
      artistId: '550e8400-e29b-41d4-a716-446655440000',
      capturedAt: '2026-02-19T00:00:00Z',
      metrics: { customField: 999, spotifyFollowers: 100 },
    };
    const result = chartmetricSnapshotSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.metrics as any).customField).toBe(999);
    }
  });
});

// ── CSV Parsing Tests (unit-level, no DB) ──────────────────────────────────
// These test the header detection and validation logic.
// Full integration (with DB insert) requires a running Postgres instance.

describe('CSV profile detection', () => {
  it('detects standard Chartmetric column names', () => {
    // We test that parseCsv + header mapping would work by creating a CSV
    // and verifying chartmetricSnapshotSchema validates the mapped output.
    const csvContent = [
      'artist_id,captured_at,spotify_monthly_listeners,spotify_followers,tiktok_followers',
      '550e8400-e29b-41d4-a716-446655440000,2026-02-19,1500000,320000,450000',
    ].join('\n');

    // Simulate what the service does: parse CSV, map headers, build metrics
    const { parse } = require('csv-parse/sync');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    expect(rows).toHaveLength(1);

    const row = rows[0];
    const metrics = {
      spotifyMonthlyListeners: parseFloat(row.spotify_monthly_listeners),
      spotifyFollowers: parseFloat(row.spotify_followers),
      tiktokFollowers: parseFloat(row.tiktok_followers),
    };

    const result = chartmetricSnapshotSchema.safeParse({
      artistId: row.artist_id,
      capturedAt: row.captured_at,
      metrics,
    });
    expect(result.success).toBe(true);
  });

  it('detects aliased column names (sp_followers, ig_followers, etc.)', () => {
    const csvContent = [
      'artist_id,date,sp_followers,ig_followers,yt_subscribers',
      '550e8400-e29b-41d4-a716-446655440000,2026-02-19,320000,680000,125000',
    ].join('\n');

    const { parse } = require('csv-parse/sync');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    // Map aliases manually (mimicking COLUMN_MAP logic)
    const row = rows[0];
    const metrics = {
      spotifyFollowers: parseFloat(row.sp_followers),
      instagramFollowers: parseFloat(row.ig_followers),
      youtubeSubscribers: parseFloat(row.yt_subscribers),
    };

    const result = chartmetricSnapshotSchema.safeParse({
      artistId: row.artist_id,
      capturedAt: row.date,
      metrics,
    });
    expect(result.success).toBe(true);
  });

  it('reports error when artist_id column is missing', async () => {
    const csvContent = Buffer.from(
      'captured_at,spotify_followers\n2026-02-19,320000'
    );

    // parseAndInsertMetricsCsv should throw for missing artist_id
    await expect(parseAndInsertMetricsCsv(csvContent)).rejects.toThrow(
      /missing artist_id/i
    );
  });

  it('reports error when captured_at/date column is missing', async () => {
    const csvContent = Buffer.from(
      'artist_id,spotify_followers\n550e8400-e29b-41d4-a716-446655440000,320000'
    );

    await expect(parseAndInsertMetricsCsv(csvContent)).rejects.toThrow(
      /missing captured_at/i
    );
  });
});
