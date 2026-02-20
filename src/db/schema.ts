import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  date,
  boolean,
  uniqueIndex,
  index,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['investor', 'artist', 'admin']);

export const ledgerAccountTypeEnum = pgEnum('ledger_account_type', [
  'asset',
  'liability',
  'revenue',
  'expense',
]);

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', ['debit', 'credit']);

export const txnTypeEnum = pgEnum('txn_type', [
  'deposit',
  'withdrawal',
  'share_purchase',
  'share_sale',
  'spread_revenue',
  'fee_revenue',
  'dividend_payout',
]);

export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderStatusEnum = pgEnum('order_status', ['filled', 'rejected', 'cancelled']);

export const stripeOnboardingStatusEnum = pgEnum('stripe_onboarding_status', [
  'not_started',
  'pending',
  'complete',
]);

export const circuitBreakerStatusEnum = pgEnum('circuit_breaker_status', [
  'closed',
  'tripped',
]);

export const snapshotSourceEnum = pgEnum('snapshot_source', [
  'dividend_record_date',
  'audit',
  'manual',
]);

export const metricSourceEnum = pgEnum('metric_source', [
  'chartmetric_manual',
  'spotify_api',
  'admin_manual',
]);

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  role: userRoleEnum('role').notNull().default('investor'),
  displayName: varchar('display_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Artists ────────────────────────────────────────────────────────────────

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  stageName: varchar('stage_name', { length: 255 }).notNull(),
  bio: text('bio'),
  spotifyArtistId: varchar('spotify_artist_id', { length: 255 }),
  sharesOutstanding: integer('shares_outstanding').notNull().default(0),
  maxShares: integer('max_shares').notNull().default(100000),
  revenueSharePct: decimal('revenue_share_pct', { precision: 5, scale: 4 }).notNull().default('0.10'),
  basePrice: decimal('base_price', { precision: 12, scale: 4 }).notNull().default('1.0000'),
  currentPrice: decimal('current_price', { precision: 12, scale: 4 }).notNull().default('1.0000'),
  currentBid: decimal('current_bid', { precision: 12, scale: 4 }).notNull().default('0.9500'),
  currentAsk: decimal('current_ask', { precision: 12, scale: 4 }).notNull().default('1.0500'),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingStatus: stripeOnboardingStatusEnum('stripe_onboarding_status').notNull().default('not_started'),
  circuitBreakerStatus: circuitBreakerStatusEnum('circuit_breaker_status').notNull().default('closed'),
  circuitBreakerTrippedAt: timestamp('circuit_breaker_tripped_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Share Issuance Events ──────────────────────────────────────────────────

export const shareIssuanceEvents = pgTable('share_issuance_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  sharesIssued: integer('shares_issued').notNull(),
  pricePerShare: decimal('price_per_share', { precision: 12, scale: 4 }).notNull(),
  sharesOutstandingAfter: integer('shares_outstanding_after').notNull(),
  issuedBy: uuid('issued_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Ledger Accounts ────────────────────────────────────────────────────────

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  accountType: ledgerAccountTypeEnum('account_type').notNull(),
  userId: uuid('user_id').references(() => users.id),
  balance: decimal('balance', { precision: 18, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Ledger Entries ─────────────────────────────────────────────────────────

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull(),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id),
  entryType: ledgerEntryTypeEnum('entry_type').notNull(),
  amount: decimal('amount', { precision: 18, scale: 4 }).notNull(),
  txnType: txnTypeEnum('txn_type').notNull(),
  referenceId: uuid('reference_id'),
  description: text('description'),
  idempotencyKey: text('idempotency_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_ledger_entries_txn_id').on(table.transactionId),
  index('idx_ledger_entries_account').on(table.accountId),
  uniqueIndex('idx_ledger_entries_idempotency_key')
    .on(table.idempotencyKey)
    .where(sql`idempotency_key IS NOT NULL`),
]);

// ── Investor Positions ─────────────────────────────────────────────────────

export const investorPositions = pgTable('investor_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  sharesHeld: integer('shares_held').notNull().default(0),
  avgCostBasis: decimal('avg_cost_basis', { precision: 12, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_positions_user_artist').on(table.userId, table.artistId),
]);

// ── Orders ─────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  side: orderSideEnum('side').notNull(),
  quantity: integer('quantity').notNull(),
  pricePerShare: decimal('price_per_share', { precision: 12, scale: 4 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).notNull(),
  spreadAmount: decimal('spread_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  status: orderStatusEnum('status').notNull().default('filled'),
  ledgerTransactionId: uuid('ledger_transaction_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_orders_user').on(table.userId),
  index('idx_orders_artist').on(table.artistId),
]);

// ── Traction Index Snapshots ───────────────────────────────────────────────

export const tractionIndexSnapshots = pgTable('traction_index_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),

  // Legacy component scores (kept for backward compat)
  albumVelocityScore: decimal('album_velocity_score', { precision: 6, scale: 2 }).notNull().default('0'),
  catalogSizeScore: decimal('catalog_size_score', { precision: 6, scale: 2 }).notNull().default('0'),
  revenueGrowthScore: decimal('revenue_growth_score', { precision: 6, scale: 2 }).notNull().default('0'),
  socialFollowersScore: decimal('social_followers_score', { precision: 6, scale: 2 }).notNull().default('0'),
  externalPopularityScore: decimal('external_popularity_score', { precision: 6, scale: 2 }).notNull().default('0'),

  // Chartmetric-driven model scores
  stageScore: decimal('stage_score', { precision: 6, scale: 2 }),
  followersScore: decimal('followers_score', { precision: 6, scale: 2 }),
  fanConversionModifier: decimal('fan_conversion_modifier', { precision: 8, scale: 6 }),
  listenerFollowerModifier: decimal('listener_follower_modifier', { precision: 8, scale: 6 }),
  metricSnapshotId: uuid('metric_snapshot_id').references(() => artistMetricSnapshots.id),
  tractionDebugJson: jsonb('traction_debug_json'),

  tractionScore: decimal('traction_score', { precision: 6, scale: 2 }).notNull(),
  computedPrice: decimal('computed_price', { precision: 12, scale: 4 }).notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_traction_artist').on(table.artistId),
]);

// ── Artist Metric Snapshots ────────────────────────────────────────────────

export const artistMetricSnapshots = pgTable('artist_metric_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  source: metricSourceEnum('source').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  metricsJson: jsonb('metrics_json').notNull(),

  // Spotify
  spotifyMonthlyListeners: decimal('spotify_monthly_listeners', { precision: 18, scale: 0 }),
  spotifyFollowers: decimal('spotify_followers', { precision: 18, scale: 0 }),
  spotifyPopularity: decimal('spotify_popularity', { precision: 6, scale: 2 }),
  spotifyListenerToFollowerRatio: decimal('spotify_listener_to_follower_ratio', { precision: 10, scale: 6 }),

  // Playlist / reach
  playlistReach: decimal('playlist_reach', { precision: 18, scale: 0 }),
  playlistCount: decimal('playlist_count', { precision: 18, scale: 0 }),

  // Derived conversion ratios
  fanConversionRate: decimal('fan_conversion_rate', { precision: 10, scale: 6 }),
  reachFollowersRatio: decimal('reach_followers_ratio', { precision: 10, scale: 6 }),

  // TikTok
  tiktokFollowers: decimal('tiktok_followers', { precision: 18, scale: 0 }),
  tiktokLikes: decimal('tiktok_likes', { precision: 18, scale: 0 }),
  tiktokTopViews: decimal('tiktok_top_views', { precision: 18, scale: 0 }),

  // Instagram
  instagramFollowers: decimal('instagram_followers', { precision: 18, scale: 0 }),

  // YouTube
  youtubeSubscribers: decimal('youtube_subscribers', { precision: 18, scale: 0 }),
  youtubeChannelViews: decimal('youtube_channel_views', { precision: 18, scale: 0 }),

  // Radio / Shazam
  shazamTotal: decimal('shazam_total', { precision: 18, scale: 0 }),
  airplaySpins: decimal('airplay_spins', { precision: 18, scale: 0 }),

  // Songstats / misc
  songstatsScore: decimal('songstats_score', { precision: 10, scale: 4 }),
  chartmetricScore: decimal('chartmetric_score', { precision: 10, scale: 4 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_metric_snapshots_artist_source_captured')
    .on(table.artistId, table.source, table.capturedAt),
  index('idx_metric_snapshots_artist').on(table.artistId),
]);

// ── Royalty Statements ─────────────────────────────────────────────────────

export const royaltyStatements = pgTable('royalty_statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  totalRoyalties: decimal('total_royalties', { precision: 18, scale: 4 }).notNull(),
  rawData: jsonb('raw_data'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Royalty Line Items ─────────────────────────────────────────────────────

export const royaltyLineItems = pgTable('royalty_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => royaltyStatements.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  store: text('store'),
  territory: text('territory'),
  trackName: text('track_name'),
  isrc: text('isrc'),
  units: decimal('units', { precision: 18, scale: 4 }).notNull().default('0'),
  revenueGross: decimal('revenue_gross', { precision: 18, scale: 4 }).notNull().default('0'),
  revenueNet: decimal('revenue_net', { precision: 18, scale: 4 }).notNull().default('0'),
  currency: text('currency').notNull().default('USD'),
  rawRowJson: jsonb('raw_row_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_line_items_statement').on(table.statementId),
  index('idx_line_items_artist_period').on(table.artistId),
]);

// ── Cap Table Snapshots ───────────────────────────────────────────────────

export const capTableSnapshots = pgTable('cap_table_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  recordDate: timestamp('record_date', { withTimezone: true }).notNull(),
  totalSharesOutstanding: integer('total_shares_outstanding').notNull(),
  snapshotSource: snapshotSourceEnum('snapshot_source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_cap_snapshots_artist').on(table.artistId),
]);

// ── Cap Table Snapshot Rows ───────────────────────────────────────────────

export const capTableSnapshotRows = pgTable('cap_table_snapshot_rows', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotId: uuid('snapshot_id').notNull().references(() => capTableSnapshots.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  shares: integer('shares').notNull(),
  avgCost: decimal('avg_cost', { precision: 12, scale: 4 }),
}, (table) => [
  uniqueIndex('idx_snapshot_rows_snapshot_user').on(table.snapshotId, table.userId),
]);

// ── Dividend Distributions ─────────────────────────────────────────────────

export const dividendDistributions = pgTable('dividend_distributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  royaltyStatementId: uuid('royalty_statement_id').notNull().references(() => royaltyStatements.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  capTableSnapshotId: uuid('cap_table_snapshot_id').notNull().references(() => capTableSnapshots.id),
  totalDistributable: decimal('total_distributable', { precision: 18, scale: 4 }).notNull(),
  dividendPerShare: decimal('dividend_per_share', { precision: 18, scale: 8 }).notNull(),
  sharesOutstandingAtDistribution: integer('shares_outstanding_at_distribution').notNull(),
  distributedAt: timestamp('distributed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Dividend Payments ──────────────────────────────────────────────────────

export const dividendPayments = pgTable('dividend_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionId: uuid('distribution_id').notNull().references(() => dividendDistributions.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  sharesHeld: integer('shares_held').notNull(),
  amountPaid: decimal('amount_paid', { precision: 18, scale: 4 }).notNull(),
  ledgerTransactionId: uuid('ledger_transaction_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Risk Controls ──────────────────────────────────────────────────────────

export const riskControls = pgTable('risk_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').references(() => artists.id),
  isGlobal: boolean('is_global').notNull().default(false),
  maxPositionShares: integer('max_position_shares').default(10000),
  maxPositionPct: decimal('max_position_pct', { precision: 5, scale: 4 }).default('0.10'),
  dailyTradeCapShares: integer('daily_trade_cap_shares').default(5000),
  dailyTradeCapUsd: decimal('daily_trade_cap_usd', { precision: 18, scale: 4 }).default('50000'),
  cooldownMinutes: integer('cooldown_minutes').default(0),
  circuitBreakerThresholdPct: decimal('circuit_breaker_threshold_pct', { precision: 5, scale: 4 }).default('0.20'),
  spreadBps: integer('spread_bps').default(500),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Idempotency Keys ───────────────────────────────────────────────────────

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  responseStatus: integer('response_status').notNull(),
  responseBody: jsonb('response_body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Stripe Webhook Events ──────────────────────────────────────────────────

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeEventId: varchar('stripe_event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Trade Cooldowns ────────────────────────────────────────────────────────

export const tradeCooldowns = pgTable('trade_cooldowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  lastTradeAt: timestamp('last_trade_at', { withTimezone: true }).notNull(),
  cooldownExpiresAt: timestamp('cooldown_expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('idx_cooldowns_user_artist').on(table.userId, table.artistId),
]);

// ── Daily Trade Tracking ───────────────────────────────────────────────────

export const dailyTradeTracking = pgTable('daily_trade_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  tradeDate: date('trade_date').notNull(),
  totalSharesTraded: integer('total_shares_traded').notNull().default(0),
  totalUsdTraded: decimal('total_usd_traded', { precision: 18, scale: 4 }).notNull().default('0'),
}, (table) => [
  uniqueIndex('idx_daily_tracking_user_artist_date').on(table.userId, table.artistId, table.tradeDate),
]);

// ── Artist Candles (OHLCV) ───────────────────────────────────────────────────

export const artistCandles = pgTable('artist_candles', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  interval: varchar('interval', { length: 10 }).notNull().default('1h'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  open: decimal('open', { precision: 12, scale: 4 }).notNull(),
  high: decimal('high', { precision: 12, scale: 4 }).notNull(),
  low: decimal('low', { precision: 12, scale: 4 }).notNull(),
  close: decimal('close', { precision: 12, scale: 4 }).notNull(),
  volume: integer('volume').notNull().default(0),
  tradeCount: integer('trade_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_candles_artist_interval_start').on(table.artistId, table.interval, table.startTime),
  index('idx_candles_artist').on(table.artistId),
]);

// ── Earnings Model Parameters ────────────────────────────────────────────────

export const earningsModelParams = pgTable('earnings_model_params', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: varchar('version', { length: 20 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),

  streamsPerListenerLow: decimal('streams_per_listener_low', { precision: 8, scale: 4 }).notNull().default('2.5'),
  streamsPerListenerBase: decimal('streams_per_listener_base', { precision: 8, scale: 4 }).notNull().default('4.0'),
  streamsPerListenerHigh: decimal('streams_per_listener_high', { precision: 8, scale: 4 }).notNull().default('6.0'),

  usdPerStreamLow: decimal('usd_per_stream_low', { precision: 10, scale: 6 }).notNull().default('0.002500'),
  usdPerStreamBase: decimal('usd_per_stream_base', { precision: 10, scale: 6 }).notNull().default('0.003300'),
  usdPerStreamHigh: decimal('usd_per_stream_high', { precision: 10, scale: 6 }).notNull().default('0.004200'),

  popularityMidpoint: decimal('popularity_midpoint', { precision: 6, scale: 2 }).notNull().default('50'),
  popularityMaxAdjustment: decimal('popularity_max_adjustment', { precision: 6, scale: 4 }).notNull().default('0.3000'),

  fanConversionMidpoint: decimal('fan_conversion_midpoint', { precision: 10, scale: 6 }).notNull().default('0.050000'),
  fanConversionMaxAdjustment: decimal('fan_conversion_max_adjustment', { precision: 6, scale: 4 }).notNull().default('0.1500'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
