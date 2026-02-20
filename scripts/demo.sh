#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Crescendo — Hackathon Demo Script
#
# Prerequisites:
#   1. Server running:  npm run dev
#   2. Schema pushed:   npm run db:push
#   3. Seed run:        npm run db:seed
#
# Usage:  bash scripts/demo.sh [BASE_URL]
#         Default BASE_URL = http://localhost:3000
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${1:-http://localhost:3000}"
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

step() { echo -e "\n${BOLD}${CYAN}── $1 ──${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }

# ── 0. Health check ──────────────────────────────────────────────────────────
step "0. Health check"
curl -sf "$BASE/health" | python3 -m json.tool 2>/dev/null || curl -sf "$BASE/health"
ok "Server is healthy"

# ── 1. Register admin (or login if exists) ───────────────────────────────────
step "1. Get admin token"
ADMIN_RESP=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.crescendo.io","password":"demo1234","role":"admin","displayName":"Demo Admin"}' \
  2>/dev/null || \
  curl -sf -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.crescendo.io","password":"demo1234"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
ok "Admin token acquired"

# ── 2. Reset demo state ──────────────────────────────────────────────────────
step "2. Reset demo (wipe trades, reset prices)"
curl -sf -X POST "$BASE/api/admin/demo/reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool 2>/dev/null || \
  curl -sf -X POST "$BASE/api/admin/demo/reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
ok "Demo state reset"

# ── 3. Register investor ─────────────────────────────────────────────────────
step "3. Register investor"
INVESTOR_RESP=$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"investor@demo.crescendo.io","password":"demo1234","role":"investor","displayName":"Demo Investor"}' \
  2>/dev/null || \
  curl -sf -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"investor@demo.crescendo.io","password":"demo1234"}')

INVESTOR_TOKEN=$(echo "$INVESTOR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
INVESTOR_ID=$(echo "$INVESTOR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
echo "  Investor ID: $INVESTOR_ID"
ok "Investor token acquired"

# ── 4. Deposit $500 ──────────────────────────────────────────────────────────
step "4. Deposit \$500"
curl -sf -X POST "$BASE/api/investor/deposit" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"amount": 500}' | python3 -m json.tool 2>/dev/null || echo "(done)"
ok "Deposited \$500"

# ── 5. Check balance ─────────────────────────────────────────────────────────
step "5. Check wallet balance"
curl -sf "$BASE/api/investor/balance" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 6. List artists ──────────────────────────────────────────────────────────
step "6. List artists"
ARTISTS_RESP=$(curl -sf "$BASE/api/market/artists")
echo "$ARTISTS_RESP" | python3 -m json.tool 2>/dev/null || echo "$ARTISTS_RESP"

# Pick the first artist
ARTIST_ID=$(echo "$ARTISTS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['artists'][0]['id'])")
ARTIST_NAME=$(echo "$ARTISTS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['artists'][0]['stageName'])")
echo "  Selected artist: $ARTIST_NAME ($ARTIST_ID)"

# ── 7. Get price quote ───────────────────────────────────────────────────────
step "7. Price quote for $ARTIST_NAME"
curl -sf "$BASE/api/market/artists/$ARTIST_ID/quote" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 8. Buy 100 shares ────────────────────────────────────────────────────────
step "8. Buy 100 shares of $ARTIST_NAME"
curl -sf -X POST "$BASE/api/trade/buy" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"artistId\": \"$ARTIST_ID\", \"quantity\": 100}" | python3 -m json.tool 2>/dev/null || echo "(done)"
ok "Bought 100 shares"

# ── 9. Buy 50 more (second trade for candle data) ────────────────────────────
step "9. Buy 50 more shares"
curl -sf -X POST "$BASE/api/trade/buy" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"artistId\": \"$ARTIST_ID\", \"quantity\": 50}" | python3 -m json.tool 2>/dev/null || echo "(done)"
ok "Bought 50 more shares"

# ── 10. View portfolio ───────────────────────────────────────────────────────
step "10. View portfolio"
curl -sf "$BASE/api/investor/portfolio" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 11. View candles ─────────────────────────────────────────────────────────
step "11. View OHLCV candles for $ARTIST_NAME"
curl -sf "$BASE/api/market/artists/$ARTIST_ID/candles?interval=1h&limit=10" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 12. View earnings band ───────────────────────────────────────────────────
step "12. Earnings band estimate"
curl -sf "$BASE/api/market/artists/$ARTIST_ID/earnings-band" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 13. Upload royalty CSV ───────────────────────────────────────────────────
step "13. Upload royalty CSV (admin)"

# Create temp CSV
TMPCSV=$(mktemp /tmp/royalty_demo_XXXX.csv)
cat > "$TMPCSV" <<CSVEOF
artist_id,period_start,period_end,store,territory,track_name,units,revenue_gross,revenue_net
$ARTIST_ID,2026-01-01,2026-01-31,Spotify,US,Midnight Drive,450000,1485.00,1485.00
$ARTIST_ID,2026-01-01,2026-01-31,Spotify,GB,Midnight Drive,120000,396.00,396.00
$ARTIST_ID,2026-01-01,2026-01-31,Apple Music,US,Neon Lights,85000,595.00,595.00
$ARTIST_ID,2026-01-01,2026-01-31,YouTube Music,US,Midnight Drive,200000,300.00,300.00
CSVEOF

UPLOAD_RESP=$(curl -sf -X POST "$BASE/api/royalties/upload" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@$TMPCSV")
echo "$UPLOAD_RESP" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESP"

STATEMENT_ID=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['statements'][0]['statement']['id'])")
echo "  Statement ID: $STATEMENT_ID"
rm -f "$TMPCSV"
ok "Royalty CSV uploaded"

# ── 14. Distribute dividends ─────────────────────────────────────────────────
step "14. Distribute dividends for statement $STATEMENT_ID"
curl -sf -X POST "$BASE/api/royalties/$STATEMENT_ID/distribute" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"
ok "Dividends distributed"

# ── 15. View portfolio after dividends ───────────────────────────────────────
step "15. Portfolio + balance after dividends"
echo "  Balance:"
curl -sf "$BASE/api/investor/balance" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"
echo "  Portfolio:"
curl -sf "$BASE/api/investor/portfolio" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── 16. Ledger integrity ─────────────────────────────────────────────────────
step "16. Ledger integrity check"
curl -sf "$BASE/api/admin/ledger/integrity" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool 2>/dev/null || echo "(done)"

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}══════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Demo complete!${RESET}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════${RESET}"
echo ""
echo "  Admin token:    $ADMIN_TOKEN"
echo "  Investor token: $INVESTOR_TOKEN"
echo "  Artist ID:      $ARTIST_ID"
echo ""
