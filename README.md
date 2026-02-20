# Crescendo

Music artist revenue-share investment platform. Users invest in artists via real revenue-share rights, powered by a double-entry ledger, Chartmetric-driven pricing, and Stripe Connect payouts.

## Azure Postgres Runbook

### 1. Configure `.env`

```
DATABASE_URL=postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/<dbname>?sslmode=require
JWT_SECRET=<random-secret-min-32-chars>
PORT=3000
```

**Format details:**

| Component | Example | Notes |
|-----------|---------|-------|
| `<user>` | `crescendo_admin` | Azure admin username (no `@server` suffix for Flexible Server) |
| `<password>` | `MyP%40ss` | URL-encode special characters (see below) |
| `<server>` | `crescendo-db` | Azure resource name |
| `<dbname>` | `crescendo` | Database name (create via Azure Portal or `az postgres flexible-server db create`) |
| `sslmode` | `require` | **Mandatory** — Azure rejects non-SSL connections |

**URL-encoding special characters in passwords:**

| Character | Encoded | Character | Encoded |
|-----------|---------|-----------|---------|
| `@` | `%40` | `#` | `%23` |
| `!` | `%21` | `$` | `%24` |
| `%` | `%25` | `&` | `%26` |
| `/` | `%2F` | `:` | `%3A` |

Example: password `P@ss#123!` → `P%40ss%23123%21`

### 2. Push schema to database

```bash
npm run db:push
```

Creates all 22 tables, 10 enums, and indexes via Drizzle Kit's `push` command (no migration files needed).

### 3. Seed demo data

```bash
npm run db:seed
```

The seed runs in order:
1. Platform ledger accounts (`platform:cash`, `platform:spread-revenue`, `platform:fee-revenue`)
2. Global risk controls (position caps, daily limits, circuit breaker threshold)
3. 3 demo artists — Luna Vega, Marco Beats, Sable Noir — each with a user account (password: `demo1234`)
4. 3 Chartmetric-style metric snapshots with realistic social/streaming data
5. Initial traction index run — computes scores and sets prices from the snapshots

The seed is idempotent: running it again skips already-created rows.

### 4. Verify deployment

```bash
npm run db:check
```

Connects to the database and verifies:
- All 22 tables exist
- 3 demo artists are present
- Global risk controls row exists
- 3 platform ledger accounts exist

Returns a PASS/FAIL summary for each check.

### 5. Start the server

```bash
npm run dev
```

### 6. Health check

```bash
curl http://localhost:3000/health
```

Returns DB connectivity, latency, and Postgres version:

```json
{
  "status": "ok",
  "timestamp": "2026-02-19T...",
  "database": {
    "connected": true,
    "latencyMs": 12,
    "version": "PostgreSQL 16.6..."
  }
}
```

If the database is unreachable, returns HTTP 503 with `"status": "degraded"`.

### Common Azure Postgres Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `no pg_hba.conf entry for host` | IP not in firewall allow-list | Azure Portal → Networking → add your IP or enable "Allow public access from any Azure service" |
| `password authentication failed` | Wrong password or un-encoded special chars | URL-encode the password (see table above). Verify in Azure Portal → Server parameters |
| `could not translate host name` | Wrong server hostname | Use `<server>.postgres.database.azure.com` exactly. Check with `nslookup <server>.postgres.database.azure.com` |
| `SSL connection is required` | Missing `sslmode=require` in URL | Append `?sslmode=require` to DATABASE_URL |
| `FATAL: database "<name>" does not exist` | Database not created yet | Run `az postgres flexible-server db create --resource-group <rg> --server-name <server> --database-name <dbname>` |
| `ECONNREFUSED` / timeout | Firewall, VNet, or server stopped | Check Azure Portal → Overview → Status is "Ready". Check Networking rules. |
| `self signed certificate in certificate chain` | Node rejecting Azure's CA | Set `sslmode=require` (not `verify-full`). The `postgres.js` driver handles Azure's cert chain automatically with `require` mode. |

## API Reference

Full OpenAPI 3.0.3 spec: `GET /api/docs` (returns JSON) or see `openapi.json` in the repo root.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | - | Register (investor/artist/admin), returns JWT |
| POST | `/api/auth/login` | - | Login, returns JWT |

### Market (public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/market/artists` | - | List all artists with prices |
| GET | `/api/market/artists/:id/quote` | - | Bid/ask price quote |
| GET | `/api/market/artists/:id/traction-history` | - | Traction index snapshots (last 30) |
| GET | `/api/market/artists/:id/candles` | - | OHLCV price candles (`?interval=1h&limit=100`) |
| GET | `/api/market/artists/:id/earnings-band` | - | Estimated royalty earnings range |

### Trading (investor)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/trade/buy` | investor | Buy shares at ask (idempotent via `Idempotency-Key` header) |
| POST | `/api/trade/sell` | investor | Sell shares at bid (idempotent) |
| GET | `/api/trade/history` | investor | Trade history (newest first) |

### Investor
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/investor/balance` | investor | Wallet balance |
| POST | `/api/investor/deposit` | investor | Deposit funds |
| POST | `/api/investor/withdraw` | investor | Withdraw funds |
| GET | `/api/investor/portfolio` | investor | Holdings with P&L |
| GET | `/api/investor/orders` | investor | Order history |

### Artists
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/artists` | artist | Create artist profile |
| GET | `/api/artists/:id` | - | Get artist by ID |
| PATCH | `/api/artists/:id` | owner/admin | Update artist profile |
| POST | `/api/artists/:id/issue-shares` | admin | Issue new shares |
| POST | `/api/artists/:id/stripe/onboard` | owner/admin | Start Stripe Connect onboarding |

### Royalties (admin)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/royalties/upload` | admin | Upload royalty CSV (max 5 MB) |
| GET | `/api/royalties` | admin | List all royalty statements |
| POST | `/api/royalties/:statementId/distribute` | admin | Distribute dividends |
| GET | `/api/royalties/:statementId/distributions` | admin | List distributions |
| GET | `/api/royalties/distributions/:distributionId/payments` | admin | List payments |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/run-traction-index` | admin | Recompute all prices |
| POST | `/api/admin/traction-index/update` | admin | Update single artist traction |
| PUT | `/api/admin/risk-controls/:artistId` | admin | Set per-artist risk controls |
| PUT | `/api/admin/risk-controls` | admin | Set global risk controls |
| POST | `/api/admin/circuit-breaker/:artistId/reset` | admin | Reset circuit breaker |
| GET | `/api/admin/ledger/integrity` | admin | Verify debits = credits |
| POST | `/api/admin/demo/reset` | admin | Reset demo state |
| POST | `/api/admin/metrics/chartmetric-snapshot` | admin | Upload metric snapshot (JSON) |
| POST | `/api/admin/metrics/chartmetric-upload` | admin | Upload metrics CSV |
| GET | `/api/admin/metrics/artist/:id/latest` | admin | Latest metric snapshot |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | - | Health + DB connectivity + version |
| GET | `/api/docs` | - | OpenAPI 3.0.3 JSON spec |
| POST | `/api/stripe/webhook` | stripe-sig | Stripe event receiver |

### Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Auth (`/api/auth/*`) | 20 requests | 15 minutes |
| Trade (`/api/trade/*`) | 60 requests | 1 minute |
| All other (`/api/*`) | 200 requests | 1 minute |

Rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) are returned on every response (draft-7 standard).

## Frontend Integration Guide

### Quick start for your frontend teammate

**Production URL**: `https://crescendo-production-1231.up.railway.app`
**Local URL**: `http://localhost:3000`

**OpenAPI spec**: `GET /api/docs` — paste into Swagger UI or import into Postman

**Auth flow**:
```
POST /api/auth/register  { email, password, role: "investor" }  → { user, token }
POST /api/auth/login     { email, password }                     → { user, token }
```

Then use `Authorization: Bearer <token>` on all authenticated requests.

**Must-hit endpoints for the UI**:

1. `GET /api/market/artists` — artist cards / listing page
2. `GET /api/market/artists/:id/quote` — live bid/ask for trade dialog
3. `POST /api/trade/buy` `{ artistId, quantity }` — buy button
4. `POST /api/trade/sell` `{ artistId, quantity }` — sell button
5. `GET /api/investor/portfolio` — portfolio page with P&L
6. `GET /api/investor/balance` — wallet balance display

**CORS**: `http://localhost:3000` and `http://localhost:5173` are always allowed. Set `APP_URL` env var on Railway for your deployed frontend domain (e.g. Vercel). The `Authorization` and `Idempotency-Key` headers are explicitly allowed. Rate limit headers are exposed.

**All monetary values** are returned as strings (to preserve decimal precision). Parse with `parseFloat()` for display.

**Demo accounts** (after `npm run db:seed`):
- `luna@demo.crescendo.io` / `demo1234` (artist)
- `marco@demo.crescendo.io` / `demo1234` (artist)
- `sable@demo.crescendo.io` / `demo1234` (artist)
- `admin@demo.crescendo.io` / `demo1234` (admin)

## Deploying

### Docker (recommended)

```bash
# Local dev with bundled Postgres
docker compose up --build

# Push schema + seed inside the running container
docker compose exec api npx tsx src/db/check.ts   # should fail (no tables yet)
docker compose exec api npx drizzle-kit push       # create 22 tables
docker compose exec api npx tsx src/db/seed.ts     # seed demo data
docker compose exec api npx tsx src/db/check.ts   # should PASS
```

The `docker-compose.yml` starts:
- **db**: Postgres 16 on port 5432 (user/pass/db: `crescendo`)
- **api**: Node 20 on port 3000, waits for db health check

### Production (Azure / any host)

```bash
# Set env vars
export DATABASE_URL=postgresql://...?sslmode=require
export JWT_SECRET=<random-32-chars>
export NODE_ENV=production

# Optional: enable Stripe
export STRIPE_ENABLED=true
export STRIPE_SECRET_KEY=sk_live_...
export STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: frontend CORS origin
export APP_URL=https://crescendo.example.com

# Deploy
npm ci
npm run db:push
npm run db:seed
npm run db:check
npm run start:prod
```

### Config validation

The server fails fast at startup if required env vars are missing:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Always | Postgres connection string |
| `JWT_SECRET` or `AUTH_SECRET` | Always | Signs JWT tokens (min 32 chars recommended) |
| `PORT` | No | Defaults to 3000 |
| `STRIPE_ENABLED` | No | Set `true` to require Stripe keys |
| `STRIPE_SECRET_KEY` | When `STRIPE_ENABLED=true` | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | When `STRIPE_ENABLED=true` | Stripe webhook signing secret |
| `APP_URL` | No | Added to CORS allow-list (localhost:3000 and 5173 always allowed) |

### CORS

Allowed origins (requests from other origins are rejected):
- `http://localhost:3000` (always)
- `http://localhost:5173` (always — Vite default)
- `APP_URL` env var (if set)
- Requests with no `Origin` header (curl, server-to-server) are allowed

## Hackathon Demo Script

A full end-to-end demo script lives at `scripts/demo.sh`. It walks through the entire investor flow with colored output.

**Prerequisites**: server running (`npm run dev`), schema pushed, seed run.

```bash
bash scripts/demo.sh                    # default: http://localhost:3000
bash scripts/demo.sh http://my-host:3000  # custom base URL
```

**What it does** (16 steps):

| Step | Action | Endpoint |
|------|--------|----------|
| 0 | Health check | `GET /health` |
| 1 | Get admin token (register or login) | `POST /api/auth/register` or `/login` |
| 2 | **Reset demo state** (wipe trades, reset prices) | `POST /api/admin/demo/reset` |
| 3 | Register investor | `POST /api/auth/register` |
| 4 | Deposit $500 | `POST /api/investor/deposit` |
| 5 | Check wallet balance | `GET /api/investor/balance` |
| 6 | List artists + pick first | `GET /api/market/artists` |
| 7 | Get price quote | `GET /api/market/artists/:id/quote` |
| 8 | Buy 100 shares | `POST /api/trade/buy` |
| 9 | Buy 50 more shares (candle data) | `POST /api/trade/buy` |
| 10 | View portfolio | `GET /api/investor/portfolio` |
| 11 | View OHLCV candles | `GET /api/market/artists/:id/candles` |
| 12 | View earnings band | `GET /api/market/artists/:id/earnings-band` |
| 13 | Upload royalty CSV (admin) | `POST /api/royalties/upload` |
| 14 | Distribute dividends | `POST /api/royalties/:id/distribute` |
| 15 | View portfolio + balance after dividends | `GET /api/investor/portfolio` |
| 16 | Ledger integrity check (debits = credits) | `GET /api/admin/ledger/integrity` |

The script is **idempotent** — step 2 resets the database to a clean demo state on every run. Tokens are printed at the end for manual exploration.

### Demo Reset Endpoint

`POST /api/admin/demo/reset` (admin auth required)

Resets the database to a clean post-seed state:
1. Wipes 14 transactional tables (orders, positions, candles, dividends, ledger entries, etc.) in FK-safe order
2. Deletes non-demo users (preserves `*@demo.crescendo.io` accounts)
3. Resets all wallet balances to $0
4. Resets artist prices to their base prices
5. Reruns the traction index to recompute scores and prices from preserved metric snapshots

**Preserved**: artists, risk_controls, artist_metric_snapshots, earnings_model_params

## Tech Stack

- **Runtime**: Node.js + TypeScript + Express
- **ORM**: Drizzle ORM (PostgreSQL dialect)
- **Database**: Azure PostgreSQL Flexible Server
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Payments**: Stripe Connect (test mode)
- **Validation**: Zod
- **Tests**: Vitest
