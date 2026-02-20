import { useState, useEffect } from "react";
import { Bell, ArrowLeft, MapPin, Calendar, Tag, TrendingUp, TrendingDown, DollarSign, Music, BarChart3, Wallet, AlertTriangle, Star } from "lucide-react";
import ArtistDetailModal from "./ArtistDetailModal";
import NotificationsPage from "./NotificationsPage";
import WalletPanel from "./WalletPanel";
import OrderHistory from "./OrderHistory";
import EarningsBand from "./EarningsBand";
import { useAuth } from "./AuthContext";
import * as api from "./api";
import { GENRE_MAP } from "./colors";

// ─── Crescendo Dashboard ─── glassmorphic light mode, neon blob accents ───

const C = {
  bg: "#E8EEF8",
  card: "rgba(255,255,255,0.72)",
  cardSolid: "#FFFFFF",
  border: "rgba(255,255,255,0.9)",
  shadow: "0 2px 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
  shadowHover: "0 4px 32px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.9)",
  primary: "#1E40AF",
  primarySoft: "rgba(30,64,175,0.08)",
  accent: "#38BDF8",
  accentDark: "#0EA5E9",
  green: "#36D7B7",
  greenSoft: "rgba(54,215,183,0.1)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.1)",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  blob1: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 70%)",
  blob2: "radial-gradient(circle, rgba(30,64,175,0.35) 0%, transparent 70%)",
  blob3: "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)"
};

// Helper to generate avatar URL from artist name
function avatarUrl(name, size = 64) {
  const colors = ["1E40AF", "38BDF8", "0EA5E9", "3B82F6", "60A5FA", "1D4ED8"];
  const idx = name.length % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${colors[idx]}&color=fff&bold=true&format=svg`;
}

// Ticker lookup — maps artist name → 4-letter stock abbreviation
const TICKERS = {
  "2hollis": "HLLS",
  "Snow Strippers": "SNWS",
  "Malcom Todd": "MTOD",
  "Men I Trust": "MNIT",
  "King Krule": "KRKL",
  "Ian": "IANN",
  "Esdeekid": "ESDK",
  "Doechii": "DCHI",
  "Feng": "FENG",
  "The Tulips": "TULP",
  "JPEGMAFIA": "JPEG",
  "Matt Maltese": "MMLT",
  "Solène": "SOLN",
  "KODA": "KODA",
  "Mira Voss": "MRVS",
  "Rommulus": "ROML",
  "Nate Sib": "NSIB",
  "Steve Lacy": "SLCY",
  "Sombr": "SMBR",
};

export function getTicker(name) {
  return TICKERS[name] || name.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase();
}

const mockArtists = [
  { id: 1, name: "2hollis", ticker: "HLLS", genre: "Experimental Hip-Hop", price: 2.47, change: +18.3, volume: "42.1K", shares: 120, avgCost: 1.82, streams: "2.1M", bio: "Experimental hip-hop artist blending ambient production with raw lyricism.", sharesOutstanding: 8500, maxShares: 15000, revenueSharePct: 12, circuitBreakerStatus: "normal" },
  { id: 2, name: "Snow Strippers", ticker: "SNWS", genre: "Electronic / Post-Punk", price: 5.12, change: +7.2, volume: "118K", shares: 45, avgCost: 4.30, streams: "8.4M", bio: "Brooklyn-based duo fusing industrial electronics with post-punk energy.", sharesOutstanding: 14200, maxShares: 20000, revenueSharePct: 8, circuitBreakerStatus: "normal" },
  { id: 3, name: "Malcom Todd", ticker: "MTOD", genre: "R&B / Soul", price: 3.88, change: +31.5, volume: "67.3K", shares: 200, avgCost: 2.10, streams: "5.2M", bio: "Austin-based R&B vocalist crafting intimate, genre-bending soul music.", sharesOutstanding: 11000, maxShares: 18000, revenueSharePct: 15, circuitBreakerStatus: "normal" },
  { id: 4, name: "Men I Trust", ticker: "MNIT", genre: "Dream Pop", price: 4.74, change: +4.8, volume: "88.2K", shares: 500, avgCost: 3.55, streams: "14.4M", bio: "Montreal trio known for lush, cinematic dream pop and understated cool.", sharesOutstanding: 4000, maxShares: 25000, revenueSharePct: 5, circuitBreakerStatus: "normal" },
  { id: 5, name: "King Krule", ticker: "KRKL", genre: "Art Rock / Jazz", price: 3.03, change: -2.1, volume: "15.8K", shares: 0, avgCost: 0, streams: "8.9M", bio: "South London polymath blending jazz, punk, and spoken word into raw sonic landscapes.", sharesOutstanding: 6200, maxShares: 12000, revenueSharePct: 10, circuitBreakerStatus: "tripped" },
  { id: 6, name: "Ian", ticker: "IANN", genre: "Lo-fi R&B", price: 1.95, change: -5.4, volume: "31.0K", shares: 0, avgCost: 0, streams: "3.7M", bio: "Chicago-based lo-fi R&B artist resonating with Gen-Z through organic, bedroom-produced tracks.", sharesOutstanding: 9800, maxShares: 16000, revenueSharePct: 11, circuitBreakerStatus: "normal" }
];

// Mock trade history
const tradeHistory = [
  { id: 1, artist: "Malcom Todd", type: "Buy", qty: 50, price: 2.10, total: 105.00, status: "filled", date: "2026-02-18" },
  { id: 2, artist: "Snow Strippers", type: "Buy", qty: 20, price: 4.50, total: 90.00, status: "filled", date: "2026-02-17" },
  { id: 3, artist: "2hollis", type: "Buy", qty: 30, price: 1.95, total: 58.50, status: "filled", date: "2026-02-15" },
  { id: 4, artist: "Men I Trust", type: "Buy", qty: 100, price: 3.60, total: 360.00, status: "pending", date: "2026-02-19" },
  { id: 5, artist: "Malcom Todd", type: "Sell", qty: 10, price: 3.80, total: 38.00, status: "cancelled", date: "2026-02-19" },
  { id: 6, artist: "2hollis", type: "Buy", qty: 25, price: 2.30, total: 57.50, status: "filled", date: "2026-02-14" },
];

// Mock royalty payments
const royaltyPayments = [
  { id: 1, artist: "Malcom Todd", amount: 42.50, type: "Streaming", date: "2026-02-15" },
  { id: 2, artist: "Snow Strippers", amount: 18.30, type: "Sync License", date: "2026-02-12" },
  { id: 3, artist: "2hollis", amount: 12.75, type: "Streaming", date: "2026-02-10" },
  { id: 4, artist: "Men I Trust", amount: 25.20, type: "Streaming", date: "2026-02-08" },
  { id: 5, artist: "Malcom Todd", amount: 31.00, type: "Merchandise", date: "2026-02-05" },
  { id: 6, artist: "Snow Strippers", amount: 22.10, type: "Live Performance", date: "2026-02-01" },
];

const news = [
  { artist: "Malcom Todd", text: "SXSW showcase draws record crowd, three new songs debuted", time: "2h", up: true },
  { artist: "Snow Strippers", text: "Sold-out Brooklyn Steel residency announced for April", time: "5h", up: true },
  { artist: "2hollis", text: "New EP 'Phantom Thread' hits 2M streams in first week", time: "8h", up: true },
  { artist: "King Krule", text: "Surprise album 'Concrete Garden' polarizes critics", time: "1d", up: false }
];

const newsArticles = [
  { id: 1, artist: "Malcom Todd", headline: "SXSW showcase draws record crowd, three new songs debuted", category: "Touring", location: "Austin, TX", year: "2026", up: true, description: "Malcom Todd's SXSW set drew an estimated 4,000 fans to the outdoor stage at Auditorium Shores, making it one of the most-attended showcases of the festival. He debuted three unreleased tracks from an upcoming project, sending his streaming numbers surging overnight." },
  { id: 2, artist: "Snow Strippers", headline: "Sold-out Brooklyn Steel residency announced for April", category: "Touring", location: "Brooklyn, NY", year: "2026", up: true, description: "Snow Strippers have announced a four-night residency at Brooklyn Steel, with all dates selling out within minutes. The run will feature rotating visual installations and guest collaborators each night." },
  { id: 3, artist: "2hollis", headline: "New EP 'Phantom Thread' hits 2M streams in first week", category: "Releases", location: "Los Angeles, CA", year: "2026", up: true, description: "2hollis's surprise-dropped EP 'Phantom Thread' crossed two million combined streams in its first seven days, driven by the standout track 'Dissolve.' The project has been praised for its genre-blending production." },
  { id: 4, artist: "King Krule", headline: "Surprise album 'Concrete Garden' polarizes critics", category: "Releases", location: "London, UK", year: "2026", up: false, description: "King Krule's unannounced album 'Concrete Garden' arrived with no prior marketing, splitting critical opinion between those who see it as a bold evolution and others who find it inaccessible. Fan reception has been warmer, with several tracks trending on social platforms." },
  { id: 5, artist: "Men I Trust", headline: "Headlining Pitchfork Music Festival 2026", category: "Touring", location: "Chicago, IL", year: "2026", up: true, description: "Men I Trust have been announced as headliners for the 2026 Pitchfork Music Festival, marking their largest headline slot to date. The band will close out the Saturday night program." },
  { id: 6, artist: "Ian", headline: "Signs exclusive sync deal with A24 Films", category: "Business", location: "New York, NY", year: "2026", up: true, description: "Ian has signed an exclusive synchronization licensing deal with A24, allowing the studio first-look access to his catalog for upcoming film and television projects. The deal is reportedly worth seven figures over three years." },
];

// Recommended artists — "You Might Like"
const recommendedArtists = [
  { id: 101, name: "Rommulus", ticker: "ROML", genre: "Alt R&B", price: 3.24, change: +14.6, volume: "56.8K", streams: "4.1M", bio: "Genre-defying vocalist weaving experimental R&B with cinematic textures.", sharesOutstanding: 7200, maxShares: 15000, revenueSharePct: 10, circuitBreakerStatus: "normal",
    ohlc: [{o:2.80,h:2.95,l:2.72,c:2.88},{o:2.88,h:3.01,l:2.82,c:2.95},{o:2.95,h:2.98,l:2.78,c:2.82},{o:2.82,h:2.94,l:2.75,c:2.91},{o:2.91,h:3.10,l:2.88,c:3.05},{o:3.05,h:3.12,l:2.96,c:2.99},{o:2.99,h:3.08,l:2.90,c:3.04},{o:3.04,h:3.18,l:3.00,c:3.14},{o:3.14,h:3.22,l:3.05,c:3.10},{o:3.10,h:3.15,l:2.98,c:3.02},{o:3.02,h:3.20,l:3.00,c:3.18},{o:3.18,h:3.28,l:3.12,c:3.24}] },
  { id: 102, name: "Nate Sib", ticker: "NSIB", genre: "Indie Pop", price: 1.87, change: +22.3, volume: "33.5K", streams: "1.8M", bio: "Bedroom-pop producer crafting hook-driven anthems with lo-fi warmth.", sharesOutstanding: 5400, maxShares: 12000, revenueSharePct: 12, circuitBreakerStatus: "normal",
    ohlc: [{o:1.45,h:1.52,l:1.40,c:1.48},{o:1.48,h:1.55,l:1.44,c:1.52},{o:1.52,h:1.58,l:1.46,c:1.50},{o:1.50,h:1.62,l:1.48,c:1.60},{o:1.60,h:1.68,l:1.55,c:1.58},{o:1.58,h:1.65,l:1.52,c:1.62},{o:1.62,h:1.72,l:1.58,c:1.70},{o:1.70,h:1.78,l:1.65,c:1.74},{o:1.74,h:1.80,l:1.68,c:1.72},{o:1.72,h:1.82,l:1.70,c:1.80},{o:1.80,h:1.90,l:1.76,c:1.85},{o:1.85,h:1.92,l:1.80,c:1.87}] },
  { id: 103, name: "Steve Lacy", ticker: "SLCY", genre: "Neo-Soul / Funk", price: 6.41, change: +5.8, volume: "204K", streams: "28.5M", bio: "Grammy-winning multi-instrumentalist pushing neo-soul into uncharted territory.", sharesOutstanding: 18500, maxShares: 30000, revenueSharePct: 6, circuitBreakerStatus: "normal",
    ohlc: [{o:5.90,h:6.05,l:5.82,c:5.98},{o:5.98,h:6.10,l:5.88,c:5.92},{o:5.92,h:6.08,l:5.85,c:6.04},{o:6.04,h:6.18,l:5.95,c:6.12},{o:6.12,h:6.20,l:6.00,c:6.05},{o:6.05,h:6.15,l:5.92,c:6.10},{o:6.10,h:6.28,l:6.02,c:6.22},{o:6.22,h:6.35,l:6.15,c:6.18},{o:6.18,h:6.30,l:6.08,c:6.25},{o:6.25,h:6.40,l:6.18,c:6.32},{o:6.32,h:6.45,l:6.25,c:6.38},{o:6.38,h:6.50,l:6.30,c:6.41}] },
  { id: 104, name: "Sombr", ticker: "SMBR", genre: "Dark Pop", price: 2.15, change: +38.7, volume: "29.1K", streams: "980K", bio: "Anonymous dark-pop project blending haunting vocals with distorted synths.", sharesOutstanding: 3800, maxShares: 10000, revenueSharePct: 14, circuitBreakerStatus: "normal",
    ohlc: [{o:1.42,h:1.50,l:1.35,c:1.46},{o:1.46,h:1.55,l:1.40,c:1.52},{o:1.52,h:1.48,l:1.38,c:1.44},{o:1.44,h:1.58,l:1.42,c:1.55},{o:1.55,h:1.70,l:1.50,c:1.68},{o:1.68,h:1.78,l:1.60,c:1.72},{o:1.72,h:1.85,l:1.65,c:1.82},{o:1.82,h:1.95,l:1.78,c:1.90},{o:1.90,h:2.02,l:1.85,c:1.98},{o:1.98,h:2.10,l:1.92,c:2.05},{o:2.05,h:2.18,l:2.00,c:2.12},{o:2.12,h:2.22,l:2.08,c:2.15}] },
];

// NOTE: portfolioHoldings, totalValue, totalReturn, totalPct computed inside component from live data
const totalRoyalties = royaltyPayments.reduce((s, r) => s + r.amount, 0);

const graphWeek = [
  { d: "Mon", v: 1420 }, { d: "Tue", v: 1380 }, { d: "Wed", v: 1510 },
  { d: "Thu", v: 1475 }, { d: "Fri", v: 1620 }, { d: "Sat", v: 1590 }, { d: "Sun", v: 1734 }
];

function Blob({ style }) {
  return <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none", ...style }} />;
}

function ProgressBar({ value, max, color1, color2, label1, label2, val1, val2 }) {
  const pct = Math.min(value / max * 100, 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: C.textSec }}>
        <span>{label1}</span>
        <span style={{ fontWeight: 700, color: C.text, fontSize: 18, fontFamily: "'Inter', sans-serif" }}>${max.toLocaleString()}</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: "rgba(0,0,0,0.04)", overflow: "hidden", position: "relative" }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: color1,
          transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.textMuted }}>
        <span>${val1.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[0]}</span></span>
        <span>${val2.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[1]}</span></span>
      </div>
    </div>
  );
}

// Supply meter component
function SupplyMeter({ outstanding, max, compact = false }) {
  const pct = Math.min(outstanding / max * 100, 100);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: compact ? 5 : 7, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: pct > 80 ? `linear-gradient(90deg, #F59E0B, #EF4444)` : `linear-gradient(90deg, ${C.accent}, ${C.primary})`,
          transition: "width 0.8s ease"
        }} />
      </div>
      <div style={{ fontSize: compact ? 9 : 10, color: C.textMuted, marginTop: 3, fontFamily: "monospace" }}>
        {outstanding.toLocaleString()} / {max.toLocaleString()} shares
      </div>
    </div>
  );
}

// Status pill for trade history
function StatusPill({ status }) {
  const styles = {
    filled: { bg: "rgba(56,189,248,0.12)", color: "#38BDF8", label: "Filled" },
    pending: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "Pending" },
    cancelled: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", label: "Cancelled" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color
    }}>{s.label}</span>
  );
}

// Empty state component
function EmptyState({ icon, title, description, cta, onCta }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 20px", textAlign: "center"
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: `linear-gradient(135deg, ${C.primarySoft}, rgba(80,227,194,0.1))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16
      }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: C.text }}>{title}</div>
      <div style={{ fontSize: 14, color: C.textSec, maxWidth: 320, marginBottom: 20, lineHeight: 1.5 }}>{description}</div>
      {cta && (
        <button onClick={onCta} style={{
          padding: "10px 24px", borderRadius: 12, border: "none",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          background: C.primary, color: "#fff",
          boxShadow: `0 4px 16px ${C.primary}40`
        }}>{cta}</button>
      )}
    </div>
  );
}

function MiniChart({ data, color, w = 100, h = 36 }) {
  if (!data || data.length === 0) return <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }} />;
  const max = Math.max(...data.map((d) => d.v));
  const min = Math.min(...data.map((d) => d.v));
  const range = max - min || 1;
  const divisor = Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => {
    const x = i / divisor * w;
    const y = 4 + (1 - (d.v - min) / range) * (h - 8);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = line + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
      <defs>
        <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#fill-${color.replace("#", "")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
    </svg>
  );
}

function SparkLine({ positive, w = 60, h = 20 }) {
  const data = positive ?
    [4, 6, 5, 8, 7, 10, 9, 13, 12, 15] :
    [14, 12, 13, 10, 11, 8, 9, 7, 8, 6];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${i / (data.length - 1) * w},${2 + (1 - (v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={positive ? C.green : C.red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// No more generateCandlesticks — all candle data comes from backend API

// CandlestickChart now uses API-provided OHLCV data (no randomness)
// candles format: [{t: "YYYY-MM-DD", o, h, l, c, v}]
function CandlestickChart({ candles, w = 720, h = 380 }) {
  const [hover, setHover] = useState(null);

  if (candles === null || candles === undefined) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
        Loading chart data...
      </div>
    );
  }
  if (!candles.length) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
        No chart data available
      </div>
    );
  }

  const allHigh = Math.max(...candles.map((c) => c.h));
  const allLow = Math.min(...candles.map((c) => c.l));
  const range = allHigh - allLow || 0.01;
  const barW = Math.max((w - 60) / candles.length - 2, 4);
  const toY = (v) => 20 + (1 - (v - allLow) / range) * (h - 60);
  const steps = 6;
  const yLabels = [];
  for (let i = 0; i <= steps; i++) {
    const val = allLow + range / steps * i;
    yLabels.push({ val, y: toY(val) });
  }
  const lastCandle = candles[candles.length - 1];
  const lastY = toY(lastCandle.c);

  // X-axis date labels (show ~6 evenly spaced)
  const xLabels = [];
  const tickCount = Math.min(6, candles.length);
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.round((i / Math.max(tickCount - 1, 1)) * (candles.length - 1));
    const candle = candles[idx];
    const dateStr = candle.t || '';
    let label = dateStr;
    if (dateStr.match && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(dateStr + "T12:00:00Z");
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    xLabels.push({
      x: 55 + idx * ((w - 60) / candles.length) + barW / 2,
      label,
    });
  }

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width * w;
    const mouseY = (e.clientY - rect.top) / rect.height * h;
    let closest = 0;
    let closestDist = Infinity;
    candles.forEach((c, i) => {
      const cx = 55 + i * ((w - 60) / candles.length) + barW / 2;
      const dist = Math.abs(mouseX - cx);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHover({ idx: closest, mouseX, mouseY });
  };

  const hc = hover !== null ? candles[hover.idx] : null;
  const hcX = hover !== null ? 55 + hover.idx * ((w - 60) / candles.length) + barW / 2 : 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: "100%", cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}>
      {yLabels.map((l, i) =>
        <g key={i}>
          <line x1={50} y1={l.y} x2={w} y2={l.y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
          <text x={4} y={l.y + 4} fontSize="10" fill="#94A3B8" fontFamily="monospace">${l.val.toFixed(2)}</text>
        </g>
      )}
      {candles.map((c, i) => {
        const x = 55 + i * ((w - 60) / candles.length) + barW / 2;
        const isUp = c.c >= c.o;
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(bodyBot - bodyTop, 1);
        const isHovered = hover && hover.idx === i;
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={isUp ? "#38BDF8" : "#EF4444"} strokeWidth={isHovered ? 2 : 1} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} rx={1} fill={isUp ? "#38BDF8" : "#EF4444"} opacity={isHovered ? 1 : 0.9} />
          </g>
        );
      })}
      {/* X-axis date labels */}
      {xLabels.map((tick, i) =>
        <text key={i} x={tick.x} y={h - 8} textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="monospace">{tick.label}</text>
      )}
      <line x1={50} y1={lastY} x2={w} y2={lastY} stroke="#1E40AF" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />
      <rect x={0} y={lastY - 10} width={52} height={20} rx={4} fill="#1E40AF" />
      <text x={26} y={lastY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">{lastCandle.c.toFixed(2)}</text>
      {hover && hc &&
        <g>
          <line x1={hcX} y1={20} x2={hcX} y2={h - 20} stroke="rgba(30,64,175,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={50} y1={hover.mouseY} x2={w} y2={hover.mouseY} stroke="rgba(30,64,175,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          <rect x={0} y={hover.mouseY - 10} width={52} height={20} rx={4} fill="rgba(30,64,175,0.7)" />
          <text x={26} y={hover.mouseY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">
            {(allLow + (1 - (hover.mouseY - 20) / (h - 60)) * range).toFixed(2)}
          </text>
          {(() => {
            const tooltipW = 160;
            const tooltipH = 96;
            const tx = hcX + 15 + tooltipW > w ? hcX - tooltipW - 15 : hcX + 15;
            const ty = Math.max(5, Math.min(hover.mouseY - tooltipH / 2, h - tooltipH - 5));
            const isUp = hc.c >= hc.o;
            const dateLabel = hc.t && hc.t.match && hc.t.match(/^\d{4}-\d{2}-\d{2}$/)
              ? new Date(hc.t + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : '';
            return (
              <g>
                <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={8} fill="rgba(15,23,42,0.92)" />
                <text x={tx + 10} y={ty + 16} fontSize="10" fontWeight="700" fill="#fff" fontFamily="monospace">{dateLabel || "OHLC Data"}</text>
                <text x={tx + 10} y={ty + 34} fontSize="9" fill="#94A3B8" fontFamily="monospace">O: <tspan fill={isUp ? "#38BDF8" : "#EF4444"}>{hc.o.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 48} fontSize="9" fill="#94A3B8" fontFamily="monospace">H: <tspan fill="#fff">{hc.h.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 62} fontSize="9" fill="#94A3B8" fontFamily="monospace">L: <tspan fill="#fff">{hc.l.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 76} fontSize="9" fill="#94A3B8" fontFamily="monospace">C: <tspan fill={isUp ? "#38BDF8" : "#EF4444"}>{hc.c.toFixed(4)}</tspan></text>
              </g>
            );
          })()}
        </g>
      }
    </svg>
  );
}

function MarketsPage({ artists, C, fadeIn, guardedClick, setSelectedArtist, Card, TabPill, auth, isLoggedIn, onTradeComplete, genreFilter, setGenreFilter, watchlist, toggleWatchlist }) {
  const [viewMode, setViewMode] = useState("overview"); // "overview" | "detail"
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chartPeriod, setChartPeriod] = useState("1M");
  const [tradeTab, setTradeTab] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);
  const [allCandles, setAllCandles] = useState(null); // all candles, no date filter
  const [analysisData, setAnalysisData] = useState(null);
  const [overviewCandles, setOverviewCandles] = useState({}); // { artistId: candles[] }

  const selected = artists[selectedIdx];
  const isTripped = selected?.circuitBreakerStatus === "tripped";

  // Slice candles based on period selection (frontend filtering)
  const sliceCandles = (candles, period) => {
    if (!candles || !candles.length) return candles;
    let days;
    switch (period) {
      case "1D": days = 1; break;
      case "5D": days = 5; break;
      case "1W": days = 7; break;
      case "2W": days = 14; break;
      case "1M": default: days = 30; break;
    }
    return candles.slice(-days);
  };

  const apiCandles = sliceCandles(allCandles, chartPeriod);

  // Fetch mini-candles for all artists on mount (for overview sparklines)
  useEffect(() => {
    artists.forEach(a => {
      if (!a.id) return;
      api.getDailyCandles(a.id)
        .then(candles => setOverviewCandles(prev => ({ ...prev, [a.id]: candles })))
        .catch(() => {});
    });
  }, [artists.map(a => a.id).join(",")]);

  // Fetch live quote when selected artist changes (detail view)
  useEffect(() => {
    if (viewMode !== "detail" || !selected?.id) return;
    setLiveQuote(null);
    api.getQuote(selected.id).then(q => setLiveQuote(q)).catch(() => {});
  }, [selected?.id, viewMode]);

  // Fetch ALL candles when artist changes (no date range — backend returns full history)
  useEffect(() => {
    if (viewMode !== "detail" || !selected?.id) return;
    setAllCandles(null);
    api.getDailyCandles(selected.id)
      .then(candles => setAllCandles(candles))
      .catch(() => setAllCandles([]));
    api.getFinancialAnalysis(selected.id)
      .then(analysis => setAnalysisData(analysis))
      .catch(() => setAnalysisData(null));
  }, [selected?.id, viewMode]);

  const displayPrice = liveQuote?.mid || selected?.price || 0;
  const displayBid = liveQuote?.bid || selected?.price || 0;
  const displayAsk = liveQuote?.ask || selected?.price || 0;
  const qty = parseInt(quantity) || 0;
  const unitPrice = tradeTab === "BUY" ? displayAsk : displayBid;
  const totalCost = qty * unitPrice;

  const genres = ["All", ...new Set(artists.map(a => a.genre).filter(Boolean))];
  const filteredArtists = genreFilter === "All" ? artists : artists.filter(a => a.genre === genreFilter);

  const handleTrade = async () => {
    if (!isLoggedIn) { setTradeMsg({ type: "error", text: "Please log in to trade." }); return; }
    if (qty <= 0) { setTradeMsg({ type: "error", text: "Enter a valid quantity." }); return; }
    setTradeLoading(true);
    setTradeMsg(null);
    try {
      if (tradeTab === "BUY") {
        await api.buyShares(selected.id, qty);
      } else {
        await api.sellShares(selected.id, qty);
      }
      setTradeMsg({ type: "success", text: `${tradeTab === "BUY" ? "Bought" : "Sold"} ${qty} shares of ${selected.name} at $${unitPrice.toFixed(2)}` });
      setQuantity("");
      if (onTradeComplete) onTradeComplete();
    } catch (err) {
      setTradeMsg({ type: "error", text: err.message || "Trade failed." });
    } finally {
      setTradeLoading(false);
    }
  };

  const openDetail = (idx) => {
    setSelectedIdx(idx);
    setViewMode("detail");
    setTradeMsg(null);
    setQuantity("");
    setAllCandles(null);
    setAnalysisData(null);
    setLiveQuote(null);
  };

  // ── OVERVIEW MODE: Grid of all artists ──

  if (viewMode === "overview") {
    return (
      <div style={fadeIn(0.1)}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>Markets</h1>
          <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Browse all artist tokens</p>
        </div>
        {/* Genre filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(g)} style={{
              padding: "5px 14px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
              background: genreFilter === g ? "#fff" : "rgba(0,0,0,0.04)",
              color: genreFilter === g ? C.text : C.textMuted,
              boxShadow: genreFilter === g ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s"
            }}>{g}</button>
          ))}
        </div>

        {/* Artist overview grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filteredArtists.map((a) => {
            const idx = artists.indexOf(a);
            const candles = overviewCandles[a.id] || [];
            const miniData = candles.length > 0
              ? candles.slice(-14).map(c => ({ v: c.c }))
              : [{ v: a.price || 1 }];
            const isUp = a.change >= 0;
            const totalReturn = candles.length >= 2 ? ((candles[candles.length - 1].c / candles[0].c - 1) * 100) : a.change;
            return (
              <Card key={a.id} style={{ padding: 0, cursor: "pointer", overflow: "hidden" }} hover>
                <div onClick={() => openDetail(idx)} style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <img
                      src={avatarUrl(a.name, 52)} alt={a.name}
                      style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: C.primarySoft, color: C.primary, fontFamily: "monospace",
                        }}>{a.symbol || getTicker(a.name)}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{a.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{a.genre}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWatchlist(a.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0, color: watchlist.includes(a.id) ? "#F59E0B" : C.textMuted }}
                    >{watchlist.includes(a.id) ? "★" : "☆"}</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>${a.price.toFixed(2)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isUp ? C.green : C.red, marginTop: 4 }}>
                        {isUp ? "▲" : "▼"} {Math.abs(a.change).toFixed(1)}% today
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>30d</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: totalReturn >= 0 ? C.green : C.red, fontFamily: "monospace" }}>
                        {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {/* Mini chart */}
                  <div style={{ height: 44 }}>
                    <MiniChart data={miniData} color={isUp ? C.green : C.red} h={44} />
                  </div>
                </div>
                {/* Quick trade bar */}
                <div style={{
                  display: "flex", borderTop: "1px solid rgba(0,0,0,0.05)",
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetail(idx); }}
                    style={{
                      flex: 1, padding: "10px 0", border: "none", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.04em",
                      background: "transparent", color: C.primary,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.target.style.background = "rgba(30,64,175,0.04)"}
                    onMouseLeave={e => e.target.style.background = "transparent"}
                  >VIEW & TRADE</button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DETAIL MODE: Selected artist chart + trading ──

  if (!selected) return null;

  return (
    <div style={fadeIn(0.1)}>
      {/* Back to overview */}
      <button
        onClick={() => setViewMode("overview")}
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
          fontSize: 13, fontWeight: 600, color: C.textSec, cursor: "pointer", marginBottom: 16,
          fontFamily: "'Inter', sans-serif", padding: 0
        }}>
        <ArrowLeft size={16} /> Back to Markets
      </button>

      {/* Circuit breaker warning - info only, doesn't block */}
      {isTripped && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 18px",
          borderRadius: 14, marginBottom: 16,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: C.red, fontSize: 13, fontWeight: 600
        }}>
          <AlertTriangle size={18} /> Trading paused for <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selected.symbol || getTicker(selected.name)}</span> {selected.name} — circuit breaker active
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 16 }}>
        {/* Left: Chart */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <img
                  src={avatarUrl(selected.name, 44)} alt={selected.name}
                  onClick={() => setSelectedArtist(selected)}
                  style={{ width: 22, height: 22, borderRadius: 6, cursor: "pointer" }}
                />
                {selected.symbol && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                    background: C.primarySoft, color: C.primary, fontFamily: "monospace",
                    letterSpacing: "0.08em"
                  }}>{selected.symbol}</span>
                )}
                <span
                  onClick={() => setSelectedArtist(selected)}
                  style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = C.primary}
                  onMouseLeave={e => e.target.style.color = C.text}
                ><span style={{ fontSize: 11, fontWeight: 700, color: selected.change >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 6 }}>{selected.ticker || getTicker(selected.name)}</span>{selected.name} / USD</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>${displayPrice.toFixed(2)}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: selected.change >= 0 ? C.green : C.red }}>
                  {selected.change >= 0 ? "▲" : "▼"} {Math.abs(selected.change).toFixed(1)}%
                </span>
              </div>
              {liveQuote && (
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  Bid: ${displayBid.toFixed(2)} · Ask: ${displayAsk.toFixed(2)} · Spread: {liveQuote.spreadBps}bps
                </div>
              )}
            </div>
            <TabPill options={["1M", "2W", "1W", "5D", "1D"]} active={chartPeriod} onChange={setChartPeriod} />
          </div>
          <div style={{ width: "100%", height: 360 }}>
            <CandlestickChart candles={apiCandles} />
          </div>
          {/* Financial Analysis Summary */}
          {analysisData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              {[
                { label: "Return", value: `${analysisData.returnPct >= 0 ? '+' : ''}${analysisData.returnPct.toFixed(2)}%`, color: analysisData.returnPct >= 0 ? "#38BDF8" : "#EF4444" },
                { label: "Volatility", value: `${analysisData.annualizedVolatility.toFixed(1)}%`, color: "#94A3B8" },
                { label: "Max Drawdown", value: `${analysisData.maxDrawdown.toFixed(2)}%`, color: "#EF4444" },
                { label: "Sharpe", value: analysisData.sharpeRatio.toFixed(2), color: analysisData.sharpeRatio >= 0 ? "#38BDF8" : "#EF4444" },
              ].map(({ label, value, color: statColor }) => (
                <div key={label} style={{ textAlign: "center", padding: "6px 4px", borderRadius: 8, background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: statColor, fontFamily: "monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Trade panel — simplified, real API */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card style={{ padding: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {["BUY", "SELL"].map((t) =>
                <button key={t} onClick={() => { setTradeTab(t); setTradeMsg(null); }} style={{
                  padding: "10px 0", borderRadius: 14, border: "none", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
                  background: tradeTab === t ? t === "BUY" ? C.accent : C.primary : "transparent",
                  color: tradeTab === t ? (t === "BUY" ? "#0F172A" : "#fff") : "#94A3B8", transition: "all 0.2s",
                }}>{t}</button>
              )}
            </div>
          </Card>

          {/* Wallet balance */}
          {isLoggedIn && (
            <Card style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.textSec, fontWeight: 600 }}>Wallet Balance</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>
                  ${auth.balance != null ? parseFloat(auth.balance).toFixed(2) : '—'}
                </span>
              </div>
            </Card>
          )}

          {/* Quantity input */}
          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.textSec, fontWeight: 600 }}>Shares</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>@ ${unitPrice.toFixed(2)} each</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)", background: "#fff", overflow: "hidden", marginBottom: 8,
            }}>
              <button onClick={() => setQuantity(String(Math.max(0, (parseInt(quantity) || 0) - 1)))} style={{
                width: 40, height: 40, border: "none", background: "transparent",
                fontSize: 18, cursor: "pointer", color: C.textSec, display: "flex", alignItems: "center", justifyContent: "center",
              }}>−</button>
              <input
                type="number" min="0" value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                style={{
                  flex: 1, padding: "10px 8px", border: "none", outline: "none",
                  fontSize: 22, fontWeight: 700, textAlign: "center",
                  background: "transparent", color: C.text, fontFamily: "'Inter', sans-serif",
                }}
              />
              <button onClick={() => setQuantity(String((parseInt(quantity) || 0) + 1))} style={{
                width: 40, height: 40, border: "none", background: "transparent",
                fontSize: 18, cursor: "pointer", color: C.textSec, display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</button>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {[1, 5, 10, 25, 50].map((v) =>
                <button key={v} onClick={() => setQuantity(String(v))} style={{
                  flex: 1, padding: "5px 0", borderRadius: 8, border: `1px solid ${parseInt(quantity) === v ? C.primary : "rgba(0,0,0,0.06)"}`,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
                  background: parseInt(quantity) === v ? C.primarySoft : "transparent",
                  color: parseInt(quantity) === v ? C.primary : C.textSec,
                }}>{v}</button>
              )}
            </div>
          </Card>

          {/* Order summary */}
          {qty > 0 && (
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
                Order Summary
              </div>
              {[
                [tradeTab === "BUY" ? "Buy" : "Sell", `${qty} × $${unitPrice.toFixed(2)}`],
                ["Total", `$${totalCost.toFixed(2)}`],
              ].map(([l, v]) =>
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                  <span style={{ color: C.textSec }}>{l}</span>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{v}</span>
                </div>
              )}
            </Card>
          )}

          {/* Trade messages */}
          {tradeMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: tradeMsg.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(54,215,183,0.08)",
              color: tradeMsg.type === "error" ? C.red : C.green,
              border: `1px solid ${tradeMsg.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(54,215,183,0.2)"}`,
            }}>
              {tradeMsg.text}
            </div>
          )}

          {/* Execute button */}
          <button
            onClick={() => guardedClick(handleTrade)}
            disabled={tradeLoading || (isTripped && tradeTab === "BUY")}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700,
              cursor: tradeLoading ? "wait" : "pointer", fontFamily: "'Inter', sans-serif",
              background: tradeTab === "BUY" ? C.accent : C.primary,
              color: tradeTab === "BUY" ? "#0F172A" : "#fff",
              boxShadow: `0 4px 16px ${tradeTab === "BUY" ? C.accent : C.primary}40`,
              opacity: tradeLoading ? 0.7 : 1,
            }}>
            {tradeLoading ? "Processing..." : `${tradeTab === "BUY" ? "Buy" : "Sell"} ${selected.name}`}
          </button>
        </div>
      </div>

      {/* Bottom: Other artists to switch to */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(filteredArtists.length, 4)}, 1fr)`, gap: 12 }}>
        {filteredArtists.filter(a => a.id !== selected.id).slice(0, 4).map((a) =>
          <Card key={a.id} style={{ padding: 14, cursor: "pointer" }} hover>
            <div onClick={() => openDetail(artists.indexOf(a))}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <img src={avatarUrl(a.name, 44)} alt={a.name} style={{ width: 22, height: 22, borderRadius: 6 }} />
                <span style={{
                  padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: C.primarySoft, color: C.primary, fontFamily: "monospace",
                }}>{a.symbol || getTicker(a.name)}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>${a.price.toFixed(2)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: a.change >= 0 ? C.green : C.red }}>
                  {a.change >= 0 ? "▲" : "▼"} {Math.abs(a.change).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewsPage({ C, fadeIn, Card }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");

  const categories = ["All", ...new Set(newsArticles.map((a) => a.category))];
  const filtered = filterCategory === "All" ? newsArticles : newsArticles.filter((a) => a.category === filterCategory);

  if (selectedArticle) {
    return (
      <div style={fadeIn(0.1)}>
        <button
          onClick={() => setSelectedArticle(null)}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
            fontSize: 13, fontWeight: 600, color: C.textSec, cursor: "pointer", marginBottom: 24,
            fontFamily: "'Inter', sans-serif", padding: 0
          }}>
          <ArrowLeft size={16} /> Back to News
        </button>

        <Card style={{ padding: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: C.primarySoft, color: C.primary, border: `1px solid ${C.primary}18`
            }}>{selectedArticle.category}</span>
            <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} /> {selectedArticle.location}
            </span>
            <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} /> {selectedArticle.year}
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.25 }}>
            {selectedArticle.headline}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <img src={avatarUrl(selectedArticle.artist, 64)} alt={selectedArticle.artist} style={{ width: 32, height: 32, borderRadius: 10 }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedArticle.artist}</span>
            <div style={{
              marginLeft: 8, display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, fontWeight: 600,
              color: selectedArticle.up ? C.green : C.red
            }}>
              {selectedArticle.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {selectedArticle.up ? "Bullish" : "Bearish"}
            </div>
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.7, color: C.textSec, maxWidth: 640 }}>
            {selectedArticle.description}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>News</h1>
          <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Latest in music investing</p>
        </div>
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3 }}>
          {categories.map((cat) =>
            <button key={cat} onClick={() => setFilterCategory(cat)} style={{
              padding: "5px 14px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
              background: filterCategory === cat ? "#fff" : "transparent",
              color: filterCategory === cat ? C.text : C.textMuted,
              boxShadow: filterCategory === cat ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s"
            }}>{cat}</button>
          )}
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "48px 2fr 1fr 1fr 80px",
        padding: "0 20px 12px", fontSize: 11, fontWeight: 600, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace"
      }}>
        <span></span><span>Artist</span><span>Category</span><span>Location</span><span>Year</span>
      </div>

      {filtered.map((article) =>
        <div
          key={article.id}
          onClick={() => setSelectedArticle(article)}
          style={{
            display: "grid", gridTemplateColumns: "48px 2fr 1fr 1fr 80px",
            alignItems: "center", padding: "16px 20px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            cursor: "pointer", transition: "background 0.15s",
            borderRadius: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.5)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <img src={avatarUrl(article.artist, 72)} alt={article.artist} style={{
            width: 36, height: 36, borderRadius: 8,
            border: "1px solid rgba(30,64,175,0.1)"
          }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}><span style={{ fontSize: 11, fontWeight: 700, color: article.up ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 6 }}>{getTicker(article.artist)}</span>{article.artist}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 1.3 }}>{article.headline}</div>
          </div>
          <span style={{ fontSize: 13, color: C.textSec }}>{article.category}</span>
          <span style={{ fontSize: 13, color: C.textSec }}>{article.location}</span>
          <span style={{ fontSize: 13, color: C.textMuted, fontFamily: "monospace" }}>{article.year}</span>
        </div>
      )}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />
    </div>
  );
}

// ─── Royalties Page ───
function RoyaltiesPage({ C, fadeIn, Card }) {
  const hasRoyalties = royaltyPayments.length > 0;

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>Royalties</h1>
        <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Your earned distributions</p>
      </div>

      {!hasRoyalties ? (
        <Card style={{ padding: 0 }}>
          <EmptyState
            icon={<Music size={28} color={C.primary} />}
            title="No royalty payments received"
            description="When artists you've invested in generate revenue, your share will appear here."
            cta="Explore Markets"
          />
        </Card>
      ) : (
        <>
          {/* Summary card */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "monospace" }}>Total Earned</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>${totalRoyalties.toFixed(2)}</div>
            </Card>
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "monospace" }}>Distributions</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{royaltyPayments.length}</div>
            </Card>
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "monospace" }}>Avg Per Payment</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>${(totalRoyalties / royaltyPayments.length).toFixed(2)}</div>
            </Card>
          </div>

          {/* Table */}
          <Card style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>Payment History</h2>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
              fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
              letterSpacing: "0.08em", fontFamily: "monospace"
            }}>
              <span>Artist</span><span>Amount</span><span>Type</span><span>Date</span>
            </div>
            {royaltyPayments.map((r, i) => (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                alignItems: "center", padding: "12px 0",
                borderBottom: i < royaltyPayments.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={avatarUrl(r.artist, 64)} alt={r.artist} style={{ width: 32, height: 32, borderRadius: 8 }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}><span style={{ fontSize: 10, fontWeight: 700, color: "#38BDF8", fontFamily: "monospace", marginRight: 5 }}>{getTicker(r.artist)}</span>{r.artist}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>${r.amount.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: C.textSec }}>{r.type}</span>
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>{r.date}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Deposit Modal ───
function DepositModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("amount"); // amount | processing | success

  if (!isOpen) return null;

  const handlePay = () => {
    setStep("processing");
    // Simulate Stripe redirect
    setTimeout(() => setStep("success"), 2000);
  };

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    onClose();
  };

  return (
    <>
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        zIndex: 301, width: "min(420px, 90vw)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(40px)",
        borderRadius: 24, padding: 32,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8)",
        fontFamily: "'Inter', sans-serif",
      }}>
        <button onClick={handleClose} style={{
          position: "absolute", top: 16, right: 16,
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(0,0,0,0.04)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, cursor: "pointer", color: C.textSec
        }}>✕</button>

        {step === "amount" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${C.primary}, #3B82F6)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><DollarSign size={20} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Deposit Funds</div>
                <div style={{ fontSize: 12, color: C.textSec }}>Add funds to your trading account</div>
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 6 }}>Amount (USD)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.08)", fontSize: 24, fontWeight: 700,
                fontFamily: "'Inter', sans-serif", outline: "none",
                background: "#fff", color: C.text, marginBottom: 12,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[25, 50, 100, 250, 500].map(v =>
                <button key={v} onClick={() => setAmount(String(v))} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10,
                  border: `1px solid ${Number(amount) === v ? C.primary : "rgba(0,0,0,0.06)"}`,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
                  background: Number(amount) === v ? C.primarySoft : "transparent",
                  color: Number(amount) === v ? C.primary : C.textSec,
                }}>${v}</button>
              )}
            </div>

            <button
              onClick={handlePay}
              disabled={!amount || Number(amount) <= 0}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                fontSize: 15, fontWeight: 700, cursor: amount && Number(amount) > 0 ? "pointer" : "not-allowed",
                fontFamily: "'Inter', sans-serif",
                background: amount && Number(amount) > 0 ? C.primary : "rgba(0,0,0,0.06)",
                color: amount && Number(amount) > 0 ? "#fff" : C.textMuted,
                boxShadow: amount && Number(amount) > 0 ? `0 4px 20px ${C.primary}35` : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
              <span>Pay with Stripe</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>→</span>
            </button>
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 10 }}>
              Powered by Stripe · Secure checkout
            </div>
          </>
        )}

        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: `3px solid ${C.primary}30`, borderTopColor: C.primary,
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite"
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Processing Payment...</div>
            <div style={{ fontSize: 13, color: C.textSec }}>Redirecting to Stripe checkout</div>
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: C.greenSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 28
            }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 4 }}>Deposit Successful!</div>
            <div style={{ fontSize: 14, color: C.textSec, marginBottom: 20 }}>${Number(amount).toFixed(2)} added to your account</div>
            <button onClick={handleClose} style={{
              padding: "10px 32px", borderRadius: 12, border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              background: C.primary, color: "#fff"
            }}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}

function Card({ children, style, hover }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: C.card,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20,
        border: `1px solid ${C.border}`,
        boxShadow: hovered ? C.shadowHover : C.shadow,
        transition: "box-shadow 0.3s, transform 0.3s",
        transform: hovered ? "translateY(-2px)" : "none",
        position: "relative",
        overflow: "hidden",
        ...style
      }}>
      {children}
    </div>
  );
}

function TabPill({ options, active, onChange }) {
  return (
    <div style={{
      display: "inline-flex", gap: 1, background: "rgba(0,0,0,0.04)",
      borderRadius: 10, padding: 3
    }}>
      {options.map((o) =>
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "5px 14px", borderRadius: 8, border: "none",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "monospace",
          background: active === o ? "#fff" : "transparent",
          color: active === o ? C.text : C.textMuted,
          boxShadow: active === o ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          transition: "all 0.2s"
        }}>{o}</button>
      )}
    </div>
  );
}

export default function CrescendoDashboard({ navigate, initialTab = "Dashboard", showProfile = false, isLoggedIn = true, user, openAuth, onLogout }) {
  const [tab, setTab] = useState(initialTab);
  const [period, setPeriod] = useState("1W");
  const [marketPeriod, setMarketPeriod] = useState("Daily");
  const [loaded, setLoaded] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [genreFilter, setGenreFilter] = useState("All");
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crescendo_watchlist") || "[]"); } catch { return []; }
  });

  const toggleWatchlist = (artistId) => {
    setWatchlist(prev => {
      const next = prev.includes(artistId) ? prev.filter(id => id !== artistId) : [...prev, artistId];
      localStorage.setItem("crescendo_watchlist", JSON.stringify(next));
      return next;
    });
  };

  // Live data from API
  const [liveArtists, setLiveArtists] = useState(null);
  const [livePortfolio, setLivePortfolio] = useState(null);
  const auth = useAuth();

  // Fetch live artists on mount
  useEffect(() => {
    let cancelled = false;
    api.getArtists().then(data => {
      if (!cancelled && data.length > 0) setLiveArtists(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch portfolio when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    api.getPortfolio().then(data => {
      if (!cancelled) setLivePortfolio(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Map live artists to display format — use real API data, genre map for known symbols
  // Merge portfolio positions so ArtistDetailModal can show "Your Position"
  const artists = liveArtists ? liveArtists.map((a) => {
    const symbol = a.symbol || a.stageName?.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || '';
    const position = livePortfolio?.find(p => p.artistId === a.id);
    return {
      id: a.id,
      name: a.stageName || a.name || 'Unknown',
      symbol,
      ticker: getTicker(a.stageName || a.name || ""),
      genre: GENRE_MAP[symbol] || a.genre || "Music",
      price: a.currentPrice || 0,
      change: a.change24h || 0,
      volume: a.volume24h || "0",
      shares: position ? position.sharesHeld : 0,
      avgCost: position ? position.avgCostBasis : 0,
      streams: a.streams || "0",
      bio: a.bio || "",
      sharesOutstanding: a.sharesOutstanding || 0,
      maxShares: a.maxShares || 10000,
      revenueSharePct: a.revenueSharePct || 0,
      circuitBreakerStatus: a.circuitBreakerStatus || "normal",
    };
  }) : mockArtists;

  // Artist map for order history
  const artistMap = {};
  artists.forEach(a => { artistMap[a.id] = a.name; });

  // Compute portfolio values from live data or fallback
  const portfolioHoldings = livePortfolio
    ? livePortfolio.map(p => ({
        id: p.artistId,
        name: p.stageName || artistMap[p.artistId] || "Unknown",
        shares: p.sharesHeld,
        avgCost: p.avgCostBasis,
        price: p.currentBid || p.currentPrice,
        marketValue: p.marketValue,
        unrealizedPnL: p.unrealizedPnL,
        genre: artists.find(a => a.id === p.artistId)?.genre || "",
      }))
    : mockArtists.filter((a) => a.shares > 0);

  const totalValue = livePortfolio
    ? livePortfolio.reduce((s, p) => s + p.marketValue, 0)
    : portfolioHoldings.reduce((s, a) => s + a.shares * a.price, 0);
  const totalCost = livePortfolio
    ? livePortfolio.reduce((s, p) => s + p.totalCost, 0)
    : portfolioHoldings.reduce((s, a) => s + a.shares * a.avgCost, 0);
  const totalReturn = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalReturn / totalCost * 100).toFixed(1) : "0.0";

  const handleTradeComplete = () => {
    if (isLoggedIn) {
      api.getPortfolio().then(data => setLivePortfolio(data)).catch(() => {});
      auth.refreshBalance();
    }
  };

  // Guarded click: open auth modal instead of action when not logged in
  const guardedClick = (fn) => {
    if (!isLoggedIn) {
      setShowAuthBanner(true);
      setTimeout(() => setShowAuthBanner(false), 3000);
      return;
    }
    fn();
  };

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const fadeIn = (delay) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.6s ${delay}s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s ${delay}s cubic-bezier(0.22, 1, 0.36, 1)`
  });

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: C.bg,
      minHeight: "100vh",
      color: C.text,
      position: "relative",
      overflow: "hidden",
      letterSpacing: "-0.02em",
      lineHeight: 1.35
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
        button:hover { filter: brightness(0.97); }
        @keyframes float1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px,15px); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(15px,25px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .drag-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <Blob style={{ width: 350, height: 350, top: -60, right: 80, background: C.blob1, animation: "float1 12s ease-in-out infinite" }} />
      <Blob style={{ width: 280, height: 280, top: 300, left: -40, background: C.blob2, animation: "float2 15s ease-in-out infinite" }} />
      <Blob style={{ width: 200, height: 200, bottom: 50, right: 200, background: C.blob3, animation: "float3 10s ease-in-out infinite" }} />
      <Blob style={{ width: 180, height: 180, top: 150, left: "45%", background: C.blob1, opacity: 0.4, animation: "float2 18s ease-in-out infinite" }} />

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
        position: "sticky", top: 0, zIndex: 100,
        ...fadeIn(0)
      }}>
        <div
          onClick={() => navigate('home')}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text, fontFamily: "'Inter', sans-serif" }}>CRESCENDO</span>
        </div>

        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: 3, border: "1px solid rgba(255,255,255,0.8)" }}>
          {["Dashboard", "Markets", "Portfolio", "News"].map((t) =>
            <button key={t} onClick={() => { setTab(t); setShowNotifications(false); navigate(t.toLowerCase()); }} style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              background: tab === t && !showProfile ? "#fff" : "transparent",
              color: tab === t && !showProfile ? C.text : C.textSec,
              boxShadow: tab === t && !showProfile ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s"
            }}>{t}</button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Wallet Balance */}
          {isLoggedIn && (
            <div
              onClick={() => setShowWallet(!showWallet)}
              style={{
                height: 38, padding: "0 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                color: C.text, fontFamily: "'Inter', sans-serif"
              }}>
              <Wallet size={15} color={C.primary} />
              ${auth.balance != null ? parseFloat(auth.balance).toFixed(2) : '—'}
            </div>
          )}
          {/* Order History */}
          {isLoggedIn && (
            <div
              onClick={() => setShowOrderHistory(!showOrderHistory)}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}>
              <BarChart3 size={16} color={C.text} />
            </div>
          )}
          <div
            onClick={() => { setShowNotifications(!showNotifications); if (showProfile) navigate('dashboard'); }}
            style={{
            width: 38, height: 38, borderRadius: 12,
            background: showNotifications ? C.primarySoft : "rgba(255,255,255,0.7)",
            border: showNotifications ? `1px solid ${C.primary}30` : "1px solid rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, cursor: "pointer", position: "relative",
            transition: "all 0.2s"
          }}>
            <Bell size={18} color={showNotifications ? C.primary : C.text} />
            <div style={{
              position: "absolute", top: 6, right: 6, width: 7, height: 7,
              borderRadius: "50%", background: C.primary, border: "2px solid #fff"
            }} />
          </div>
          {isLoggedIn ? (
            <div style={{ position: "relative" }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: `linear-gradient(135deg, ${C.accent}90, ${C.primary}50)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.text,
                border: showProfile || showUserMenu ? `2px solid ${C.primary}` : "1px solid rgba(255,255,255,0.8)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >{user?.initials || '?'}</div>
              {showUserMenu && (
                <>
                  <div onClick={() => setShowUserMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{
                    position: "absolute", top: 46, right: 0, zIndex: 200,
                    width: 220, borderRadius: 14,
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                  }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{user?.name || 'User'}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{user?.email || ''}</div>
                    </div>
                    <div
                      onClick={() => { setShowUserMenu(false); navigate('profile'); }}
                      style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: C.text, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >My Account</div>
                    <div
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#EF4444", cursor: "pointer", borderTop: "1px solid rgba(0,0,0,0.06)", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >Sign Out</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: `linear-gradient(135deg, ${C.accent}90, ${C.primary}50)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: C.text,
                border: "1px solid rgba(255,255,255,0.8)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
                onClick={() => openAuth('signup')}
              >→</div>
              <button
                onClick={() => openAuth('signup')}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 10, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  background: `linear-gradient(135deg, ${C.primary}, #5B6AE8)`,
                  color: "#fff",
                  boxShadow: `0 2px 10px ${C.primary}40`,
                  transition: "all 0.2s",
                }}>
                Sign Up Free</button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", position: "relative", zIndex: 1 }}>

        {/* ─── NOTIFICATIONS PAGE ─── */}
        {showNotifications && !showProfile &&
          <NotificationsPage
            setSelectedArtist={setSelectedArtist}
            artists={artists}
            fadeIn={fadeIn}
          />
        }

        {/* ─── PROFILE PAGE ─── */}
        {showProfile && !showNotifications &&
          <div style={fadeIn(0.1)}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>Profile</h1>
              <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Manage your account</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ padding: 32 }} hover>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.accent}90, ${C.primary}50)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 800, color: C.text,
                    border: "2px solid rgba(255,255,255,0.8)"
                  }}>{user?.initials || auth.user?.displayName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '??'}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{auth.user?.displayName || user?.displayName || 'User'}</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{auth.user?.email || user?.email || ''}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Investor · Crescendo</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[{ label: "Total Invested", value: `$${totalValue.toFixed(0)}` }, { label: "Total Returns", value: `+$${totalReturn.toFixed(0)}` }, { label: "Artists Tracked", value: artists.length }].map((s) =>
                    <div key={s.label} style={{ padding: 16, borderRadius: 14, background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                    </div>
                  )}
                </div>
              </Card>
              <Card style={{ padding: 32 }} hover>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>Settings</h2>
                {["Notification Preferences", "Privacy & Security", "Payment Methods", "Connected Accounts", "Display & Theme"].map((item, i) =>
                  <div key={item} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0",
                    borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    cursor: "pointer", transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = C.text}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{item}</span>
                    <span style={{ fontSize: 16, color: C.textMuted }}>→</span>
                  </div>
                )}
              </Card>
            </div>
          </div>
        }

        {/* ─── MARKETS PAGE ─── */}
        {!showProfile && !showNotifications && tab === "Markets" &&
          <MarketsPage
            artists={artists}
            C={C}
            fadeIn={fadeIn}
            guardedClick={guardedClick}
            setSelectedArtist={setSelectedArtist}
            Card={Card}
            TabPill={TabPill}
            auth={auth}
            isLoggedIn={isLoggedIn}
            onTradeComplete={handleTradeComplete}
            genreFilter={genreFilter}
            setGenreFilter={setGenreFilter}
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist} />
        }

        {/* ─── NEWS PAGE ─── */}
        {!showProfile && !showNotifications && tab === "News" &&
          <NewsPage C={C} fadeIn={fadeIn} Card={Card} />
        }

        {/* ─── DASHBOARD PAGE ─── */}
        {!showProfile && !showNotifications && tab === "Dashboard" && <>

          {/* Portfolio Value Header */}
          <div style={{ marginBottom: 24, ...fadeIn(0.1) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>Portfolio</h1>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Your music investment overview</p>
              </div>
              <button
                onClick={() => guardedClick(() => setShowDeposit(true))}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  background: C.primary,
                  color: "#fff",
                  boxShadow: `0 4px 16px ${C.primary}30`
                }}>
                <DollarSign size={16} /> Deposit
              </button>
            </div>
          </div>

          {/* Top Row: Two Progress Bars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, ...fadeIn(0.15) }}>
            <Card style={{ padding: 24 }}>
              <ProgressBar
                value={totalValue} max={2500}
                color1={C.primary} color2={C.accent}
                label1="Invested Value" label2="Current|Goal"
                val1={Math.round(totalValue)} val2={2500} />
            </Card>
            <Card style={{ padding: 24 }}>
              <ProgressBar
                value={totalReturn} max={500}
                color1={C.accentDark} color2={C.accent}
                label1="Total Returns" label2="Earned|Target"
                val1={Math.round(totalReturn)} val2={500} />
            </Card>
          </div>

          {/* Main Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Holdings */}
            <Card style={{ padding: 24, gridRow: "span 2" }} hover>
              <div style={fadeIn(0.2)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Holdings</h2>
                  <TabPill options={["Value", "%"]} active="Value" onChange={() => {}} />
                </div>

                {portfolioHoldings.length === 0 ? (
                  <EmptyState
                    icon={<Wallet size={28} color={C.primary} />}
                    title="No positions yet"
                    description="You have no positions yet — explore Markets to start investing"
                    cta="Explore Markets"
                    onCta={() => { setTab("Markets"); navigate("markets"); }}
                  />
                ) : (
                  <>
                    <div style={{
                      position: "relative", width: "100%", height: 220,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 20
                    }}>
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
                        {[0.25, 0.5, 0.75, 1].map((r, i) =>
                          <ellipse key={i} cx="50%" cy="55%" rx={`${r * 45}%`} ry={`${r * 40}%`} fill="none" stroke={C.textMuted} strokeWidth="0.5" />
                        )}
                      </svg>
                      <div style={{
                        position: "absolute", width: 130, height: 130, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(80,227,194,0.45) 0%, rgba(80,227,194,0.1) 60%, transparent 80%)",
                        top: 25, left: "20%", filter: "blur(8px)"
                      }} />
                      <div style={{
                        position: "absolute", width: 100, height: 100, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(91,106,232,0.45) 0%, rgba(91,106,232,0.1) 60%, transparent 80%)",
                        top: 50, right: "18%", filter: "blur(8px)"
                      }} />
                      <div style={{
                        position: "absolute", width: 80, height: 80, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(30,64,175,0.4) 0%, rgba(30,64,175,0.1) 60%, transparent 80%)",
                        bottom: 30, left: "35%", filter: "blur(6px)"
                      }} />
                      <div style={{
                        position: "absolute", width: 60, height: 60, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%)",
                        bottom: 50, right: "30%", filter: "blur(5px)"
                      }} />
                      {portfolioHoldings.map((a, i) => {
                        const positions = [
                          { left: "12%", bottom: 10 },
                          { right: "12%", bottom: 10 },
                          { left: "12%", top: 0 },
                          { right: "12%", top: 0 }
                        ];
                        const colors = [C.accent, "#3B82F6", C.primary, C.green];
                        return (
                          <div key={a.id} onClick={() => setSelectedArtist(a)} style={{ position: "absolute", ...positions[i], textAlign: "center", cursor: "pointer" }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: colors[i], margin: "0 auto 4px",
                              boxShadow: `0 0 8px ${colors[i]}60`
                            }} />
                            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: a.change >= 0 ? "#38BDF8" : "#EF4444" }}>{a.ticker || getTicker(a.name)}</div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>${(a.shares * a.price).toFixed(0)}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 16,
                      display: "flex", justifyContent: "space-between", alignItems: "flex-end"
                    }}>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>
                          ${totalValue.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>Total Invested</div>
                      </div>
                      <div style={{
                        padding: "4px 10px", borderRadius: 8,
                        background: C.greenSoft, color: C.green,
                        fontSize: 13, fontWeight: 600
                      }}>+{totalPct}%</div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Active Positions */}
            <Card style={{ padding: 24 }} hover>
              <div style={fadeIn(0.25)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Active Positions</h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, background: "rgba(0,0,0,0.03)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, cursor: "pointer", border: "1px solid rgba(0,0,0,0.05)"
                    }}>✎</div>
                  </div>
                </div>

                {portfolioHoldings.slice(0, 2).map((a, idx) => {
                  const val = a.shares * a.price;
                  const gain = (a.price - a.avgCost) * a.shares;
                  return (
                    <div key={a.id} style={{
                      padding: "14px 0",
                      borderBottom: idx === 0 ? "1px solid rgba(0,0,0,0.05)" : "none"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <img src={avatarUrl(a.name, 32)} alt={a.name} style={{ width: 16, height: 16, borderRadius: 4 }} />
                          <span style={{ fontWeight: 600, fontSize: 14 }}><span style={{ fontSize: 10, fontWeight: 700, color: gain >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 5 }}>{a.ticker || getTicker(a.name)}</span>{a.name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{a.shares} shares</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Value</div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>${val.toFixed(0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Return</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>+${gain.toFixed(0)}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <button onClick={() => {
                          const fullArtist = artists.find(ar => ar.id === a.id);
                          if (fullArtist) setSelectedArtist(fullArtist);
                        }} style={{
                          padding: "5px 14px", borderRadius: 8, border: "none",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          fontFamily: "monospace", letterSpacing: "0.04em",
                          background: C.greenSoft, color: C.green,
                        }}>BUY</button>
                        <button onClick={() => {
                          const fullArtist = artists.find(ar => ar.id === a.id);
                          if (fullArtist) setSelectedArtist({ ...fullArtist, _defaultSell: true });
                        }} style={{
                          padding: "5px 14px", borderRadius: 8, border: "none",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          fontFamily: "monospace", letterSpacing: "0.04em",
                          background: C.redSoft, color: C.red,
                        }}>SELL</button>
                        <div style={{
                          marginLeft: "auto",
                          fontSize: 22, fontWeight: 700, color: C.text
                        }}>
                          {a.shares}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>shares</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Performance Chart */}
            <Card style={{ padding: 24 }} hover>
              <div style={fadeIn(0.3)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Performance</h2>
                  <TabPill options={["1D", "5D", "1W", "2W", "1M"]} active={period} onChange={setPeriod} />
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 2 }}>
                  ${totalValue.toFixed(0)}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>This week</div>
                <MiniChart data={graphWeek} color={C.primary} h={80} />

                <div style={{
                  marginTop: 16, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.primary}14, ${C.accent}20)`,
                  padding: 16, position: "relative", overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: -10, right: -10, opacity: 0.15 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="none" stroke={C.primary} strokeWidth="0.5" />
                      <ellipse cx="40" cy="40" rx="20" ry="35" fill="none" stroke={C.primary} strokeWidth="0.5" />
                      <ellipse cx="40" cy="40" rx="35" ry="20" fill="none" stroke={C.primary} strokeWidth="0.5" />
                      <line x1="5" y1="40" x2="75" y2="40" stroke={C.primary} strokeWidth="0.5" />
                      <line x1="40" y1="5" x2="40" y2="75" stroke={C.primary} strokeWidth="0.5" />
                    </svg>
                  </div>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: C.accent, marginBottom: 8,
                    boxShadow: `0 0 12px ${C.accent}80`
                  }} />
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
                    Discover <span style={{ fontStyle: "italic" }}>rising</span> artists
                  </div>
                  <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.25 }}>
                    Browse trending markets and find your next investment before they blow up.
                  </div>
                  <div style={{
                    marginTop: 10, width: 28, height: 28, borderRadius: "50%",
                    background: C.text, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, cursor: "pointer"
                  }}>→</div>
                </div>
              </div>
            </Card>

            {/* Most Active Markets */}
            <Card style={{ padding: 24, gridColumn: "span 2" }} hover>
              <div style={fadeIn(0.35)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase", color: C.textMuted }}>Most Active Markets</h2>
                  <TabPill options={["Daily", "Weekly", "Monthly"]} active={marketPeriod} onChange={setMarketPeriod} />
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px 70px",
                  padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                  fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
                  letterSpacing: "0.08em", fontFamily: "monospace"
                }}>
                  <span>Artist</span><span>Price</span><span>Change</span><span>Volume</span><span>Supply</span><span></span>
                </div>

                {artists.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume)).map((a, i) =>
                  <div key={a.id} onClick={() => setSelectedArtist(a)} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px 70px",
                    alignItems: "center", padding: "12px 0",
                    borderBottom: i < artists.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    cursor: "pointer", transition: "background 0.15s", borderRadius: 8
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src={avatarUrl(a.name, 72)} alt={a.name} style={{
                        width: 36, height: 36, borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.04)"
                      }} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {a.symbol && (
                            <span style={{
                              padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: C.primarySoft, color: C.primary, fontFamily: "monospace",
                            }}>{a.symbol}</span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                          {a.circuitBreakerStatus === "tripped" && (
                            <AlertTriangle size={12} color={C.red} />
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{a.genre}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${a.price.toFixed(2)}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: a.change >= 0 ? C.green : C.red
                    }}>{a.change >= 0 ? "+" : ""}{a.change}%</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{a.volume}</div>
                    <SupplyMeter outstanding={a.sharesOutstanding} max={a.maxShares} compact />
                    <SparkLine positive={a.change >= 0} />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Recent Trades */}
          <div style={{ marginBottom: 20, ...fadeIn(0.36) }}>
            <Card style={{ padding: 24 }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Recent Trades</h2>
              </div>
              {tradeHistory.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 size={28} color={C.primary} />}
                  title="No trades yet"
                  description="Your trade history will appear here once you place your first order."
                  cta="Go to Markets"
                  onCta={() => { setTab("Markets"); navigate("markets"); }}
                />
              ) : (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr",
                    padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                    fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.08em", fontFamily: "monospace"
                  }}>
                    <span>Artist</span><span>Type</span><span>Qty</span><span>Price</span><span>Total</span><span>Status</span><span>Date</span>
                  </div>
                  {tradeHistory.map((t, i) => (
                    <div key={t.id} style={{
                      display: "grid", gridTemplateColumns: "2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr",
                      alignItems: "center", padding: "10px 0",
                      borderBottom: i < tradeHistory.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img src={avatarUrl(t.artist, 48)} alt={t.artist} style={{ width: 28, height: 28, borderRadius: 8 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 10, fontWeight: 700, color: t.type === "Buy" ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 5 }}>{getTicker(t.artist)}</span>{t.artist}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.type === "Buy" ? C.green : C.red }}>{t.type}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace" }}>{t.qty}</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace" }}>${t.price.toFixed(2)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>${t.total.toFixed(2)}</span>
                      <StatusPill status={t.status} />
                      <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{t.date}</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </div>

          {/* Royalties Section */}
          <div style={{ marginBottom: 20, ...fadeIn(0.37) }}>
            <Card style={{ padding: 24 }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Royalties</h2>
                <span style={{ fontSize: 12, color: C.textMuted }}>Total: <span style={{ fontWeight: 700, color: C.green }}>${totalRoyalties.toFixed(2)}</span></span>
              </div>
              {royaltyPayments.length === 0 ? (
                <EmptyState
                  icon={<Music size={28} color={C.primary} />}
                  title="No royalty payments received"
                  description="When artists you've invested in generate revenue, your share will appear here."
                />
              ) : (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                    fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.08em", fontFamily: "monospace"
                  }}>
                    <span>Artist</span><span>Amount</span><span>Type</span><span>Date</span>
                  </div>
                  {royaltyPayments.map((r, i) => (
                    <div key={r.id} style={{
                      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      alignItems: "center", padding: "10px 0",
                      borderBottom: i < royaltyPayments.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img src={avatarUrl(r.artist, 48)} alt={r.artist} style={{ width: 28, height: 28, borderRadius: 8 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}><span style={{ fontSize: 10, fontWeight: 700, color: "#38BDF8", fontFamily: "monospace", marginRight: 5 }}>{getTicker(r.artist)}</span>{r.artist}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>${r.amount.toFixed(2)}</span>
                      <span style={{ fontSize: 12, color: C.textSec }}>{r.type}</span>
                      <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{r.date}</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </div>

          {/* You Might Like — recommended artists with mini candlestick charts */}
          <div style={{ marginBottom: 20, ...fadeIn(0.38) }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "24px 24px 0 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>You Might Like</h2>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: "linear-gradient(135deg, rgba(80,227,194,0.15), rgba(30,64,175,0.15))",
                        color: C.primary, border: `1px solid ${C.primary}18`
                      }}>
                        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.accent, animation: "pulse 2s infinite" }} /> LIVE
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSec }}>Artists trending across your taste profile — tap to explore</p>
                  </div>
                </div>
              </div>

              {/* Drag-scrollable row */}
              <div
                className="drag-scroll"
                ref={(el) => { el && (el._dragState = el._dragState || { down: false, didDrag: false, startX: 0, scrollL: 0 }); }}
                onMouseDown={(e) => { const el = e.currentTarget; el._dragState.down = true; el._dragState.didDrag = false; el._dragState.startX = e.pageX - el.offsetLeft; el._dragState.scrollL = el.scrollLeft; el.style.cursor = "grabbing"; el.style.userSelect = "none"; }}
                onMouseMove={(e) => { const el = e.currentTarget; if (!el._dragState.down) return; e.preventDefault(); el._dragState.didDrag = true; const x = e.pageX - el.offsetLeft; el.scrollLeft = el._dragState.scrollL - (x - el._dragState.startX); }}
                onMouseUp={(e) => { e.currentTarget._dragState.down = false; e.currentTarget.style.cursor = "grab"; e.currentTarget.style.userSelect = ""; }}
                onMouseLeave={(e) => { e.currentTarget._dragState.down = false; e.currentTarget.style.cursor = "grab"; e.currentTarget.style.userSelect = ""; }}
                style={{
                  display: "flex", gap: 14, padding: "16px 24px 24px 24px",
                  overflowX: "auto", scrollSnapType: "x mandatory",
                  cursor: "grab", scrollbarWidth: "none", msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch"
                }}>
                {recommendedArtists.map((rec) => {
                  const isHot = rec.change >= 20;
                  const ohlc = rec.ohlc;
                  // Mini candlestick chart dimensions
                  const chartW = 224;
                  const chartH = 64;
                  const pad = 4;
                  const allVals = ohlc.flatMap((c) => [c.h, c.l]);
                  const minP = Math.min(...allVals);
                  const maxP = Math.max(...allVals);
                  const range = maxP - minP || 0.01;
                  const barW = (chartW - pad * 2) / ohlc.length;
                  const yScale = (v) => chartH - pad - ((v - minP) / range) * (chartH - pad * 2);

                  return (
                    <div key={rec.id}
                      onClick={(e) => { const row = e.currentTarget.parentElement; if (row._dragState && row._dragState.didDrag) return; setSelectedArtist(rec); }}
                      style={{
                        minWidth: 260, maxWidth: 260, scrollSnapAlign: "start",
                        borderRadius: 16, padding: 18, position: "relative", overflow: "hidden",
                        background: "rgba(255,255,255,0.55)",
                        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.8)",
                        boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
                        transition: "transform 0.25s, box-shadow 0.25s",
                        cursor: "pointer", flex: "0 0 auto"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.03)"; }}>

                      <div style={{
                        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                        background: isHot
                          ? "radial-gradient(circle, rgba(30,64,175,0.25) 0%, transparent 70%)"
                          : "radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)",
                        filter: "blur(10px)", pointerEvents: "none"
                      }} />

                      {/* Artist info */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <img src={avatarUrl(rec.name, 48)} alt={rec.name} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{rec.name}</span>
                            {isHot && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: `${C.primary}15`, color: C.primary }}>HOT</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>{rec.ticker}</span>
                            <span style={{ fontSize: 10, color: C.textMuted }}>{rec.genre}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini candlestick chart */}
                      <svg width={chartW} height={chartH} style={{ display: "block", marginBottom: 12, borderRadius: 8, background: "rgba(0,0,0,0.02)" }}>
                        {ohlc.map((candle, ci) => {
                          const bull = candle.c >= candle.o;
                          const color = bull ? C.accent : "#EF4444";
                          const x = pad + ci * barW + barW / 2;
                          const bodyTop = yScale(Math.max(candle.o, candle.c));
                          const bodyBot = yScale(Math.min(candle.o, candle.c));
                          const bodyH = Math.max(bodyBot - bodyTop, 1);
                          return (
                            <g key={ci}>
                              <line x1={x} x2={x} y1={yScale(candle.h)} y2={yScale(candle.l)} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
                              <rect x={x - barW * 0.3} y={bodyTop} width={barW * 0.6} height={bodyH} fill={color} rx={1} />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Price + change */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>${rec.price.toFixed(2)}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>per share</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{
                            fontSize: 14, fontWeight: 700,
                            color: rec.change >= 0 ? C.green : "#EF4444"
                          }}>{rec.change >= 0 ? "+" : ""}{rec.change}%</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{rec.volume} vol</div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "rgba(0,0,0,0.03)", color: C.textMuted, fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)" }}>{rec.streams} streams</span>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "rgba(0,0,0,0.03)", color: C.textMuted, fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)" }}>{rec.revenueSharePct}% royalty</span>
                      </div>

                      {/* Invest CTA */}
                      <div style={{
                        padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.04)",
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <span style={{ fontSize: 12, color: C.textSec }}>{rec.sharesOutstanding.toLocaleString()} / {rec.maxShares.toLocaleString()} shares</span>
                        <span style={{
                          padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: C.primary, color: "#fff", cursor: "pointer"
                        }}>
                          View →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* News Row */}
          <Card style={{ padding: 24, ...fadeIn(0.4) }} hover>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Latest News</h2>
              <span style={{ fontSize: 12, color: C.primary, fontWeight: 600, cursor: "pointer" }}>View all →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {news.map((n, i) =>
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "12px 14px",
                  borderRadius: 12, background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0,0,0,0.03)"
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: n.up ? C.green : C.red,
                    boxShadow: `0 0 6px ${n.up ? C.green : C.red}50`
                  }} />
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.3 }}>
                      <span style={{ fontWeight: 600, color: C.primary }}><span style={{ fontSize: 10, fontWeight: 700, color: n.up ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 5 }}>{getTicker(n.artist)}</span>{n.artist}</span>
                      <span style={{ color: C.textSec }}> — {n.text}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{n.time} ago</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Dividends Section */}
          <div style={{ marginBottom: 20, ...fadeIn(0.42) }}>
            <Card style={{ padding: 24 }} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Dividends</h2>
                <span style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: C.primarySoft, color: C.primary,
                }}>Revenue Share</span>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "40px 20px", textAlign: "center",
                background: "rgba(0,0,0,0.02)", borderRadius: 16, border: "1px solid rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.primarySoft}, rgba(54,215,183,0.1))`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}><DollarSign size={22} color={C.primary} /></div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.text }}>No dividends yet</div>
                <div style={{ fontSize: 13, color: C.textSec, maxWidth: 360, lineHeight: 1.5 }}>
                  Dividends are distributed when artists you've invested in earn royalties from streaming, sync licenses, and live performances. Your share is proportional to your holdings.
                </div>
              </div>
            </Card>
          </div>
        </>}

        {/* ─── PORTFOLIO PAGE ─── */}
        {!showProfile && !showNotifications && tab === "Portfolio" && <>
          <div style={fadeIn(0.1)}>
            {/* Title + Ticker Strip */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: C.text }}>My Portfolio</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {portfolioHoldings.slice(0, 3).map(a => (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)",
                    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                    fontSize: 12, fontWeight: 600,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", color: C.primary, background: C.primarySoft, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                      {artists.find(ar => ar.id === a.id)?.symbol || ''}
                    </span>
                    <span style={{ color: C.text, fontWeight: 700 }}>{a.name}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>${a.price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Music Portfolio Card */}
              <div style={{
                background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20, padding: "22px 24px",
                border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Music Portfolio</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 12 }}>${totalValue.toFixed(2)}</div>
                <svg viewBox="0 0 120 40" style={{ width: "100%", height: 40, display: "block" }}>
                  <defs>
                    <linearGradient id="wavyFill1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <path d="M0,35 C10,28 20,15 35,20 C50,25 55,10 70,12 C85,14 95,8 110,15 L120,18 L120,40 L0,40 Z" fill="url(#wavyFill1)" />
                  <path d="M0,35 C10,28 20,15 35,20 C50,25 55,10 70,12 C85,14 95,8 110,15 L120,18" fill="none" stroke={C.accent} strokeWidth="2" />
                </svg>
              </div>

              {/* Returns Card */}
              <div style={{
                background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20, padding: "22px 24px",
                border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Total Returns</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: totalReturn >= 0 ? C.green : C.red, marginBottom: 12 }}>
                  {totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    padding: "3px 8px", borderRadius: 6,
                    background: totalReturn >= 0 ? C.greenSoft : C.redSoft,
                    color: totalReturn >= 0 ? C.green : C.red,
                    fontSize: 12, fontWeight: 700,
                  }}>{totalReturn >= 0 ? '+' : ''}{totalPct}%</div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>all time</span>
                </div>
              </div>

              {/* Arc Gauge */}
              <div style={{
                background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20, padding: "24px",
                border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="180" height="100" viewBox="0 0 180 100">
                  <defs>
                    <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={C.primary} />
                      <stop offset="50%" stopColor={C.accent} />
                      <stop offset="100%" stopColor={C.green} />
                    </linearGradient>
                  </defs>
                  <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="url(#arcGrad)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${Math.min((totalValue / 2500) * 236, 236)} 236`} />
                  <circle cx="15" cy="90" r="4" fill={C.primary} />
                  <circle cx="165" cy="90" r="4" fill="rgba(0,0,0,0.1)" />
                </svg>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginTop: -4, marginBottom: 4 }}>Total portfolio value</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>${totalValue.toFixed(2)}</div>
              </div>
            </div>

            {/* Holdings Table */}
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Holdings</h2>
                <div style={{ fontSize: 12, color: C.textMuted }}>{portfolioHoldings.length} position{portfolioHoldings.length !== 1 ? 's' : ''}</div>
              </div>

              {portfolioHoldings.length === 0 ? (
                <EmptyState
                  icon={<Wallet size={28} color={C.primary} />}
                  title="No positions yet"
                  description="Start investing — explore Markets to buy your first shares"
                  cta="Explore Markets"
                  onCta={() => { setTab("Markets"); navigate("markets"); }}
                />
              ) : (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                    padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                    fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.08em", fontFamily: "monospace",
                  }}>
                    <span>Artist</span><span>Shares</span><span>Avg Cost</span><span>Value</span><span>P&L</span><span>Trade</span>
                  </div>
                  {portfolioHoldings.map((a, i) => {
                    const val = a.marketValue || a.shares * a.price;
                    const pnl = a.unrealizedPnL || (a.price - a.avgCost) * a.shares;
                    const pnlPct = a.avgCost > 0 ? ((a.price - a.avgCost) / a.avgCost * 100).toFixed(1) : '0.0';
                    return (
                      <div key={a.id} style={{
                        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                        alignItems: "center", padding: "14px 0",
                        borderBottom: i < portfolioHoldings.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                        borderRadius: 8,
                      }}>
                        <div onClick={() => {
                          const fullArtist = artists.find(ar => ar.id === a.id);
                          if (fullArtist) setSelectedArtist(fullArtist);
                        }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                          <img src={avatarUrl(a.name, 72)} alt={a.name} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{a.genre}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.shares}</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>${(a.avgCost || 0).toFixed(2)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>${val.toFixed(2)}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? C.green : C.red }}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: pnl >= 0 ? C.green : C.red,
                            padding: "2px 6px", borderRadius: 4,
                            background: pnl >= 0 ? C.greenSoft : C.redSoft,
                          }}>{pnl >= 0 ? '+' : ''}{pnlPct}%</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => {
                            const fullArtist = artists.find(ar => ar.id === a.id);
                            if (fullArtist) setSelectedArtist(fullArtist);
                          }} style={{
                            padding: "6px 12px", borderRadius: 8, border: "none",
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                            fontFamily: "monospace", letterSpacing: "0.04em",
                            background: C.greenSoft, color: C.green,
                            transition: "all 0.15s",
                          }}>BUY</button>
                          <button onClick={() => {
                            const fullArtist = artists.find(ar => ar.id === a.id);
                            if (fullArtist) setSelectedArtist({ ...fullArtist, _defaultSell: true });
                          }} style={{
                            padding: "6px 12px", borderRadius: 8, border: "none",
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                            fontFamily: "monospace", letterSpacing: "0.04em",
                            background: C.redSoft, color: C.red,
                            transition: "all 0.15s",
                          }}>SELL</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </Card>

            {/* Dividends */}
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Dividends</h2>
              </div>
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <DollarSign size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.text }}>No dividends yet</div>
                <div style={{ fontSize: 13, color: C.textSec, maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
                  Dividends are distributed when artists you've invested in earn royalties from streaming and live performances.
                </div>
              </div>
            </Card>

            {/* Trade History */}
            <OrderHistory artistMap={artistMap} />
          </div>
        </>}

      </main>

      {/* Floating sign-up banner */}
      {showAuthBanner &&
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 250,
          background: "rgba(17,24,39,0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16, padding: "16px 28px",
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)",
          animation: "slideUp 0.4s cubic-bezier(0.22,1,0.36,1)",
          color: "#fff",
          fontFamily: "'Inter', sans-serif"
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translate(-50%,20px); } to { opacity:1; transform:translate(-50%,0); } }`}</style>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Create a free account to invest</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Sign up to trade shares and build your portfolio</div>
          </div>
          <button
            onClick={() => openAuth('signup')}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              background: `linear-gradient(135deg, ${C.primary}, #3B82F6)`,
              color: "#fff", whiteSpace: "nowrap",
              boxShadow: `0 4px 16px ${C.primary}40`
            }}>
            Sign Up Free</button>
        </div>
      }

      {/* Persistent bottom CTA bar for non-authenticated users */}
      {!isLoggedIn && !showAuthBanner &&
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 199,
          background: "linear-gradient(0deg, rgba(234,240,250,1) 0%, rgba(234,240,250,0.95) 60%, rgba(234,240,250,0) 100%)",
          padding: "60px 32px 24px",
          display: "flex", justifyContent: "center"
        }}>
          <div style={{
            background: "rgba(17,24,39,0.92)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: 16, padding: "14px 28px",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)",
            color: "#fff",
            fontFamily: "'Inter', sans-serif"
          }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
              Viewing in <strong style={{ color: "#fff" }}>preview mode</strong> — sign up to start investing
            </span>
            <button
              onClick={() => openAuth('signup')}
              style={{
                padding: "8px 20px", borderRadius: 10, border: "none",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                background: C.accent, color: "#0D1117",
                whiteSpace: "nowrap"
              }}>
              Create Account</button>
            <button
              onClick={() => openAuth('login')}
              style={{
                padding: "8px 16px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                background: "transparent", color: "rgba(255,255,255,0.7)",
                whiteSpace: "nowrap"
              }}>
              Log In</button>
          </div>
        </div>
      }

      {/* Wallet Panel */}
      {showWallet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250 }}>
          <div onClick={() => setShowWallet(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 70, right: 32, zIndex: 251 }}>
            <WalletPanel balance={auth.balance != null ? parseFloat(auth.balance) : null} onBalanceUpdate={(newBal) => auth.refreshBalance()} onClose={() => setShowWallet(false)} />
          </div>
        </div>
      )}

      {/* Order History */}
      {showOrderHistory && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250 }}>
          <div onClick={() => setShowOrderHistory(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 70, right: 32, zIndex: 251, width: 480, maxHeight: "70vh", overflow: "auto" }}>
            <OrderHistory artistMap={artistMap} onClose={() => setShowOrderHistory(false)} />
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />

      {/* Artist Detail Modal */}
      <ArtistDetailModal
        artist={selectedArtist}
        onClose={() => setSelectedArtist(null)}
        allNews={news}
        trendingSounds={recommendedArtists}
        isLoggedIn={isLoggedIn}
        auth={auth}
        onTradeComplete={handleTradeComplete} />

    </div>
  );
}
