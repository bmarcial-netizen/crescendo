import { useState, useEffect } from "react";
import * as api from "./api";
import EarningsBand from "./EarningsBand";

// ─── Artist Detail / Invest Modal ─── glassmorphic slide-in panel ───

const C = {
    bg: "#EAF0FA",
    card: "rgba(255,255,255,0.72)",
    border: "rgba(255,255,255,0.9)",
    shadow: "0 2px 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
    primary: "#4338CA",
    accent: "#50E3C2",
    accentDark: "#2CB59E",
    green: "#36D7B7",
    greenSoft: "rgba(54,215,183,0.1)",
    red: "#EF4444",
    redSoft: "rgba(239,68,68,0.1)",
    text: "#0F172A",
    textSec: "#64748B",
    textMuted: "#94A3B8",
};

// Simulated 30-day price history generator (deterministic per artist id)
function generatePriceHistory(basePrice, change, id) {
    const seed = id * 17;
    const pts = [];
    const startPrice = basePrice / (1 + change / 100);
    for (let i = 0; i < 30; i++) {
        const noise = Math.sin(seed + i * 0.7) * 0.08 + Math.cos(seed + i * 1.3) * 0.05;
        const progress = i / 29;
        const price = startPrice + (basePrice - startPrice) * progress + basePrice * noise;
        pts.push({ d: i, v: Math.max(0.01, price) });
    }
    pts[pts.length - 1].v = basePrice; // Ensure last point is current price
    return pts;
}

// Simulated order book
function generateOrderBook(price) {
    const bids = [];
    const asks = [];
    for (let i = 1; i <= 5; i++) {
        const bidPrice = price - i * 0.03 - Math.random() * 0.02;
        const askPrice = price + i * 0.03 + Math.random() * 0.02;
        bids.push({ price: Math.max(0.01, bidPrice).toFixed(2), qty: Math.floor(80 + Math.random() * 400) });
        asks.push({ price: askPrice.toFixed(2), qty: Math.floor(60 + Math.random() * 350) });
    }
    return { bids, asks };
}

function PriceChart({ data, color, width = "100%", height = 140 }) {
    const max = Math.max(...data.map(d => d.v));
    const min = Math.min(...data.map(d => d.v));
    const range = max - min || 0.01;
    const w = 400;
    const h = height;
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = 8 + (1 - (d.v - min) / range) * (h - 16);
        return { x, y };
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = line + ` L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width, height, display: "block" }}>
            <defs>
                <linearGradient id={`chart-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#chart-fill-${color.replace("#", "")})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill={color} />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="8" fill={color} fillOpacity="0.2" />
        </svg>
    );
}

export default function ArtistDetailModal({ artist, onClose, allNews, trendingSounds, isLoggedIn, balance, onTradeComplete }) {
    const [orderType, setOrderType] = useState("buy");
    const [orderMode, setOrderMode] = useState("market"); // market | limit
    const [qty, setQty] = useState("");
    const [limitPrice, setLimitPrice] = useState(artist?.price?.toFixed(2) || "");
    const [showConfirm, setShowConfirm] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [visible, setVisible] = useState(false);
    const [chartPeriod, setChartPeriod] = useState("1M");
    const [liveQuote, setLiveQuote] = useState(null);
    const [liveCandles, setLiveCandles] = useState(null);
    const [tradeLoading, setTradeLoading] = useState(false);
    const [tradeError, setTradeError] = useState(null);

    useEffect(() => {
        if (artist) {
            requestAnimationFrame(() => setVisible(true));
            setQty("");
            setShowConfirm(false);
            setOrderPlaced(false);
            setTradeError(null);
            setLimitPrice(artist.price?.toFixed(2) || "0.00");
            setLiveQuote(null);
            setLiveCandles(null);
            // Fetch live quote and candles
            api.getQuote(artist.id).then(q => setLiveQuote(q)).catch(() => {});
            api.getCandles(artist.id).then(c => { if (c.length > 0) setLiveCandles(c); }).catch(() => {});
        } else {
            setVisible(false);
        }
    }, [artist]);

    if (!artist) return null;

    const artistPrice = artist.price || 0;
    const artistChange = artist.change || 0;
    const artistName = artist.name || artist.stageName || "Artist";

    // Use live candles if available, else fall back to generated
    const priceHistory = liveCandles
      ? liveCandles.map((c, i) => ({ d: i, v: c.close }))
      : generatePriceHistory(artistPrice, artistChange, typeof artist.id === 'number' ? artist.id : 1);

    // Use live quote for order book if available
    const orderBook = liveQuote
      ? generateOrderBook(liveQuote.mid || artistPrice)
      : generateOrderBook(artistPrice);
    const isUp = artistChange >= 0;
    const changeColor = isUp ? C.green : C.red;
    const chartColor = isUp ? C.green : C.red;

    const quantity = parseInt(qty) || 0;
    const unitPrice = orderMode === "limit" ? parseFloat(limitPrice) || artistPrice : artistPrice;
    const totalCost = quantity * unitPrice;
    const artistNews = (allNews || []).filter(n => n.artist === artistName);
    const artistSounds = (trendingSounds || []).filter(s => s.artist === artistName);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 350);
    };

    const handlePlaceOrder = async () => {
        if (!isLoggedIn) return;
        const quantity = parseInt(qty) || 0;
        if (quantity <= 0) { setTradeError("Enter a valid quantity"); return; }
        setTradeLoading(true);
        setTradeError(null);
        try {
            if (orderType === "buy") {
                await api.buyShares(artist.id, quantity);
            } else {
                await api.sellShares(artist.id, quantity);
            }
            setOrderPlaced(true);
            if (onTradeComplete) onTradeComplete();
            setTimeout(() => {
                setOrderPlaced(false);
                setShowConfirm(false);
                setQty("");
            }, 2500);
        } catch (err) {
            setTradeError(err.message || "Trade failed");
        } finally {
            setTradeLoading(false);
        }
    };

    // Market data (use live quote when available)
    const displayPrice = liveQuote ? liveQuote.mid : artistPrice;
    const numericId = typeof artist.id === 'number' ? artist.id : 1;
    const marketCap = (displayPrice * (120000 + numericId * 35000)).toLocaleString();
    const weekHigh = (displayPrice * (1 + Math.abs(artistChange) / 200 + 0.05)).toFixed(2);
    const weekLow = (displayPrice * (1 - Math.abs(artistChange) / 300 - 0.03)).toFixed(2);
    const volStr = typeof artist.volume === 'string' ? artist.volume : (artist.volume || "10") + "";
    const avgVol = (parseFloat(volStr) * (0.8 + Math.random() * 0.4)).toFixed(1) + "K";

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 200,
                    background: "rgba(15,23,42,0.35)",
                    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
            />

            {/* Slide-in Panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(680px, 90vw)",
                zIndex: 201,
                background: "rgba(240,243,250,0.97)",
                backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                borderLeft: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
                transform: visible ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                overflowY: "auto",
                overflowX: "hidden",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.35,
            }}>
                {/* font loaded from index.html */}

                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: "sticky", top: 16, right: 16, float: "right",
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.9)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, cursor: "pointer", zIndex: 10,
                        color: C.textSec,
                        marginRight: 20, marginTop: 16,
                        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                    }}
                >✕</button>

                <div style={{ padding: "28px 32px 40px" }}>

                    {/* ─── HEADER ─── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: 18,
                            background: "rgba(255,255,255,0.8)",
                            border: "1px solid rgba(255,255,255,0.9)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 28,
                            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                        }}>{artist.emoji}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                                    {artistName}
                                </h1>
                                <span style={{
                                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    background: isUp ? C.greenSoft : C.redSoft,
                                    color: changeColor,
                                }}>
                                    {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{artistChange}%
                                </span>
                            </div>
                            <div style={{ fontSize: 13, color: C.textSec }}>{artist.genre || ""} · {artist.streams || "0"} streams</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
                                ${artistPrice.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted }}>per share</div>
                        </div>
                    </div>

                    {/* ─── PRICE CHART ─── */}
                    <div style={{
                        background: C.card,
                        backdropFilter: "blur(20px)",
                        borderRadius: 18,
                        border: `1px solid ${C.border}`,
                        boxShadow: C.shadow,
                        padding: "20px 20px 16px",
                        marginBottom: 16,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Price History</span>
                            <div style={{
                                display: "inline-flex", gap: 1, background: "rgba(0,0,0,0.04)",
                                borderRadius: 8, padding: 2,
                            }}>
                                {["1D", "1W", "1M", "3M"].map(p => (
                                    <button key={p} onClick={() => setChartPeriod(p)} style={{
                                        padding: "4px 10px", borderRadius: 6, border: "none",
                                        fontSize: 11, fontWeight: 500, cursor: "pointer",
                                        fontFamily: "'Inter', sans-serif",
                                        background: chartPeriod === p ? "#fff" : "transparent",
                                        color: chartPeriod === p ? C.text : C.textMuted,
                                        boxShadow: chartPeriod === p ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                                        transition: "all 0.15s",
                                    }}>{p}</button>
                                ))}
                            </div>
                        </div>
                        <PriceChart data={priceHistory} color={chartColor} height={130} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.textMuted }}>
                            <span>30 days ago</span>
                            <span>Today</span>
                        </div>
                    </div>

                    {/* ─── STATS GRID ─── */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: 10, marginBottom: 16,
                    }}>
                        {[
                            { label: "Market Cap", value: `$${marketCap}` },
                            { label: "24h Volume", value: artist.volume || "—" },
                            { label: "52w High", value: `$${weekHigh}` },
                            { label: "52w Low", value: `$${weekLow}` },
                        ].map(s => (
                            <div key={s.label} style={{
                                background: C.card, backdropFilter: "blur(20px)",
                                borderRadius: 14, border: `1px solid ${C.border}`,
                                boxShadow: C.shadow, padding: "14px 14px",
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "monospace" }}>{s.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ─── YOUR POSITION ─── */}
                    {artist.shares > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Your Position</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                                {(() => {
                                    const sh = artist.shares || 0;
                                    const avg = artist.avgCost || 0;
                                    const val = artist.marketValue || sh * artistPrice;
                                    const pnl = artist.unrealizedPnL !== undefined ? artist.unrealizedPnL : (artistPrice - avg) * sh;
                                    return [
                                        { label: "Shares", value: sh },
                                        { label: "Avg Cost", value: `$${avg.toFixed(2)}` },
                                        { label: "Value", value: `$${val.toFixed(2)}` },
                                        { label: "P&L", value: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`, color: pnl >= 0 ? C.green : C.red },
                                    ];
                                })().map(s => (
                                    <div key={s.label}>
                                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.label}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: s.color || C.text }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── ORDER BOOK ─── */}
                    <div style={{
                        background: C.card, backdropFilter: "blur(20px)",
                        borderRadius: 18, border: `1px solid ${C.border}`,
                        boxShadow: C.shadow, padding: 20, marginBottom: 16,
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Order Book</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            {/* Bids */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
                                    <span>Bid Price</span><span>Qty</span>
                                </div>
                                {orderBook.bids.map((b, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", padding: "5px 0",
                                        fontSize: 13, position: "relative",
                                    }}>
                                        <div style={{
                                            position: "absolute", right: 0, top: 0, bottom: 0,
                                            width: `${(b.qty / 500) * 100}%`,
                                            background: `${C.green}12`, borderRadius: 4,
                                        }} />
                                        <span style={{ fontWeight: 600, color: C.green, position: "relative" }}>${b.price}</span>
                                        <span style={{ color: C.textSec, position: "relative" }}>{b.qty}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Asks */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
                                    <span>Ask Price</span><span>Qty</span>
                                </div>
                                {orderBook.asks.map((a, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", padding: "5px 0",
                                        fontSize: 13, position: "relative",
                                    }}>
                                        <div style={{
                                            position: "absolute", right: 0, top: 0, bottom: 0,
                                            width: `${(a.qty / 500) * 100}%`,
                                            background: `${C.red}12`, borderRadius: 4,
                                        }} />
                                        <span style={{ fontWeight: 600, color: C.red, position: "relative" }}>${a.price}</span>
                                        <span style={{ color: C.textSec, position: "relative" }}>{a.qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── RELATED NEWS ─── */}
                    {artistNews.length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Latest News</div>
                            {artistNews.map((n, i) => (
                                <div key={i} style={{
                                    display: "flex", gap: 10, padding: "10px 0",
                                    borderBottom: i < artistNews.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                                        background: n.up ? C.green : C.red,
                                        boxShadow: `0 0 6px ${n.up ? C.green : C.red}50`,
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 13, lineHeight: 1.3, color: C.textSec }}>{n.text}</div>
                                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{n.time} ago</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── TRENDING SOUNDS ─── */}
                    {artistSounds.length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Trending Sounds</div>
                            {artistSounds.map((s) => {
                                const waveMax = Math.max(...s.wave);
                                return (
                                    <div key={s.id} style={{
                                        display: "flex", gap: 14, alignItems: "center", padding: "10px 0",
                                    }}>
                                        {/* Mini wave */}
                                        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 24, width: 50, flexShrink: 0 }}>
                                            {s.wave.map((v, wi) => (
                                                <div key={wi} style={{
                                                    flex: 1, borderRadius: 1.5,
                                                    height: `${(v / waveMax) * 100}%`,
                                                    background: `${C.primary}50`,
                                                }} />
                                            ))}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                                            <div style={{ fontSize: 11, color: C.textMuted }}>{s.platform} · {s.uses} uses</div>
                                        </div>
                                        <div style={{
                                            fontSize: 12, fontWeight: 700, color: C.green,
                                            padding: "3px 8px", borderRadius: 6,
                                            background: C.greenSoft,
                                        }}>{s.growth}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════
              INVEST / TRADE FORM
             ═══════════════════════════════════════════ */}
                    <div style={{
                        background: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(24px)",
                        borderRadius: 20,
                        border: `1px solid ${C.border}`,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8)",
                        padding: 24,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        {/* Decorative blob */}
                        <div style={{
                            position: "absolute", top: -30, right: -30, width: 100, height: 100,
                            borderRadius: "50%",
                            background: orderType === "buy"
                                ? "radial-gradient(circle, rgba(80,227,194,0.2) 0%, transparent 70%)"
                                : "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
                            filter: "blur(12px)", pointerEvents: "none",
                        }} />

                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.02em" }}>
                            Trade {artistName}
                        </div>

                        {/* Buy / Sell Toggle */}
                        <div style={{
                            display: "flex", gap: 2, borderRadius: 12, padding: 3,
                            background: "rgba(0,0,0,0.04)", marginBottom: 18,
                        }}>
                            {["buy", "sell"].map(t => (
                                <button key={t} onClick={() => setOrderType(t)} style={{
                                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                    textTransform: "capitalize",
                                    background: orderType === t
                                        ? (t === "buy" ? C.green : C.red)
                                        : "transparent",
                                    color: orderType === t ? "#fff" : C.textSec,
                                    boxShadow: orderType === t ? `0 2px 8px ${t === "buy" ? C.green : C.red}30` : "none",
                                    transition: "all 0.25s",
                                }}>{t}</button>
                            ))}
                        </div>

                        {/* Order Mode */}
                        <div style={{
                            display: "flex", gap: 2, borderRadius: 10, padding: 2,
                            background: "rgba(0,0,0,0.03)", marginBottom: 18,
                        }}>
                            {[{ key: "market", label: "Market Order" }, { key: "limit", label: "Limit Order" }].map(m => (
                                <button key={m.key} onClick={() => setOrderMode(m.key)} style={{
                                    flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                    background: orderMode === m.key ? "#fff" : "transparent",
                                    color: orderMode === m.key ? C.text : C.textMuted,
                                    boxShadow: orderMode === m.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                                    transition: "all 0.15s",
                                }}>{m.label}</button>
                            ))}
                        </div>

                        {/* Limit Price (if limit order) */}
                        {orderMode === "limit" && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 6 }}>
                                    Limit Price
                                </label>
                                <div style={{
                                    display: "flex", alignItems: "center",
                                    borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)",
                                    background: "#fff", overflow: "hidden",
                                }}>
                                    <span style={{ padding: "0 12px", fontSize: 16, fontWeight: 600, color: C.textSec }}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={limitPrice}
                                        onChange={e => setLimitPrice(e.target.value)}
                                        style={{
                                            flex: 1, padding: "12px 12px 12px 0",
                                            border: "none", outline: "none",
                                            fontSize: 16, fontWeight: 600,
                                            fontFamily: "'Instrument Sans', sans-serif",
                                            background: "transparent", color: C.text,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quantity Input */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 6 }}>
                                Number of Shares
                            </label>
                            <div style={{
                                display: "flex", alignItems: "center",
                                borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)",
                                background: "#fff", overflow: "hidden",
                            }}>
                                <button
                                    onClick={() => setQty(String(Math.max(0, (parseInt(qty) || 0) - 1)))}
                                    style={{
                                        width: 44, height: 44, border: "none", background: "transparent",
                                        fontSize: 20, cursor: "pointer", color: C.textSec,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >−</button>
                                <input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    placeholder="0"
                                    style={{
                                        flex: 1, padding: "12px 8px",
                                        border: "none", outline: "none",
                                        fontSize: 18, fontWeight: 600,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        textAlign: "center",
                                        background: "transparent", color: C.text,
                                    }}
                                />
                                <button
                                    onClick={() => setQty(String((parseInt(qty) || 0) + 1))}
                                    style={{
                                        width: 44, height: 44, border: "none", background: "transparent",
                                        fontSize: 20, cursor: "pointer", color: C.textSec,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >+</button>
                            </div>

                            {/* Quick amount buttons */}
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                {[1, 5, 10, 25, 50, 100].map(n => (
                                    <button key={n} onClick={() => setQty(String(n))} style={{
                                        flex: 1, padding: "6px 0", borderRadius: 8,
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        background: parseInt(qty) === n ? `${C.primary}12` : "rgba(0,0,0,0.02)",
                                        color: parseInt(qty) === n ? C.primary : C.textMuted,
                                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        transition: "all 0.15s",
                                    }}>{n}</button>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        {quantity > 0 && (
                            <div style={{
                                borderRadius: 14, padding: 16, marginBottom: 18,
                                background: "rgba(0,0,0,0.02)",
                                border: "1px solid rgba(0,0,0,0.04)",
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
                                    Order Summary
                                </div>
                                {[
                                    { label: `${quantity} share${quantity !== 1 ? "s" : ""} × $${unitPrice.toFixed(2)}`, value: "" },
                                    { label: "Estimated Total", value: `$${totalCost.toFixed(2)}`, bold: true },
                                    { label: "Order Type", value: `${orderMode === "market" ? "Market" : "Limit"} · ${orderType === "buy" ? "Buy" : "Sell"}` },
                                ].map((row, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "6px 0",
                                        borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                                    }}>
                                        <span style={{ fontSize: 13, color: row.bold ? C.text : C.textSec, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                                        <span style={{ fontSize: row.bold ? 18 : 13, fontWeight: row.bold ? 700 : 500, color: C.text }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Submit Button */}
                        {!showConfirm ? (
                            <button
                                onClick={() => quantity > 0 && setShowConfirm(true)}
                                disabled={quantity <= 0}
                                style={{
                                    width: "100%", padding: "14px 0",
                                    borderRadius: 14, border: "none",
                                    fontSize: 15, fontWeight: 700, cursor: quantity > 0 ? "pointer" : "not-allowed",
                                    fontFamily: "'Instrument Sans', sans-serif",
                                    background: quantity > 0
                                        ? (orderType === "buy"
                                            ? `linear-gradient(135deg, ${C.green}, ${C.accentDark})`
                                            : `linear-gradient(135deg, ${C.red}, #DC2626)`)
                                        : "rgba(0,0,0,0.06)",
                                    color: quantity > 0 ? "#fff" : C.textMuted,
                                    boxShadow: quantity > 0 ? `0 4px 16px ${orderType === "buy" ? C.green : C.red}30` : "none",
                                    transition: "all 0.3s",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {quantity > 0
                                    ? `Review ${orderType === "buy" ? "Buy" : "Sell"} Order`
                                    : "Enter Quantity"}
                            </button>
                        ) : (
                            <div>
                                {orderPlaced ? (
                                    <div style={{
                                        padding: "18px 0", textAlign: "center",
                                        borderRadius: 14,
                                        background: `linear-gradient(135deg, ${orderType === "buy" ? C.green : C.red}15, ${orderType === "buy" ? C.accent : "#DC2626"}10)`,
                                        border: `1px solid ${orderType === "buy" ? C.green : C.red}30`,
                                    }}>
                                        <div style={{ fontSize: 24, marginBottom: 4 }}>✓</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: orderType === "buy" ? C.green : C.red }}>
                                            Order Placed!
                                        </div>
                                        <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
                                            {orderType === "buy" ? "Bought" : "Sold"} {quantity} share{quantity !== 1 ? "s" : ""} of {artistName}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            padding: 14, borderRadius: 14, marginBottom: 10,
                                            background: `${orderType === "buy" ? C.green : C.red}08`,
                                            border: `1px solid ${orderType === "buy" ? C.green : C.red}20`,
                                            fontSize: 13, color: C.textSec, textAlign: "center", lineHeight: 1.3,
                                        }}>
                                            Confirm: {orderType === "buy" ? "Buy" : "Sell"} <strong>{quantity}</strong> share{quantity !== 1 ? "s" : ""} of <strong>{artistName}</strong> for <strong>${totalCost.toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <button
                                                onClick={() => setShowConfirm(false)}
                                                style={{
                                                    flex: 1, padding: "12px 0", borderRadius: 12,
                                                    border: "1px solid rgba(0,0,0,0.08)",
                                                    background: "#fff", color: C.textSec,
                                                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                                                    fontFamily: "'Instrument Sans', sans-serif",
                                                }}
                                            >Cancel</button>
                                            <button
                                                onClick={handlePlaceOrder}
                                                style={{
                                                    flex: 2, padding: "12px 0", borderRadius: 12,
                                                    border: "none",
                                                    background: orderType === "buy"
                                                        ? `linear-gradient(135deg, ${C.green}, ${C.accentDark})`
                                                        : `linear-gradient(135deg, ${C.red}, #DC2626)`,
                                                    color: "#fff",
                                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                                    fontFamily: "'Instrument Sans', sans-serif",
                                                    boxShadow: `0 4px 16px ${orderType === "buy" ? C.green : C.red}30`,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.06em",
                                                }}
                                            >{tradeLoading ? "Executing..." : `Confirm ${orderType === "buy" ? "Purchase" : "Sale"}`}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Trade error */}
                        {tradeError && (
                            <div style={{
                                marginTop: 12, padding: "10px 14px", borderRadius: 10,
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                fontSize: 13, color: C.red, textAlign: "center",
                            }}>{tradeError}</div>
                        )}

                        {/* Live quote info */}
                        {liveQuote && (
                            <div style={{
                                marginTop: 16, padding: 14, borderRadius: 14,
                                background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)",
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>Live Quote</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: C.textMuted }}>Bid</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>${liveQuote.bid.toFixed(4)}</div>
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 10, color: C.textMuted }}>Mid</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>${liveQuote.mid.toFixed(4)}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color: C.textMuted }}>Ask</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>${liveQuote.ask.toFixed(4)}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, textAlign: "center" }}>
                                    Spread: {(liveQuote.spreadBps / 100).toFixed(2)}%
                                </div>
                            </div>
                        )}

                        {/* Earnings Band */}
                        <div style={{ marginTop: 16 }}>
                            <EarningsBand artistId={artist.id} />
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
