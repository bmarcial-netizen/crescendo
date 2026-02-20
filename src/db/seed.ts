import { db, client } from './index';
import {
  users,
  artists,
  ledgerAccounts,
  riskControls,
  artistMetricSnapshots,
} from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('=== Crescendo Seed ===\n');

  // ── 1. Platform ledger accounts ──────────────────────────────────────────
  console.log('1. Platform ledger accounts');

  const platformAccounts = [
    { name: 'platform:cash', accountType: 'asset' as const },
    { name: 'platform:spread-revenue', accountType: 'revenue' as const },
    { name: 'platform:fee-revenue', accountType: 'revenue' as const },
  ];

  for (const acct of platformAccounts) {
    const existing = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.name, acct.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(ledgerAccounts).values(acct);
      console.log(`   Created: ${acct.name}`);
    } else {
      console.log(`   Exists:  ${acct.name}`);
    }
  }

  // ── 2. Global risk controls ──────────────────────────────────────────────
  console.log('\n2. Global risk controls');

  const existingGlobal = await db
    .select()
    .from(riskControls)
    .where(eq(riskControls.isGlobal, true))
    .limit(1);

  if (existingGlobal.length === 0) {
    await db.insert(riskControls).values({
      isGlobal: true,
      maxPositionShares: 10000,
      maxPositionPct: '0.10',
      dailyTradeCapShares: 5000,
      dailyTradeCapUsd: '50000',
      cooldownMinutes: 0,
      circuitBreakerThresholdPct: '0.20',
      spreadBps: 500,
    });
    console.log('   Created global risk controls');
  } else {
    console.log('   Global risk controls already exist');
  }

  // ── 3. Demo artist users ─────────────────────────────────────────────────
  console.log('\n3. Demo artist users + artist profiles');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const demoArtists = [
    {
      email: 'luna.vega@demo.crescendo.io',
      displayName: 'Luna Vega',
      stageName: 'Luna Vega',
      bio: 'Indie-pop singer-songwriter from Toronto. Blends dreamy synths with introspective lyricism.',
      spotifyArtistId: null,
      basePrice: '1.2500',
      revenueSharePct: '0.1000',
      sharesOutstanding: 50000,
      maxShares: 100000,
    },
    {
      email: 'marco.beats@demo.crescendo.io',
      displayName: 'Marco Beats',
      stageName: 'Marco Beats',
      bio: 'Latin-trap producer from Miami. 3x platinum placements, known for viral TikTok hooks.',
      spotifyArtistId: null,
      basePrice: '2.0000',
      revenueSharePct: '0.0800',
      sharesOutstanding: 80000,
      maxShares: 100000,
    },
    {
      email: 'sable.noir@demo.crescendo.io',
      displayName: 'Sable Noir',
      stageName: 'Sable Noir',
      bio: 'Alt-R&B artist from London. BBC Radio 1 playlist regular, festival circuit rising star.',
      spotifyArtistId: null,
      basePrice: '1.0000',
      revenueSharePct: '0.1200',
      sharesOutstanding: 30000,
      maxShares: 100000,
    },
  ];

  const artistIds: string[] = [];

  for (const demo of demoArtists) {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, demo.email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`   User exists:  ${demo.email} (${userId})`);
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          email: demo.email,
          passwordHash,
          role: 'artist',
          displayName: demo.displayName,
        })
        .returning();
      userId = newUser.id;
      console.log(`   Created user: ${demo.email} (${userId})`);
    }

    // Check if artist profile exists
    const [existingArtist] = await db
      .select()
      .from(artists)
      .where(eq(artists.userId, userId))
      .limit(1);

    if (existingArtist) {
      artistIds.push(existingArtist.id);
      console.log(`   Artist exists: ${demo.stageName} (${existingArtist.id})`);
    } else {
      const [newArtist] = await db
        .insert(artists)
        .values({
          userId,
          stageName: demo.stageName,
          bio: demo.bio,
          spotifyArtistId: demo.spotifyArtistId,
          basePrice: demo.basePrice,
          currentPrice: demo.basePrice,
          revenueSharePct: demo.revenueSharePct,
          sharesOutstanding: demo.sharesOutstanding,
          maxShares: demo.maxShares,
        })
        .returning();
      artistIds.push(newArtist.id);
      console.log(`   Created artist: ${demo.stageName} (${newArtist.id})`);
    }
  }

  // ── 4. Demo metric snapshots ─────────────────────────────────────────────
  console.log('\n4. Demo Chartmetric snapshots');

  const snapshotDate = new Date('2026-02-19T00:00:00Z');

  const demoSnapshots = [
    {
      // Luna Vega — mid-tier indie pop
      artistId: artistIds[0],
      metrics: {
        spotifyMonthlyListeners: 1_200_000,
        spotifyFollowers: 280_000,
        spotifyPopularity: 64,
        playlistReach: 6_500_000,
        playlistCount: 420,
        tiktokFollowers: 350_000,
        tiktokLikes: 7_800_000,
        tiktokTopViews: 4_200_000,
        instagramFollowers: 520_000,
        youtubeSubscribers: 95_000,
        youtubeChannelViews: 18_000_000,
        shazamTotal: 32_000,
        airplaySpins: 800,
        chartmetricScore: 72.5,
      },
    },
    {
      // Marco Beats — high-reach Latin trap
      artistId: artistIds[1],
      metrics: {
        spotifyMonthlyListeners: 4_500_000,
        spotifyFollowers: 620_000,
        spotifyPopularity: 78,
        playlistReach: 22_000_000,
        playlistCount: 1_100,
        tiktokFollowers: 1_800_000,
        tiktokLikes: 45_000_000,
        tiktokTopViews: 18_000_000,
        instagramFollowers: 950_000,
        youtubeSubscribers: 320_000,
        youtubeChannelViews: 85_000_000,
        shazamTotal: 120_000,
        airplaySpins: 3_200,
        chartmetricScore: 86.3,
      },
    },
    {
      // Sable Noir — emerging alt-R&B
      artistId: artistIds[2],
      metrics: {
        spotifyMonthlyListeners: 450_000,
        spotifyFollowers: 85_000,
        spotifyPopularity: 52,
        playlistReach: 2_100_000,
        playlistCount: 180,
        tiktokFollowers: 120_000,
        tiktokLikes: 2_400_000,
        tiktokTopViews: 1_500_000,
        instagramFollowers: 180_000,
        youtubeSubscribers: 28_000,
        youtubeChannelViews: 4_200_000,
        shazamTotal: 8_500,
        airplaySpins: 1_400,
        chartmetricScore: 58.1,
      },
    },
  ];

  for (let i = 0; i < demoSnapshots.length; i++) {
    const snap = demoSnapshots[i];
    const m = snap.metrics;
    const name = demoArtists[i].stageName;

    // Check if snapshot already exists for this artist + source + date
    const [existing] = await db
      .select()
      .from(artistMetricSnapshots)
      .where(eq(artistMetricSnapshots.artistId, snap.artistId))
      .limit(1);

    if (existing) {
      console.log(`   Snapshot exists: ${name}`);
      continue;
    }

    // Compute derived ratios
    const listeners = m.spotifyMonthlyListeners;
    const followers = m.spotifyFollowers;
    const lfRatio = followers > 0
      ? Math.round((listeners / followers) * 1000000) / 1000000
      : null;
    const fcRate = listeners > 0
      ? Math.round((followers / listeners) * 1000000) / 1000000
      : null;
    const rfRatio = followers > 0 && m.playlistReach
      ? Math.round((m.playlistReach / followers) * 1000000) / 1000000
      : null;

    await db.insert(artistMetricSnapshots).values({
      artistId: snap.artistId,
      source: 'chartmetric_manual',
      capturedAt: snapshotDate,
      metricsJson: m as Record<string, unknown>,

      spotifyMonthlyListeners: m.spotifyMonthlyListeners.toString(),
      spotifyFollowers: m.spotifyFollowers.toString(),
      spotifyPopularity: m.spotifyPopularity.toString(),
      spotifyListenerToFollowerRatio: lfRatio?.toString() ?? null,

      playlistReach: m.playlistReach.toString(),
      playlistCount: m.playlistCount.toString(),

      fanConversionRate: fcRate?.toString() ?? null,
      reachFollowersRatio: rfRatio?.toString() ?? null,

      tiktokFollowers: m.tiktokFollowers.toString(),
      tiktokLikes: m.tiktokLikes.toString(),
      tiktokTopViews: m.tiktokTopViews.toString(),

      instagramFollowers: m.instagramFollowers.toString(),

      youtubeSubscribers: m.youtubeSubscribers.toString(),
      youtubeChannelViews: m.youtubeChannelViews.toString(),

      shazamTotal: m.shazamTotal.toString(),
      airplaySpins: m.airplaySpins.toString(),

      chartmetricScore: m.chartmetricScore.toString(),
    });

    console.log(`   Created snapshot: ${name}`);
  }

  // ── 5. Initial traction index run ────────────────────────────────────────
  console.log('\n5. Initial traction index run');

  try {
    const { runTractionIndexForAll } = await import('../services/tractionIndex.service');
    const result = await runTractionIndexForAll();
    console.log(`   Computed ${result.computed} / ${result.cohortSize} artists`);
    for (const r of result.results) {
      console.log(`   ${r.artistId}: traction=${r.tractionIndex}, price=$${r.newPrice.toFixed(4)}, bid=$${r.bid.toFixed(4)}, ask=$${r.ask.toFixed(4)}`);
    }
  } catch (err: any) {
    console.error('   Traction index run failed:', err.message);
    console.log('   (Prices will use defaults until traction index is run)');
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\nSeed complete!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
