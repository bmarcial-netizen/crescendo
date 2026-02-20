/**
 * Seed artists with daily Chartmetric metrics.
 * Original 5 artists use real data; 13 new artists use synthetic data
 * generated from a seeded PRNG for deterministic reproducibility.
 *
 * Data range: ~30 days ending 2026-02-18.
 *
 * Usage: npx tsx src/db/seedChartmetric.ts
 */
import { db, client } from './index';
import { users, artists, ledgerAccounts, artistMetricSnapshots, tractionIndexSnapshots } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller Gaussian with mean=0, stddev=1 */
function gaussian(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// ── Artist definitions ────────────────────────────────────────────────────

interface ArtistDef {
  symbol: string;
  name: string;
  email: string;
  description: string;
  revenueSharePct: string;
  sharesOutstanding: number;
  maxShares: number;
  basePrice: string;
  /** If set, use synthetic data with these params */
  synthetic?: {
    baseListeners: number;     // Spotify monthly listeners starting point
    trendPct: number;          // Overall 30-day trend percentage
    volatility: number;        // Noise multiplier (0.01 = 1%)
  };
}

const ARTIST_DEFS: ArtistDef[] = [
  // ── Original artists (real data) ──
  {
    symbol: 'ESDK', name: 'EsDeeKid',
    email: 'esdeekid@seed.crescendo.io',
    description: 'Experimental hip-hop artist with 22M+ monthly listeners. Known for genre-bending production and raw lyricism.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
  },
  {
    symbol: 'BBDB', name: 'beabadoobee',
    email: 'beabadoobee@seed.crescendo.io',
    description: 'Filipino-British indie pop artist. Bedroom-pop breakout turned arena headliner with devoted fanbase.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
  },
  {
    symbol: 'JRJR', name: 'jane remover',
    email: 'janeremover@seed.crescendo.io',
    description: 'Hyperpop and shoegaze pioneer. Leading voice of the online experimental music scene.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
  },
  {
    symbol: 'MCTD', name: 'malcolm todd',
    email: 'malcolmtodd@seed.crescendo.io',
    description: 'Austin-based R&B vocalist crafting intimate, genre-bending soul music. Rapid streaming growth.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
  },
  {
    symbol: 'HLLS', name: '2hollis',
    email: '2hollis@seed.crescendo.io',
    description: 'Experimental hip-hop artist blending ambient production with raw lyricism. Rising underground presence.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
  },
  // ── New artists (synthetic data) ──
  {
    symbol: 'DCHI', name: 'Doechii',
    email: 'doechii@seed.crescendo.io',
    description: 'Grammy-nominated rapper/singer. Massive streaming presence.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 28_900_000, trendPct: 12, volatility: 0.008 },
  },
  {
    symbol: 'LNTH', name: 'Leon Thomas',
    email: 'leonthomas@seed.crescendo.io',
    description: 'R&B singer-songwriter and producer. Rising star with crossover appeal.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 14_000_000, trendPct: 9, volatility: 0.010 },
  },
  {
    symbol: 'IANN', name: 'iann dior',
    email: 'ianndior@seed.crescendo.io',
    description: 'Pop-punk / hip-hop crossover artist. Chart-proven hitmaker.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 8_800_000, trendPct: -2.5, volatility: 0.012 },
  },
  {
    symbol: 'MNIT', name: 'Men I Trust',
    email: 'menitrust@seed.crescendo.io',
    description: 'Canadian dream-pop/indie trio with a cult following.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 7_200_000, trendPct: 6, volatility: 0.009 },
  },
  {
    symbol: 'TZTO', name: 'Teezo Touchdown',
    email: 'teezotouchdown@seed.crescendo.io',
    description: 'Avant-garde rapper and visual artist. Genre-bending experimentalist.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 7_000_000, trendPct: 7, volatility: 0.015 },
  },
  {
    symbol: 'SNST', name: 'Snow Strippers',
    email: 'snowstrippers@seed.crescendo.io',
    description: 'Electronic / industrial pop duo. Fast-rising streaming numbers.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 5_900_000, trendPct: 14, volatility: 0.018 },
  },
  {
    symbol: 'YVTM', name: 'Yves Tumor',
    email: 'yvestumor@seed.crescendo.io',
    description: 'Experimental rock/art pop icon. Critical darling with devoted fanbase.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 5_300_000, trendPct: 5, volatility: 0.013 },
  },
  {
    symbol: 'JPEG', name: 'JPEGMAFIA',
    email: 'jpegmafia@seed.crescendo.io',
    description: 'Experimental hip-hop producer and MC. Underground icon.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 2_700_000, trendPct: 8.5, volatility: 0.020 },
  },
  {
    symbol: 'KGKR', name: 'King Krule',
    email: 'kingkrule@seed.crescendo.io',
    description: 'London-based artist blending jazz, punk, and electronic. Cult following.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 1_800_000, trendPct: 4, volatility: 0.016 },
  },
  {
    symbol: 'PRTX', name: 'Paris Texas',
    email: 'paristexas@seed.crescendo.io',
    description: 'Rap duo from Los Angeles. Raw, energetic, building a following.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 521_000, trendPct: 3.8, volatility: 0.025 },
  },
  {
    symbol: 'FENG', name: 'Feng Suave',
    email: 'fengsuave@seed.crescendo.io',
    description: 'Indie/neo-soul artist from the Netherlands. Smooth, chill vibes.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 416_000, trendPct: 1.5, volatility: 0.022 },
  },
  {
    symbol: 'DVBL', name: 'Dave Blunts',
    email: 'daveblunts@seed.crescendo.io',
    description: 'Viral vocalist and emerging artist. Explosive growth potential.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 207_000, trendPct: 22, volatility: 0.035 },
  },
  {
    symbol: 'TWLP', name: 'The Twolips',
    email: 'thetwolips@seed.crescendo.io',
    description: 'Emerging indie band. Very early stage with high upside potential.',
    revenueSharePct: '0.1000', sharesOutstanding: 1_000_000, maxShares: 2_000_000, basePrice: '1.0000',
    synthetic: { baseListeners: 1_400, trendPct: 35, volatility: 0.055 },
  },
];

// ── Synthetic data generator ──────────────────────────────────────────────

interface DailyRow {
  date: string;
  spotifyMonthlyListeners: number;
  spotifyFollowers: number;
  spotifyPopularity: number | null;
  playlistReach: number;
  tiktokFollowers: number;
  instagramFollowers: number;
  youtubeSubscribers: number;
  youtubeChannelViews: number;
  fanConversionRate: number;
  spotifyListenerToFollowerRatio: number;
}

function generateSyntheticDaily(
  symbol: string,
  baseListeners: number,
  trendPct: number,
  volatility: number,
  days: number = 30,
): DailyRow[] {
  const rng = mulberry32(hashStr(symbol + '_seed_v2'));

  // Derive starting metrics proportionally from listeners
  const followerRatio = 0.05 + rng() * 0.15; // 5-20% of listeners
  const baseFollowers = Math.round(baseListeners * followerRatio);
  const basePlaylistReach = Math.round(baseListeners * (2 + rng() * 8));
  const baseTiktok = Math.round(baseListeners * (0.02 + rng() * 0.15));
  const baseInstagram = Math.round(baseListeners * (0.03 + rng() * 0.12));
  const baseYtSubs = Math.round(baseListeners * (0.01 + rng() * 0.05));
  const baseYtViews = Math.round(baseYtSubs * (200 + rng() * 800));

  // Daily compound growth rate to hit trendPct over the period
  const dailyGrowth = Math.pow(1 + trendPct / 100, 1 / days);

  // Start date: 30 days before 2026-02-18
  const endDate = new Date('2026-02-18');
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const rows: DailyRow[] = [];

  // Running values for each metric
  let listeners = baseListeners;
  let followers = baseFollowers;
  let playlistReach = basePlaylistReach;
  let tiktok = baseTiktok;
  let instagram = baseInstagram;
  let ytSubs = baseYtSubs;
  let ytViews = baseYtViews;

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    if (d > 0) {
      // Apply growth + noise to each metric independently
      const noise = () => gaussian(rng) * volatility;

      listeners = Math.max(1, Math.round(listeners * (dailyGrowth + noise())));
      followers = Math.max(1, Math.round(followers * (1 + (dailyGrowth - 1) * 0.4 + noise() * 0.3)));
      playlistReach = Math.max(1, Math.round(playlistReach * (1 + (dailyGrowth - 1) * 1.2 + noise() * 0.8)));
      tiktok = Math.max(1, Math.round(tiktok * (1 + (dailyGrowth - 1) * 0.6 + noise() * 0.5)));
      instagram = Math.max(1, Math.round(instagram * (1 + (dailyGrowth - 1) * 0.5 + noise() * 0.4)));
      ytSubs = Math.max(1, Math.round(ytSubs * (1 + (dailyGrowth - 1) * 0.3 + noise() * 0.2)));
      ytViews = Math.max(1, Math.round(ytViews * (1 + (dailyGrowth - 1) * 0.8 + noise() * 0.3)));
    }

    const fanConversion = followers > 0 && listeners > 0
      ? Math.round((followers / listeners) * 1000000) / 1000000
      : 0;
    const listenerFollowerRatio = followers > 0
      ? Math.round((listeners / followers) * 1000000) / 1000000
      : 0;

    // Spotify popularity: log-scaled from listeners (0-100)
    const pop = Math.min(100, Math.max(0,
      Math.round(Math.log10(Math.max(listeners, 1)) / Math.log10(50_000_000) * 80 + gaussian(rng) * 2)
    ));

    rows.push({
      date: dateStr,
      spotifyMonthlyListeners: listeners,
      spotifyFollowers: followers,
      spotifyPopularity: pop,
      playlistReach: playlistReach,
      tiktokFollowers: tiktok,
      instagramFollowers: instagram,
      youtubeSubscribers: ytSubs,
      youtubeChannelViews: ytViews,
      fanConversionRate: fanConversion,
      spotifyListenerToFollowerRatio: listenerFollowerRatio,
    });
  }

  return rows;
}

// ── ESDK daily metrics (2026-01-20 → 2026-02-18) ─────────────────────────

const ESDK_DAILY: DailyRow[] = [
  { date: '2026-01-20', spotifyMonthlyListeners: 22375558, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06073907, spotifyListenerToFollowerRatio: 16.45967328 },
  { date: '2026-01-21', spotifyMonthlyListeners: 22411648, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06064156, spotifyListenerToFollowerRatio: 16.48617325 },
  { date: '2026-01-22', spotifyMonthlyListeners: 22452178, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06053203, spotifyListenerToFollowerRatio: 16.51699946 },
  { date: '2026-01-23', spotifyMonthlyListeners: 22492305, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06042390, spotifyListenerToFollowerRatio: 16.54729478 },
  { date: '2026-01-24', spotifyMonthlyListeners: 22533548, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06031297, spotifyListenerToFollowerRatio: 16.57794518 },
  { date: '2026-01-25', spotifyMonthlyListeners: 22575873, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06019934, spotifyListenerToFollowerRatio: 16.60901662 },
  { date: '2026-01-26', spotifyMonthlyListeners: 22617883, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.06008659, spotifyListenerToFollowerRatio: 16.63975762 },
  { date: '2026-01-27', spotifyMonthlyListeners: 22660432, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05997265, spotifyListenerToFollowerRatio: 16.67075761 },
  { date: '2026-01-28', spotifyMonthlyListeners: 22701750, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05986225, spotifyListenerToFollowerRatio: 16.70099625 },
  { date: '2026-01-29', spotifyMonthlyListeners: 22744863, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05974725, spotifyListenerToFollowerRatio: 16.73283966 },
  { date: '2026-01-30', spotifyMonthlyListeners: 22786440, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05963673, spotifyListenerToFollowerRatio: 16.76358504 },
  { date: '2026-01-31', spotifyMonthlyListeners: 22828918, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05952457, spotifyListenerToFollowerRatio: 16.79483148 },
  { date: '2026-02-01', spotifyMonthlyListeners: 22871553, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05941204, spotifyListenerToFollowerRatio: 16.82602251 },
  { date: '2026-02-02', spotifyMonthlyListeners: 22914356, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05929907, spotifyListenerToFollowerRatio: 16.85717144 },
  { date: '2026-02-03', spotifyMonthlyListeners: 22957664, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05918491, spotifyListenerToFollowerRatio: 16.88863191 },
  { date: '2026-02-04', spotifyMonthlyListeners: 23001089, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05907045, spotifyListenerToFollowerRatio: 16.92002223 },
  { date: '2026-02-05', spotifyMonthlyListeners: 23045027, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05895490, spotifyListenerToFollowerRatio: 16.95162534 },
  { date: '2026-02-06', spotifyMonthlyListeners: 23088551, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05884045, spotifyListenerToFollowerRatio: 16.98290827 },
  { date: '2026-02-07', spotifyMonthlyListeners: 23132847, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05872410, spotifyListenerToFollowerRatio: 17.01466755 },
  { date: '2026-02-08', spotifyMonthlyListeners: 23176340, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05860980, spotifyListenerToFollowerRatio: 17.04588161 },
  { date: '2026-02-09', spotifyMonthlyListeners: 23220406, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05849414, spotifyListenerToFollowerRatio: 17.07742091 },
  { date: '2026-02-10', spotifyMonthlyListeners: 23264858, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05837828, spotifyListenerToFollowerRatio: 17.10914162 },
  { date: '2026-02-11', spotifyMonthlyListeners: 23309052, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05826307, spotifyListenerToFollowerRatio: 17.14043888 },
  { date: '2026-02-12', spotifyMonthlyListeners: 23353490, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05814771, spotifyListenerToFollowerRatio: 17.17192994 },
  { date: '2026-02-13', spotifyMonthlyListeners: 23398429, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05803110, spotifyListenerToFollowerRatio: 17.20371878 },
  { date: '2026-02-14', spotifyMonthlyListeners: 23442762, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05791620, spotifyListenerToFollowerRatio: 17.23509034 },
  { date: '2026-02-15', spotifyMonthlyListeners: 23487487, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05780078, spotifyListenerToFollowerRatio: 17.26662584 },
  { date: '2026-02-16', spotifyMonthlyListeners: 23532368, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05768505, spotifyListenerToFollowerRatio: 17.29824356 },
  { date: '2026-02-17', spotifyMonthlyListeners: 23577307, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05756918, spotifyListenerToFollowerRatio: 17.32999310 },
  { date: '2026-02-18', spotifyMonthlyListeners: 23622192, spotifyFollowers: 1359275, spotifyPopularity: null, playlistReach: 150677777, tiktokFollowers: 905800, instagramFollowers: 1185926, youtubeSubscribers: 316000, youtubeChannelViews: 128609670, fanConversionRate: 0.05745343, spotifyListenerToFollowerRatio: 17.36168654 },
];

// ── BBDB daily metrics (2026-01-20 → 2026-02-18) ─────────────────────────

const BBDB_DAILY: DailyRow[] = [
  { date: '2026-01-20', spotifyMonthlyListeners: 6072858, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.24150580, spotifyListenerToFollowerRatio: 4.14071110 },
  { date: '2026-01-21', spotifyMonthlyListeners: 6081238, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.24117291, spotifyListenerToFollowerRatio: 4.14642415 },
  { date: '2026-01-22', spotifyMonthlyListeners: 6089412, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.24084925, spotifyListenerToFollowerRatio: 4.15201321 },
  { date: '2026-01-23', spotifyMonthlyListeners: 6097712, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.24052017, spotifyListenerToFollowerRatio: 4.15772711 },
  { date: '2026-01-24', spotifyMonthlyListeners: 6106032, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.24019188, spotifyListenerToFollowerRatio: 4.16339818 },
  { date: '2026-01-25', spotifyMonthlyListeners: 6114383, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23986240, spotifyListenerToFollowerRatio: 4.16908901 },
  { date: '2026-01-26', spotifyMonthlyListeners: 6122834, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23953091, spotifyListenerToFollowerRatio: 4.17483070 },
  { date: '2026-01-27', spotifyMonthlyListeners: 6131170, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23920551, spotifyListenerToFollowerRatio: 4.18050227 },
  { date: '2026-01-28', spotifyMonthlyListeners: 6139681, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23887219, spotifyListenerToFollowerRatio: 4.18629236 },
  { date: '2026-01-29', spotifyMonthlyListeners: 6148196, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23853956, spotifyListenerToFollowerRatio: 4.19205098 },
  { date: '2026-01-30', spotifyMonthlyListeners: 6156845, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23820243, spotifyListenerToFollowerRatio: 4.19795320 },
  { date: '2026-01-31', spotifyMonthlyListeners: 6165345, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23787192, spotifyListenerToFollowerRatio: 4.20378155 },
  { date: '2026-02-01', spotifyMonthlyListeners: 6173960, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23753687, spotifyListenerToFollowerRatio: 4.20969367 },
  { date: '2026-02-02', spotifyMonthlyListeners: 6182558, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23720249, spotifyListenerToFollowerRatio: 4.21558209 },
  { date: '2026-02-03', spotifyMonthlyListeners: 6191338, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23686170, spotifyListenerToFollowerRatio: 4.22160538 },
  { date: '2026-02-04', spotifyMonthlyListeners: 6200034, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23652402, spotifyListenerToFollowerRatio: 4.22758148 },
  { date: '2026-02-05', spotifyMonthlyListeners: 6208807, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23618343, spotifyListenerToFollowerRatio: 4.23362627 },
  { date: '2026-02-06', spotifyMonthlyListeners: 6217706, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23583829, spotifyListenerToFollowerRatio: 4.23981061 },
  { date: '2026-02-07', spotifyMonthlyListeners: 6226584, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23549400, spotifyListenerToFollowerRatio: 4.24595555 },
  { date: '2026-02-08', spotifyMonthlyListeners: 6235511, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23514835, spotifyListenerToFollowerRatio: 4.25215856 },
  { date: '2026-02-09', spotifyMonthlyListeners: 6244472, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23480218, spotifyListenerToFollowerRatio: 4.25838452 },
  { date: '2026-02-10', spotifyMonthlyListeners: 6253517, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23445234, spotifyListenerToFollowerRatio: 4.26472676 },
  { date: '2026-02-11', spotifyMonthlyListeners: 6262538, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23410342, spotifyListenerToFollowerRatio: 4.27101708 },
  { date: '2026-02-12', spotifyMonthlyListeners: 6271645, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23375128, spotifyListenerToFollowerRatio: 4.27742810 },
  { date: '2026-02-13', spotifyMonthlyListeners: 6280841, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23339600, spotifyListenerToFollowerRatio: 4.28396380 },
  { date: '2026-02-14', spotifyMonthlyListeners: 6290046, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23304039, spotifyListenerToFollowerRatio: 4.29046163 },
  { date: '2026-02-15', spotifyMonthlyListeners: 6299354, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23268091, spotifyListenerToFollowerRatio: 4.29709906 },
  { date: '2026-02-16', spotifyMonthlyListeners: 6308664, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23232145, spotifyListenerToFollowerRatio: 4.30369708 },
  { date: '2026-02-17', spotifyMonthlyListeners: 6317986, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23196155, spotifyListenerToFollowerRatio: 4.31030901 },
  { date: '2026-02-18', spotifyMonthlyListeners: 6327298, spotifyFollowers: 1466573, spotifyPopularity: 56, playlistReach: 172608777, tiktokFollowers: 1903314, instagramFollowers: 1819096, youtubeSubscribers: 719000, youtubeChannelViews: 471358431, fanConversionRate: 0.23160204, spotifyListenerToFollowerRatio: 4.31688356 },
];

// ── JRJR daily metrics (2026-01-21 → 2026-02-19) ─────────────────────────

const JRJR_DAILY: DailyRow[] = [
  { date: '2026-01-21', spotifyMonthlyListeners: 816431, spotifyFollowers: 204416, spotifyPopularity: null, playlistReach: 10180955, tiktokFollowers: 82933, instagramFollowers: 200232, youtubeSubscribers: 56300, youtubeChannelViews: 14704961, fanConversionRate: 0.250378, spotifyListenerToFollowerRatio: 3.993968 },
  { date: '2026-01-22', spotifyMonthlyListeners: 816433, spotifyFollowers: 204903, spotifyPopularity: null, playlistReach: 10184942, tiktokFollowers: 83200, instagramFollowers: 201097, youtubeSubscribers: 56400, youtubeChannelViews: 14756091, fanConversionRate: 0.250973, spotifyListenerToFollowerRatio: 3.984485 },
  { date: '2026-01-23', spotifyMonthlyListeners: 817058, spotifyFollowers: 205351, spotifyPopularity: null, playlistReach: 10231387, tiktokFollowers: 83400, instagramFollowers: 203895, youtubeSubscribers: 56500, youtubeChannelViews: 14807220, fanConversionRate: 0.251330, spotifyListenerToFollowerRatio: 3.978836 },
  { date: '2026-01-24', spotifyMonthlyListeners: 814922, spotifyFollowers: 205891, spotifyPopularity: null, playlistReach: 10252692, tiktokFollowers: 83678, instagramFollowers: 205197, youtubeSubscribers: 56600, youtubeChannelViews: 14858350, fanConversionRate: 0.252651, spotifyListenerToFollowerRatio: 3.958026 },
  { date: '2026-01-25', spotifyMonthlyListeners: 813518, spotifyFollowers: 206361, spotifyPopularity: null, playlistReach: 10253465, tiktokFollowers: 83956, instagramFollowers: 206248, youtubeSubscribers: 56700, youtubeChannelViews: 14913894, fanConversionRate: 0.253665, spotifyListenerToFollowerRatio: 3.942208 },
  { date: '2026-01-26', spotifyMonthlyListeners: 812114, spotifyFollowers: 206853, spotifyPopularity: null, playlistReach: 10265766, tiktokFollowers: 84234, instagramFollowers: 207297, youtubeSubscribers: 56800, youtubeChannelViews: 14969436, fanConversionRate: 0.254701, spotifyListenerToFollowerRatio: 3.926167 },
  { date: '2026-01-27', spotifyMonthlyListeners: 810710, spotifyFollowers: 207345, spotifyPopularity: null, playlistReach: 10274239, tiktokFollowers: 84512, instagramFollowers: 208347, youtubeSubscribers: 56900, youtubeChannelViews: 15024980, fanConversionRate: 0.255748, spotifyListenerToFollowerRatio: 3.910090 },
  { date: '2026-01-28', spotifyMonthlyListeners: 809306, spotifyFollowers: 207837, spotifyPopularity: null, playlistReach: 10276706, tiktokFollowers: 84789, instagramFollowers: 209396, youtubeSubscribers: 57000, youtubeChannelViews: 15080524, fanConversionRate: 0.256807, spotifyListenerToFollowerRatio: 3.893945 },
  { date: '2026-01-29', spotifyMonthlyListeners: 807902, spotifyFollowers: 208329, spotifyPopularity: null, playlistReach: 10280192, tiktokFollowers: 85067, instagramFollowers: 210445, youtubeSubscribers: 57100, youtubeChannelViews: 15136067, fanConversionRate: 0.257879, spotifyListenerToFollowerRatio: 3.877734 },
  { date: '2026-01-30', spotifyMonthlyListeners: 806498, spotifyFollowers: 208821, spotifyPopularity: null, playlistReach: 10267883, tiktokFollowers: 85345, instagramFollowers: 211495, youtubeSubscribers: 57200, youtubeChannelViews: 15191613, fanConversionRate: 0.258964, spotifyListenerToFollowerRatio: 3.861463 },
  { date: '2026-01-31', spotifyMonthlyListeners: 805094, spotifyFollowers: 209313, spotifyPopularity: null, playlistReach: 10248393, tiktokFollowers: 85623, instagramFollowers: 212545, youtubeSubscribers: 57300, youtubeChannelViews: 15247156, fanConversionRate: 0.260063, spotifyListenerToFollowerRatio: 3.845130 },
  { date: '2026-02-01', spotifyMonthlyListeners: 803690, spotifyFollowers: 209805, spotifyPopularity: null, playlistReach: 10203366, tiktokFollowers: 85900, instagramFollowers: 213594, youtubeSubscribers: 57400, youtubeChannelViews: 15302700, fanConversionRate: 0.261175, spotifyListenerToFollowerRatio: 3.828738 },
  { date: '2026-02-02', spotifyMonthlyListeners: 802286, spotifyFollowers: 210297, spotifyPopularity: null, playlistReach: 10165459, tiktokFollowers: 86178, instagramFollowers: 214644, youtubeSubscribers: 57500, youtubeChannelViews: 15358245, fanConversionRate: 0.262302, spotifyListenerToFollowerRatio: 3.812286 },
  { date: '2026-02-03', spotifyMonthlyListeners: 800882, spotifyFollowers: 210789, spotifyPopularity: null, playlistReach: 10101672, tiktokFollowers: 86456, instagramFollowers: 215693, youtubeSubscribers: 57600, youtubeChannelViews: 15413790, fanConversionRate: 0.263445, spotifyListenerToFollowerRatio: 3.795773 },
  { date: '2026-02-04', spotifyMonthlyListeners: 799478, spotifyFollowers: 211281, spotifyPopularity: null, playlistReach: 10059090, tiktokFollowers: 86734, instagramFollowers: 216743, youtubeSubscribers: 57700, youtubeChannelViews: 15469335, fanConversionRate: 0.264603, spotifyListenerToFollowerRatio: 3.779198 },
  { date: '2026-02-05', spotifyMonthlyListeners: 798074, spotifyFollowers: 211773, spotifyPopularity: null, playlistReach: 10017154, tiktokFollowers: 87012, instagramFollowers: 216771, youtubeSubscribers: 57800, youtubeChannelViews: 15524878, fanConversionRate: 0.265280, spotifyListenerToFollowerRatio: 3.769574 },
  { date: '2026-02-06', spotifyMonthlyListeners: 796670, spotifyFollowers: 212265, spotifyPopularity: null, playlistReach: 9972520, tiktokFollowers: 87289, instagramFollowers: 216771, youtubeSubscribers: 57900, youtubeChannelViews: 15580423, fanConversionRate: 0.266465, spotifyListenerToFollowerRatio: 3.753017 },
  { date: '2026-02-07', spotifyMonthlyListeners: 795266, spotifyFollowers: 212757, spotifyPopularity: null, playlistReach: 9944994, tiktokFollowers: 87567, instagramFollowers: 216771, youtubeSubscribers: 58000, youtubeChannelViews: 15635968, fanConversionRate: 0.267667, spotifyListenerToFollowerRatio: 3.736399 },
  { date: '2026-02-08', spotifyMonthlyListeners: 793862, spotifyFollowers: 213249, spotifyPopularity: null, playlistReach: 9922185, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58100, youtubeChannelViews: 15691513, fanConversionRate: 0.268887, spotifyListenerToFollowerRatio: 3.719718 },
  { date: '2026-02-09', spotifyMonthlyListeners: 792458, spotifyFollowers: 213741, spotifyPopularity: null, playlistReach: 9883085, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58200, youtubeChannelViews: 15747057, fanConversionRate: 0.269706, spotifyListenerToFollowerRatio: 3.708413 },
  { date: '2026-02-10', spotifyMonthlyListeners: 791054, spotifyFollowers: 214233, spotifyPopularity: null, playlistReach: 9851039, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58300, youtubeChannelViews: 15795186, fanConversionRate: 0.270809, spotifyListenerToFollowerRatio: 3.693281 },
  { date: '2026-02-11', spotifyMonthlyListeners: 789650, spotifyFollowers: 214725, spotifyPopularity: null, playlistReach: 9816507, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58400, youtubeChannelViews: 15843316, fanConversionRate: 0.271929, spotifyListenerToFollowerRatio: 3.678087 },
  { date: '2026-02-12', spotifyMonthlyListeners: 788246, spotifyFollowers: 215217, spotifyPopularity: null, playlistReach: 9785804, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58500, youtubeChannelViews: 15891444, fanConversionRate: 0.273065, spotifyListenerToFollowerRatio: 3.662833 },
  { date: '2026-02-13', spotifyMonthlyListeners: 786842, spotifyFollowers: 215709, spotifyPopularity: null, playlistReach: 9757944, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58600, youtubeChannelViews: 15939573, fanConversionRate: 0.274218, spotifyListenerToFollowerRatio: 3.647518 },
  { date: '2026-02-14', spotifyMonthlyListeners: 785438, spotifyFollowers: 216201, spotifyPopularity: null, playlistReach: 9718018, tiktokFollowers: 87845, instagramFollowers: 216771, youtubeSubscribers: 58700, youtubeChannelViews: 15987701, fanConversionRate: 0.275388, spotifyListenerToFollowerRatio: 3.632144 },
  { date: '2026-02-15', spotifyMonthlyListeners: 758140, spotifyFollowers: 216408, spotifyPopularity: null, playlistReach: 7934208, tiktokFollowers: 87607, instagramFollowers: 216528, youtubeSubscribers: 58800, youtubeChannelViews: 15806524, fanConversionRate: 0.285433, spotifyListenerToFollowerRatio: 3.503118 },
  { date: '2026-02-16', spotifyMonthlyListeners: 756792, spotifyFollowers: 216771, spotifyPopularity: null, playlistReach: 7910523, tiktokFollowers: 87671, instagramFollowers: 216878, youtubeSubscribers: 58900, youtubeChannelViews: 15904968, fanConversionRate: 0.286385, spotifyListenerToFollowerRatio: 3.491483 },
  { date: '2026-02-17', spotifyMonthlyListeners: 754993, spotifyFollowers: 217166, spotifyPopularity: null, playlistReach: 7900742, tiktokFollowers: 87736, instagramFollowers: 217228, youtubeSubscribers: 59000, youtubeChannelViews: 16003413, fanConversionRate: 0.287640, spotifyListenerToFollowerRatio: 3.476571 },
  { date: '2026-02-18', spotifyMonthlyListeners: 752038, spotifyFollowers: 217539, spotifyPopularity: null, playlistReach: 7912237, tiktokFollowers: 87800, instagramFollowers: 217578, youtubeSubscribers: 59100, youtubeChannelViews: 16003413, fanConversionRate: 0.289266, spotifyListenerToFollowerRatio: 3.457026 },
  { date: '2026-02-19', spotifyMonthlyListeners: 749082, spotifyFollowers: 217912, spotifyPopularity: null, playlistReach: 7909500, tiktokFollowers: 87800, instagramFollowers: 217928, youtubeSubscribers: 59100, youtubeChannelViews: 16003413, fanConversionRate: 0.290905, spotifyListenerToFollowerRatio: 3.437544 },
];

// ── MCTD daily metrics (2026-01-21 → 2026-02-19) ─────────────────────────

const MCTD_DAILY: DailyRow[] = [
  { date: '2026-01-21', spotifyMonthlyListeners: 12469599, spotifyFollowers: 1080333, spotifyPopularity: null, playlistReach: 41619951, tiktokFollowers: 925575, instagramFollowers: 498875, youtubeSubscribers: 275500, youtubeChannelViews: 138389860, fanConversionRate: 0.086637, spotifyListenerToFollowerRatio: 11.542366 },
  { date: '2026-01-22', spotifyMonthlyListeners: 12616196, spotifyFollowers: 1084077, spotifyPopularity: null, playlistReach: 46839839, tiktokFollowers: 927450, instagramFollowers: 499847, youtubeSubscribers: 276000, youtubeChannelViews: 138838770, fanConversionRate: 0.085927, spotifyListenerToFollowerRatio: 11.637731 },
  { date: '2026-01-23', spotifyMonthlyListeners: 12667212, spotifyFollowers: 1087698, spotifyPopularity: null, playlistReach: 47017191, tiktokFollowers: 929325, instagramFollowers: 500952, youtubeSubscribers: 276500, youtubeChannelViews: 139287660, fanConversionRate: 0.085867, spotifyListenerToFollowerRatio: 11.645891 },
  { date: '2026-01-24', spotifyMonthlyListeners: 12718227, spotifyFollowers: 1091318, spotifyPopularity: null, playlistReach: 46983975, tiktokFollowers: 931200, instagramFollowers: 502262, youtubeSubscribers: 277000, youtubeChannelViews: 139736580, fanConversionRate: 0.085807, spotifyListenerToFollowerRatio: 11.654006 },
  { date: '2026-01-25', spotifyMonthlyListeners: 12769242, spotifyFollowers: 1094936, spotifyPopularity: null, playlistReach: 46987452, tiktokFollowers: 933075, instagramFollowers: 503510, youtubeSubscribers: 277500, youtubeChannelViews: 140185500, fanConversionRate: 0.085748, spotifyListenerToFollowerRatio: 11.662080 },
  { date: '2026-01-26', spotifyMonthlyListeners: 12820257, spotifyFollowers: 1098566, spotifyPopularity: null, playlistReach: 46942916, tiktokFollowers: 934950, instagramFollowers: 504752, youtubeSubscribers: 278000, youtubeChannelViews: 140634420, fanConversionRate: 0.085689, spotifyListenerToFollowerRatio: 11.670024 },
  { date: '2026-01-27', spotifyMonthlyListeners: 12871272, spotifyFollowers: 1102190, spotifyPopularity: null, playlistReach: 46944073, tiktokFollowers: 936825, instagramFollowers: 505988, youtubeSubscribers: 278500, youtubeChannelViews: 141083320, fanConversionRate: 0.085631, spotifyListenerToFollowerRatio: 11.677960 },
  { date: '2026-01-28', spotifyMonthlyListeners: 12922287, spotifyFollowers: 1105812, spotifyPopularity: null, playlistReach: 46985353, tiktokFollowers: 938700, instagramFollowers: 507226, youtubeSubscribers: 279000, youtubeChannelViews: 141532250, fanConversionRate: 0.085573, spotifyListenerToFollowerRatio: 11.685887 },
  { date: '2026-01-29', spotifyMonthlyListeners: 12973302, spotifyFollowers: 1109436, spotifyPopularity: null, playlistReach: 46965874, tiktokFollowers: 940575, instagramFollowers: 508463, youtubeSubscribers: 279500, youtubeChannelViews: 141981140, fanConversionRate: 0.085515, spotifyListenerToFollowerRatio: 11.693803 },
  { date: '2026-01-30', spotifyMonthlyListeners: 13024317, spotifyFollowers: 1113061, spotifyPopularity: null, playlistReach: 47005542, tiktokFollowers: 942450, instagramFollowers: 509701, youtubeSubscribers: 280000, youtubeChannelViews: 142430070, fanConversionRate: 0.085458, spotifyListenerToFollowerRatio: 11.701710 },
  { date: '2026-01-31', spotifyMonthlyListeners: 13075332, spotifyFollowers: 1116683, spotifyPopularity: null, playlistReach: 46971919, tiktokFollowers: 944325, instagramFollowers: 510939, youtubeSubscribers: 280500, youtubeChannelViews: 142878980, fanConversionRate: 0.085401, spotifyListenerToFollowerRatio: 11.709604 },
  { date: '2026-02-01', spotifyMonthlyListeners: 13126347, spotifyFollowers: 1120309, spotifyPopularity: null, playlistReach: 46857555, tiktokFollowers: 946200, instagramFollowers: 512176, youtubeSubscribers: 281000, youtubeChannelViews: 143327900, fanConversionRate: 0.085344, spotifyListenerToFollowerRatio: 11.717492 },
  { date: '2026-02-02', spotifyMonthlyListeners: 13177362, spotifyFollowers: 1123930, spotifyPopularity: null, playlistReach: 46978318, tiktokFollowers: 948075, instagramFollowers: 513414, youtubeSubscribers: 281500, youtubeChannelViews: 143776820, fanConversionRate: 0.085288, spotifyListenerToFollowerRatio: 11.725370 },
  { date: '2026-02-03', spotifyMonthlyListeners: 13228377, spotifyFollowers: 1127553, spotifyPopularity: null, playlistReach: 47077356, tiktokFollowers: 949950, instagramFollowers: 514652, youtubeSubscribers: 282000, youtubeChannelViews: 144225740, fanConversionRate: 0.085232, spotifyListenerToFollowerRatio: 11.733240 },
  { date: '2026-02-04', spotifyMonthlyListeners: 13279392, spotifyFollowers: 1131182, spotifyPopularity: null, playlistReach: 47109837, tiktokFollowers: 951825, instagramFollowers: 515890, youtubeSubscribers: 282500, youtubeChannelViews: 144674660, fanConversionRate: 0.085177, spotifyListenerToFollowerRatio: 11.741090 },
  { date: '2026-02-05', spotifyMonthlyListeners: 13330407, spotifyFollowers: 1134807, spotifyPopularity: null, playlistReach: 47143261, tiktokFollowers: 953700, instagramFollowers: 517127, youtubeSubscribers: 283000, youtubeChannelViews: 145123580, fanConversionRate: 0.085122, spotifyListenerToFollowerRatio: 11.748935 },
  { date: '2026-02-06', spotifyMonthlyListeners: 13381422, spotifyFollowers: 1138430, spotifyPopularity: null, playlistReach: 47191595, tiktokFollowers: 955575, instagramFollowers: 518365, youtubeSubscribers: 283500, youtubeChannelViews: 145572500, fanConversionRate: 0.085067, spotifyListenerToFollowerRatio: 11.756771 },
  { date: '2026-02-07', spotifyMonthlyListeners: 13432437, spotifyFollowers: 1142060, spotifyPopularity: null, playlistReach: 47248659, tiktokFollowers: 957450, instagramFollowers: 519603, youtubeSubscribers: 284000, youtubeChannelViews: 146021420, fanConversionRate: 0.085013, spotifyListenerToFollowerRatio: 11.764587 },
  { date: '2026-02-08', spotifyMonthlyListeners: 13483452, spotifyFollowers: 1145686, spotifyPopularity: null, playlistReach: 47285130, tiktokFollowers: 959325, instagramFollowers: 520841, youtubeSubscribers: 284500, youtubeChannelViews: 146470340, fanConversionRate: 0.084959, spotifyListenerToFollowerRatio: 11.772398 },
  { date: '2026-02-09', spotifyMonthlyListeners: 13534467, spotifyFollowers: 1149304, spotifyPopularity: null, playlistReach: 47327447, tiktokFollowers: 961200, instagramFollowers: 522078, youtubeSubscribers: 285000, youtubeChannelViews: 146919260, fanConversionRate: 0.084905, spotifyListenerToFollowerRatio: 11.780203 },
  { date: '2026-02-10', spotifyMonthlyListeners: 13585482, spotifyFollowers: 1152930, spotifyPopularity: null, playlistReach: 47366754, tiktokFollowers: 963075, instagramFollowers: 523316, youtubeSubscribers: 285500, youtubeChannelViews: 147368180, fanConversionRate: 0.084852, spotifyListenerToFollowerRatio: 11.787988 },
  { date: '2026-02-11', spotifyMonthlyListeners: 13636497, spotifyFollowers: 1156552, spotifyPopularity: null, playlistReach: 47402943, tiktokFollowers: 964950, instagramFollowers: 524554, youtubeSubscribers: 286000, youtubeChannelViews: 147817100, fanConversionRate: 0.084799, spotifyListenerToFollowerRatio: 11.795772 },
  { date: '2026-02-12', spotifyMonthlyListeners: 13687512, spotifyFollowers: 1160180, spotifyPopularity: null, playlistReach: 47436158, tiktokFollowers: 966825, instagramFollowers: 525792, youtubeSubscribers: 286500, youtubeChannelViews: 148266020, fanConversionRate: 0.084746, spotifyListenerToFollowerRatio: 11.803537 },
  { date: '2026-02-13', spotifyMonthlyListeners: 13738527, spotifyFollowers: 1163804, spotifyPopularity: null, playlistReach: 47478870, tiktokFollowers: 968700, instagramFollowers: 527029, youtubeSubscribers: 287000, youtubeChannelViews: 148714940, fanConversionRate: 0.084694, spotifyListenerToFollowerRatio: 11.811297 },
  { date: '2026-02-14', spotifyMonthlyListeners: 13789542, spotifyFollowers: 1167421, spotifyPopularity: null, playlistReach: 47527968, tiktokFollowers: 970575, instagramFollowers: 528267, youtubeSubscribers: 287500, youtubeChannelViews: 149163860, fanConversionRate: 0.084642, spotifyListenerToFollowerRatio: 11.819043 },
  { date: '2026-02-15', spotifyMonthlyListeners: 13676234, spotifyFollowers: 1181364, spotifyPopularity: null, playlistReach: 49011043, tiktokFollowers: 999200, instagramFollowers: 537428, youtubeSubscribers: 290000, youtubeChannelViews: 149534060, fanConversionRate: 0.086402, spotifyListenerToFollowerRatio: 11.573809 },
  { date: '2026-02-16', spotifyMonthlyListeners: 13777135, spotifyFollowers: 1186056, spotifyPopularity: null, playlistReach: 48999429, tiktokFollowers: 999200, instagramFollowers: 539174, youtubeSubscribers: 290500, youtubeChannelViews: 150125890, fanConversionRate: 0.086069, spotifyListenerToFollowerRatio: 11.618631 },
  { date: '2026-02-17', spotifyMonthlyListeners: 13842929, spotifyFollowers: 1190508, spotifyPopularity: null, playlistReach: 48756310, tiktokFollowers: 999200, instagramFollowers: 540501, youtubeSubscribers: 291000, youtubeChannelViews: 150717700, fanConversionRate: 0.086001, spotifyListenerToFollowerRatio: 11.627750 },
  { date: '2026-02-18', spotifyMonthlyListeners: 13857432, spotifyFollowers: 1194631, spotifyPopularity: null, playlistReach: 48821494, tiktokFollowers: 999200, instagramFollowers: 542103, youtubeSubscribers: 292000, youtubeChannelViews: 150717700, fanConversionRate: 0.086209, spotifyListenerToFollowerRatio: 11.599759 },
  { date: '2026-02-19', spotifyMonthlyListeners: 13871936, spotifyFollowers: 1198753, spotifyPopularity: null, playlistReach: 48790088, tiktokFollowers: 999200, instagramFollowers: 556172, youtubeSubscribers: 293000, youtubeChannelViews: 150717700, fanConversionRate: 0.086416, spotifyListenerToFollowerRatio: 11.571972 },
];

// 2hollis (HLLS) — no metric data yet
const HLLS_DAILY: DailyRow[] = [];

// ── Build daily data map (real + synthetic) ───────────────────────────────

function buildDailyDataMap(): Record<string, DailyRow[]> {
  const map: Record<string, DailyRow[]> = {
    ESDK: ESDK_DAILY,
    BBDB: BBDB_DAILY,
    JRJR: JRJR_DAILY,
    MCTD: MCTD_DAILY,
    HLLS: HLLS_DAILY,
  };

  // Generate synthetic data for new artists
  for (const def of ARTIST_DEFS) {
    if (def.synthetic) {
      map[def.symbol] = generateSyntheticDaily(
        def.symbol,
        def.synthetic.baseListeners,
        def.synthetic.trendPct,
        def.synthetic.volatility,
      );
    }
  }

  return map;
}

// ── Fake artists to remove ─────────────────────────────────────────────
const FAKE_STAGE_NAMES = ['Marco Beats', 'Luna Vega', 'Sable Noir'];

// ── Main seed function ────────────────────────────────────────────────────

async function seedChartmetric() {
  console.log('=== Chartmetric Artist Seed ===\n');

  // ── 0. Remove fake artists ──────────────────────────────────────────────
  console.log('--- Removing fake artists ---');
  for (const fakeName of FAKE_STAGE_NAMES) {
    const [found] = await db
      .select({ id: artists.id, symbol: artists.symbol })
      .from(artists)
      .where(eq(artists.stageName, fakeName))
      .limit(1);

    if (found) {
      // Delete in FK order: traction → metric snapshots → artist
      await db.delete(tractionIndexSnapshots).where(eq(tractionIndexSnapshots.artistId, found.id));
      await db.delete(artistMetricSnapshots).where(eq(artistMetricSnapshots.artistId, found.id));
      await db.delete(artists).where(eq(artists.id, found.id));
      console.log(`  Removed "${fakeName}" (${found.symbol})`);
    } else {
      console.log(`  "${fakeName}" not found, skipping`);
    }
  }

  const DAILY_DATA = buildDailyDataMap();
  const passwordHash = await bcrypt.hash('seed1234', 10);
  const artistIdBySymbol: Record<string, string> = {};

  // ── 1. Create artist users + profiles ──────────────────────────────────
  for (const def of ARTIST_DEFS) {
    console.log(`--- ${def.symbol} (${def.name}) ---`);

    // Check for existing artist by symbol
    const [existingBySymbol] = await db
      .select()
      .from(artists)
      .where(eq(artists.symbol, def.symbol))
      .limit(1);

    if (existingBySymbol) {
      artistIdBySymbol[def.symbol] = existingBySymbol.id;
      console.log(`  Artist exists: ${existingBySymbol.id}`);
      continue;
    }

    // Create user
    let userId: string;
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, def.email))
      .limit(1);

    if (existingUser) {
      userId = existingUser.id;
      console.log(`  User exists: ${userId}`);
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          email: def.email,
          passwordHash,
          role: 'artist',
          displayName: def.name,
        })
        .returning();
      userId = newUser.id;
      console.log(`  Created user: ${userId}`);

      // Create wallet
      await db.insert(ledgerAccounts).values({
        name: `user:${userId}:wallet`,
        accountType: 'liability',
        userId,
      });
    }

    // Create artist
    const [newArtist] = await db
      .insert(artists)
      .values({
        userId,
        symbol: def.symbol,
        stageName: def.name,
        bio: def.description,
        basePrice: def.basePrice,
        currentPrice: def.basePrice,
        revenueSharePct: def.revenueSharePct,
        sharesOutstanding: def.sharesOutstanding,
        maxShares: def.maxShares,
      })
      .returning();

    artistIdBySymbol[def.symbol] = newArtist.id;
    console.log(`  Created artist: ${newArtist.id}`);
  }

  // ── 2. Insert daily metric snapshots ───────────────────────────────────
  console.log('\n--- Inserting daily metrics ---');

  for (const def of ARTIST_DEFS) {
    const artistId = artistIdBySymbol[def.symbol];
    const rows = DAILY_DATA[def.symbol] || [];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const capturedAt = new Date(row.date + 'T00:00:00Z');

      try {
        await db.insert(artistMetricSnapshots).values({
          artistId,
          source: 'chartmetric_manual',
          capturedAt,
          metricsJson: row as unknown as Record<string, unknown>,

          spotifyMonthlyListeners: row.spotifyMonthlyListeners.toString(),
          spotifyFollowers: row.spotifyFollowers.toString(),
          spotifyPopularity: row.spotifyPopularity?.toString() ?? null,
          playlistReach: row.playlistReach.toString(),
          tiktokFollowers: row.tiktokFollowers.toString(),
          instagramFollowers: row.instagramFollowers.toString(),
          youtubeSubscribers: row.youtubeSubscribers.toString(),
          youtubeChannelViews: row.youtubeChannelViews.toString(),
          fanConversionRate: row.fanConversionRate.toString(),
          spotifyListenerToFollowerRatio: row.spotifyListenerToFollowerRatio.toString(),
        });
        inserted++;
      } catch (err: any) {
        if (err.code === '23505' || err?.cause?.code === '23505') {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    console.log(`  ${def.symbol}: ${inserted} inserted, ${skipped} skipped (already exist)`);
  }

  // ── 3. Recompute daily prices from metrics (deterministic) ──────────────
  console.log('\n--- Recomputing daily prices from metrics ---');

  try {
    const { recomputeArtistBasePrices, getDailyCandles } = await import('../services/dailyPrice.service');
    await recomputeArtistBasePrices();

    for (const def of ARTIST_DEFS) {
      const artId = artistIdBySymbol[def.symbol];
      const candles = await getDailyCandles(artId);
      if (candles.length > 0) {
        const first = candles[0];
        const last = candles[candles.length - 1];
        const pctChange = first.c > 0 ? ((last.c - first.c) / first.c * 100).toFixed(2) : '0';
        console.log(`  ${def.symbol}: base=$${first.c.toFixed(4)}, latest=$${last.c.toFixed(4)}, change=${pctChange}% (${candles.length} days)`);
      } else {
        console.log(`  ${def.symbol}: no candle data`);
      }
    }
  } catch (err: any) {
    console.error('  Daily price recompute failed:', err.message);
  }

  // ── 4. Recompute traction index ────────────────────────────────────────
  console.log('\n--- Recomputing traction index ---');

  try {
    const { runTractionIndexForAll } = await import('../services/tractionIndex.service');
    const result = await runTractionIndexForAll();
    console.log(`  Computed ${result.computed} / ${result.cohortSize} artists`);
    for (const r of result.results) {
      console.log(`    ${r.artistId}: traction=${r.tractionIndex}, price=$${r.newPrice.toFixed(4)}, bid=$${r.bid.toFixed(4)}, ask=$${r.ask.toFixed(4)}`);
    }
  } catch (err: any) {
    console.error('  Traction index failed:', err.message);
  }

  // ── 5. FINAL: Re-apply deterministic prices & reset all circuit breakers
  console.log('\n--- Final price recompute & circuit breaker reset ---');

  try {
    const { recomputeArtistBasePrices: finalRecompute, getDailyCandles: finalCandles } = await import('../services/dailyPrice.service');
    await finalRecompute();

    for (const def of ARTIST_DEFS) {
      const artId = artistIdBySymbol[def.symbol];
      const candles = await finalCandles(artId);
      if (candles.length > 0) {
        const first = candles[0];
        const last = candles[candles.length - 1];
        const pctChange = first.c > 0 ? ((last.c - first.c) / first.c * 100).toFixed(2) : '0';
        console.log(`  ${def.symbol}: $${first.c.toFixed(4)} → $${last.c.toFixed(4)} (${pctChange}%) — breaker: closed`);
      }
    }
  } catch (err: any) {
    console.error('  Final recompute failed:', err.message);
  }

  console.log('\nChartmetric seed complete!');
  await client.end();
}

seedChartmetric().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
