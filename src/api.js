// ─── Crescendo API Client ─── connects frontend to backend ───

const API_BASE = import.meta.env.VITE_API_URL || "";

// ── Token management ──
let authToken = localStorage.getItem("crescendo_token") || null;

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("crescendo_token", token);
  } else {
    localStorage.removeItem("crescendo_token");
  }
}

export function getToken() {
  return authToken;
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem("crescendo_token");
  localStorage.removeItem("crescendo_user");
}

// ── Generic fetch wrapper ──
async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const url = `${API_BASE}${path}`;
  console.log(`[api] ${options.method || 'GET'} ${url}`);
  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Handle rate limiting
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new ApiError("Rate limited. Please wait and try again.", 429, { retryAfter });
  }

  // Handle auth failure
  if (res.status === 401) {
    clearToken();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || data?.message || `Request failed (${res.status})`;
    console.error(`[api] ${res.status} ${url}`, data);
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ── Auth ──
export async function register(email, password, displayName, role = "investor") {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role, displayName }),
  });
  if (data.token) setToken(data.token);
  if (data.user) localStorage.setItem("crescendo_user", JSON.stringify(data.user));
  return data;
}

export async function login(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setToken(data.token);
  if (data.user) localStorage.setItem("crescendo_user", JSON.stringify(data.user));
  return data;
}

export async function googleAuth(credential) {
  const data = await apiFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (data.token) setToken(data.token);
  if (data.user) localStorage.setItem("crescendo_user", JSON.stringify(data.user));
  return data;
}

export function logout() {
  clearToken();
}

// ── Market (public) ──
export async function getArtists() {
  const data = await apiFetch("/api/market/artists");
  // Parse string numbers to floats
  return (data.artists || []).map(a => ({
    ...a,
    currentPrice: parseFloat(a.currentPrice),
    currentBid: parseFloat(a.currentBid),
    currentAsk: parseFloat(a.currentAsk),
    revenueSharePct: parseFloat(a.revenueSharePct),
  }));
}

export async function getQuote(artistId) {
  const data = await apiFetch(`/api/market/artists/${artistId}/quote`);
  return {
    mid: data.mid,
    bid: data.bid,
    ask: data.ask,
    spreadBps: data.spreadBps,
  };
}

export async function getCandles(artistId, interval = "1h", limit = 100) {
  const data = await apiFetch(
    `/api/market/artists/${artistId}/candles?interval=${interval}&limit=${limit}`
  );
  return (data.candles || []).map(c => ({
    startTime: c.startTime,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    volume: c.volume,
    tradeCount: c.tradeCount,
  }));
}

// ── Daily candles (deterministic, metrics-derived) ──
export async function getDailyCandles(artistId, start, end) {
  let url = `/api/market/artists/${artistId}/daily-candles`;
  const params = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await apiFetch(url);
  return (data.candles || []).map(c => ({
    t: c.t,
    o: c.o,
    h: c.h,
    l: c.l,
    c: c.c,
    v: c.v || 0,
  }));
}

// ── Market summary ──
export async function getMarketSummary(artistId) {
  return await apiFetch(`/api/market/artists/${artistId}/summary`);
}

// ── Financial analysis ──
export async function getFinancialAnalysis(artistId, start, end) {
  let url = `/api/market/artists/${artistId}/analysis`;
  const params = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await apiFetch(url);
  return data.analysis;
}

export async function getTractionHistory(artistId) {
  const data = await apiFetch(`/api/market/artists/${artistId}/traction-history`);
  return {
    artist: data.artist,
    snapshots: (data.snapshots || []).map(s => ({
      ...s,
      tractionScore: parseFloat(s.tractionScore),
      computedPrice: parseFloat(s.computedPrice),
    })),
  };
}

export async function getEarningsBand(artistId) {
  return await apiFetch(`/api/market/artists/${artistId}/earnings-band`);
}

// ── Trading (investor, auth required) ──
export async function buyShares(artistId, quantity) {
  // Generate idempotency key to prevent double-submit
  const idempotencyKey = `buy-${artistId}-${quantity}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await apiFetch("/api/trade/buy", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ artistId, quantity }),
  });
}

export async function sellShares(artistId, quantity) {
  const idempotencyKey = `sell-${artistId}-${quantity}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await apiFetch("/api/trade/sell", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ artistId, quantity }),
  });
}

export async function getTradeHistory() {
  const data = await apiFetch("/api/trade/history");
  return (data.orders || []).map(o => ({
    ...o,
    pricePerShare: parseFloat(o.pricePerShare),
    totalAmount: parseFloat(o.totalAmount),
    spreadAmount: parseFloat(o.spreadAmount),
  }));
}

// ── Investor (auth required) ──
export async function getBalance() {
  const data = await apiFetch("/api/investor/balance");
  return {
    balance: parseFloat(data.balance),
    accountId: data.accountId,
  };
}

export async function deposit(amount) {
  const data = await apiFetch("/api/investor/deposit", {
    method: "POST",
    body: JSON.stringify({ amount: parseFloat(amount) }),
  });
  return {
    transactionId: data.transactionId,
    balance: parseFloat(data.balance),
  };
}

export async function withdraw(amount) {
  const data = await apiFetch("/api/investor/withdraw", {
    method: "POST",
    body: JSON.stringify({ amount: parseFloat(amount) }),
  });
  return {
    transactionId: data.transactionId,
    balance: parseFloat(data.balance),
  };
}

export async function getPortfolio() {
  const data = await apiFetch("/api/investor/portfolio");
  return (data.positions || []).map(p => ({
    ...p,
    sharesHeld: p.sharesHeld,
    avgCostBasis: parseFloat(p.avgCostBasis),
    currentPrice: parseFloat(p.currentPrice),
    currentBid: parseFloat(p.currentBid),
    currentAsk: parseFloat(p.currentAsk),
    marketValue: parseFloat(p.marketValue),
    totalCost: parseFloat(p.totalCost),
    unrealizedPnL: parseFloat(p.unrealizedPnL),
  }));
}

export async function getOrders() {
  const data = await apiFetch("/api/investor/orders");
  return (data.orders || []).map(o => ({
    ...o,
    pricePerShare: parseFloat(o.pricePerShare),
    totalAmount: parseFloat(o.totalAmount),
    spreadAmount: parseFloat(o.spreadAmount),
  }));
}

// ── Artist Detail (public) ──
export async function getArtistById(artistId) {
  const data = await apiFetch(`/api/artists/${artistId}`);
  return {
    ...data,
    currentPrice: parseFloat(data.currentPrice),
    currentBid: parseFloat(data.currentBid),
    currentAsk: parseFloat(data.currentAsk),
    basePrice: parseFloat(data.basePrice),
    revenueSharePct: parseFloat(data.revenueSharePct),
  };
}

// ── Market Metrics (public) ──
export async function getMetrics(symbol, from, to) {
  let url = `/api/market/${encodeURIComponent(symbol)}/metrics`;
  const params = [];
  if (from) params.push(`from=${encodeURIComponent(from)}`);
  if (to) params.push(`to=${encodeURIComponent(to)}`);
  if (params.length) url += `?${params.join("&")}`;
  const data = await apiFetch(url);
  return (data.metrics || data.snapshots || data || []).map(s => ({
    ...s,
    spotifyMonthlyListeners: s.spotifyMonthlyListeners != null ? Number(s.spotifyMonthlyListeners) : null,
    spotifyFollowers: s.spotifyFollowers != null ? Number(s.spotifyFollowers) : null,
    spotifyPopularity: s.spotifyPopularity != null ? Number(s.spotifyPopularity) : null,
    playlistReach: s.playlistReach != null ? Number(s.playlistReach) : null,
    tiktokFollowers: s.tiktokFollowers != null ? Number(s.tiktokFollowers) : null,
    tiktokTopViews: s.tiktokTopViews != null ? Number(s.tiktokTopViews) : null,
    instagramFollowers: s.instagramFollowers != null ? Number(s.instagramFollowers) : null,
    youtubeSubscribers: s.youtubeSubscribers != null ? Number(s.youtubeSubscribers) : null,
    youtubeChannelViews: s.youtubeChannelViews != null ? Number(s.youtubeChannelViews) : null,
  }));
}

// ── Auth: Get Current User ──
export async function getMe() {
  return await apiFetch("/api/auth/me");
}

// ── Health check ──
export async function healthCheck() {
  return await apiFetch("/health");
}
