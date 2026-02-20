# Crescendo — Model Documentation

## 1. Traction Index (Price Driver)

The Traction Index determines an artist's current share price. It is a **cohort-relative** score from 0–100 computed from the latest Chartmetric-style metric snapshot for each artist.

### Stage Score (80% weight)

Measures an artist's reach and momentum:

| Metric | Source |
|--------|--------|
| Spotify Monthly Listeners | Chartmetric snapshot |
| Playlist Reach | Chartmetric snapshot |
| TikTok Top Views | Chartmetric snapshot |
| Shazam Total | Chartmetric snapshot |
| YouTube Channel Views | Chartmetric snapshot |
| Airplay Spins | Chartmetric snapshot |

Each metric is log1p-transformed (`Math.log1p(value)`) to compress heavy-tailed distributions, then percentile-ranked across the cohort using the midpoint method. The Stage Score is the mean percentile across all metrics with signal.

### Followers Score (20% weight)

Measures an artist's loyal audience:

| Metric | Source |
|--------|--------|
| Spotify Followers | Chartmetric snapshot |
| Instagram Followers | Chartmetric snapshot |
| TikTok Followers | Chartmetric snapshot |
| YouTube Subscribers | Chartmetric snapshot |

Same normalization as Stage Score.

### Modifiers (±5 points max each)

- **Fan Conversion Modifier**: `followers / monthly_listeners` percentile-ranked → mapped to ±5. High conversion = artist retains audience.
- **Listener-to-Follower Ratio Modifier**: `monthly_listeners / followers` percentile-ranked → mapped to ±5. High ratio = viral/playlist-driven reach.

### Final Formula

```
base = 0.80 × stageScore + 0.20 × followersScore
tractionIndex = clamp(base + fanConversionMod + listenerFollowerMod, 0, 100)
```

### Price Derivation

```
currentPrice = basePrice × (1 + 0.02 × (tractionIndex − 50))
```

At `tractionIndex = 50`, price equals base. At 75, price = base × 1.5.

---

## 2. Earnings Band Estimator (Directional Only)

The earnings band endpoint provides a **conservative range estimate** of what an artist's shares might earn in royalties. These are explicitly **directional estimates, not guarantees**.

### Model v1.0.0

#### Stream Estimation

```
estimatedMonthlyStreams = spotifyMonthlyListeners × streamsPerListener × adjustments
```

Default `streamsPerListener` bands:
| Band | Value | Rationale |
|------|-------|-----------|
| Low | 2.5 | Casual/new listeners, low engagement |
| Base | 4.0 | Industry average repeat-play rate |
| High | 6.0 | Engaged fanbase, playlist-heavy |

#### Revenue per Stream

| Band | USD/stream | Rationale |
|------|-----------|-----------|
| Low | $0.0025 | Emerging market / free tier heavy |
| Base | $0.0033 | Blended Spotify average |
| High | $0.0042 | Premium tier / developed markets |

#### Adjustments

**Popularity Multiplier** (from Spotify Popularity 0–100):
- At midpoint (50) → 1.0×
- At 100 → 1.0 + maxAdjustment (1.3× by default)
- At 0 → below 1.0

**Fan Conversion Multiplier** (from followers/listeners ratio):
- At midpoint (0.05) → 1.0×
- Higher conversion → slight uplift (max +15%)
- Uses log-scale comparison for handling wide variance

#### Full Pipeline

```
grossMonthlyRoyalty    = estimatedMonthlyStreams × usdPerStream
artistShareMonthly     = grossMonthlyRoyalty × revenueSharePct
earningsPerShare       = artistShareMonthly / sharesOutstanding
annualizedEPS          = earningsPerShare × 12
impliedYield           = annualizedEPS / currentSharePrice
```

Each step produces `{ low, base, high }` bands.

#### DB-Configurable Parameters

The `earnings_model_params` table allows admins to adjust all model inputs without code deploys:

| Column | Default | Description |
|--------|---------|-------------|
| `streams_per_listener_low` | 2.5 | Conservative streams/listener |
| `streams_per_listener_base` | 4.0 | Base streams/listener |
| `streams_per_listener_high` | 6.0 | Optimistic streams/listener |
| `usd_per_stream_low` | 0.0025 | Low-end payout rate |
| `usd_per_stream_base` | 0.0033 | Mid-range payout rate |
| `usd_per_stream_high` | 0.0042 | High-end payout rate |
| `popularity_midpoint` | 50 | Neutral popularity score |
| `popularity_max_adjustment` | 0.30 | Max ±30% from popularity |
| `fan_conversion_midpoint` | 0.05 | Neutral F/L ratio |
| `fan_conversion_max_adjustment` | 0.15 | Max ±15% from conversion |

Only the row with `is_active = true` is used. If no DB row exists, hardcoded defaults apply.

#### Disclaimer

All earnings band outputs include a disclaimer: actual royalties depend on distribution deals, streaming tier mix, geographic distribution, and other factors outside the model.

---

## 3. Trading Model

The platform operates as the **sole market maker** (no peer-to-peer order book).

- **Spread**: Configurable per-artist in basis points (default 500 bps = 5%)
- **Bid** = midPrice − halfSpread
- **Ask** = midPrice + halfSpread
- The platform has unlimited inventory (market making, not matching)

### Risk Controls

| Control | Description |
|---------|-------------|
| Position cap (absolute) | Max shares per user per artist |
| Position cap (%) | Max % of outstanding shares |
| Daily trade cap (shares) | Max shares traded per day per user per artist |
| Daily trade cap (USD) | Max USD volume per day per user per artist |
| Cooldown | Minimum time between trades |
| Circuit breaker | Auto-halts trading if price change > threshold |

---

## 4. Dividend Distribution

Royalties are uploaded as CSV line items, aggregated into statements, then distributed pro-rata to shareholders via a **cap table snapshot** frozen at distribution time. This ensures consistent allocation even if shares are traded during the distribution process.

```
dividendPerShare = (totalRoyalties × revenueSharePct) / sharesOutstanding
investorPayout   = dividendPerShare × sharesHeld (from snapshot)
```
