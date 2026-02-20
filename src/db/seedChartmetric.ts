/**
 * Seed ESDK and BBDB artists with daily Chartmetric metrics.
 * Data range: 2026-01-20 → 2026-02-18 (30 days).
 *
 * Usage: npx tsx src/db/seedChartmetric.ts
 */
import { db, client } from './index';
import { users, artists, ledgerAccounts, artistMetricSnapshots } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
}

const ARTIST_DEFS: ArtistDef[] = [
  {
    symbol: 'ESDK',
    name: 'EsDeeKid',
    email: 'esdeekid@seed.crescendo.io',
    description: 'Seed artist for Crescendo markets (Chartmetric manual daily trends ingestion).',
    revenueSharePct: '0.1000',
    sharesOutstanding: 1_000_000,
    maxShares: 2_000_000,
    basePrice: '1.0000',
  },
  {
    symbol: 'BBDB',
    name: 'beabadoobee',
    email: 'beabadoobee@seed.crescendo.io',
    description: 'Seed artist for Crescendo markets (Chartmetric manual daily trends ingestion).',
    revenueSharePct: '0.1000',
    sharesOutstanding: 1_000_000,
    maxShares: 2_000_000,
    basePrice: '1.0000',
  },
];

// ── ESDK daily metrics (2026-01-20 → 2026-02-18) ─────────────────────────
// Note: ESDK has no spotifyPopularity data

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

const DAILY_DATA: Record<string, DailyRow[]> = {
  ESDK: ESDK_DAILY,
  BBDB: BBDB_DAILY,
};

// ── Main seed function ────────────────────────────────────────────────────

async function seedChartmetric() {
  console.log('=== Chartmetric Artist Seed ===\n');

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
    const rows = DAILY_DATA[def.symbol];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const capturedAt = new Date(row.date + 'T00:00:00Z');

      // Check for existing snapshot on this date (using unique index)
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
        if (err.code === '23505') {
          // Unique constraint violation — row already exists
          skipped++;
        } else {
          throw err;
        }
      }
    }

    console.log(`  ${def.symbol}: ${inserted} inserted, ${skipped} skipped (already exist)`);
  }

  // ── 3. Recompute traction index ────────────────────────────────────────
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

  console.log('\nChartmetric seed complete!');
  await client.end();
}

seedChartmetric().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
