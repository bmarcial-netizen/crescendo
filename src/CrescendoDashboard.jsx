import { useState, useEffect } from "react";
import { Bell, ArrowLeft, MapPin, Calendar, Tag, TrendingUp, TrendingDown, DollarSign, Music, BarChart3, Wallet, AlertTriangle } from "lucide-react";
import ArtistDetailModal from "./ArtistDetailModal";
import WalletPanel from "./WalletPanel";
import OrderHistory from "./OrderHistory";
import EarningsBand from "./EarningsBand";
import { useAuth } from "./AuthContext";
import * as api from "./api";

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
  green: "#38BDF8",
  greenSoft: "rgba(56,189,248,0.1)",
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

const trendingSounds = [
  { id: 1, title: "Amber Light", artist: "Malcom Todd", platform: "TikTok", uses: "1.2M", growth: "+340%", growthNum: 340, duration: "0:18", snippet: "♪ caught in the amber light, I don't wanna leave tonight...", priceImpact: +12.4, daysAgo: 2, tags: ["viral", "aesthetic"], wave: [3, 5, 4, 7, 9, 14, 18, 25, 38, 52, 71, 89] },
  { id: 2, title: "dissolve (slowed)", artist: "Men I Trust", platform: "Reels", uses: "842K", growth: "+580%", growthNum: 580, duration: "0:22", snippet: "♪ let me dissolve into the noise...", priceImpact: +8.7, daysAgo: 1, tags: ["slowed", "study"], wave: [2, 3, 5, 4, 8, 11, 19, 28, 44, 62, 78, 95] },
  { id: 3, title: "RUNAWAY", artist: "Ian", platform: "TikTok", uses: "2.4M", growth: "+120%", growthNum: 120, duration: "0:15", snippet: "♪ I been running, running, can't stop now...", priceImpact: +22.1, daysAgo: 5, tags: ["dance", "transition"], wave: [8, 15, 28, 45, 62, 78, 88, 92, 95, 90, 85, 82] },
  { id: 4, title: "Concrete Garden", artist: "King Krule", platform: "TikTok", uses: "390K", growth: "+1,200%", growthNum: 1200, duration: "0:20", snippet: "♪ flickering through the concrete garden...", priceImpact: +5.2, daysAgo: 0, tags: ["new", "sleeper"], wave: [1, 1, 2, 2, 3, 5, 8, 14, 25, 48, 72, 100] },
  { id: 5, title: "Pulse (remix)", artist: "Snow Strippers", platform: "Reels", uses: "678K", growth: "+95%", growthNum: 95, duration: "0:17", snippet: "♪ feel the pulse, feel it drop...", priceImpact: +3.8, daysAgo: 3, tags: ["remix", "gym"], wave: [12, 18, 25, 32, 38, 42, 48, 52, 58, 60, 62, 65] }
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
  const max = Math.max(...data.map((d) => d.v));
  const min = Math.min(...data.map((d) => d.v));
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = i / (data.length - 1) * w;
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

// Generate candlestick data for the chart
function generateCandlesticks(basePrice, count = 40) {
  const candles = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.45) * basePrice * 0.04;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.015;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.015;
    candles.push({ open, close, high, low, time: i });
    price = close;
  }
  return candles;
}

function CandlestickChart({ candles, w = 720, h = 380 }) {
  const [hover, setHover] = useState(null);
  const svgRef = useState(null);

  if (!candles.length) return null;
  const allHigh = Math.max(...candles.map((c) => c.high));
  const allLow = Math.min(...candles.map((c) => c.low));
  const range = allHigh - allLow || 1;
  const barW = Math.max((w - 60) / candles.length - 2, 4);
  const toY = (v) => 20 + (1 - (v - allLow) / range) * (h - 40);
  const steps = 6;
  const yLabels = [];
  for (let i = 0; i <= steps; i++) {
    const val = allLow + range / steps * i;
    yLabels.push({ val, y: toY(val) });
  }
  const lastCandle = candles[candles.length - 1];
  const lastY = toY(lastCandle.close);

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
        const isUp = c.close >= c.open;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(bodyBot - bodyTop, 1);
        const isHovered = hover && hover.idx === i;
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={isUp ? "#38BDF8" : "#EF4444"} strokeWidth={isHovered ? 2 : 1} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} rx={1} fill={isUp ? "#38BDF8" : "#EF4444"} opacity={isHovered ? 1 : 0.9} />
          </g>
        );
      })}
      <line x1={50} y1={lastY} x2={w} y2={lastY} stroke="#1E40AF" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />
      <rect x={0} y={lastY - 10} width={52} height={20} rx={4} fill="#1E40AF" />
      <text x={26} y={lastY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">{lastCandle.close.toFixed(2)}</text>
      {hover && hc &&
        <g>
          <line x1={hcX} y1={20} x2={hcX} y2={h - 20} stroke="rgba(30,64,175,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={50} y1={hover.mouseY} x2={w} y2={hover.mouseY} stroke="rgba(30,64,175,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          <rect x={0} y={hover.mouseY - 10} width={52} height={20} rx={4} fill="rgba(30,64,175,0.7)" />
          <text x={26} y={hover.mouseY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">
            {(allLow + (1 - (hover.mouseY - 20) / (h - 40)) * range).toFixed(2)}
          </text>
          {(() => {
            const tooltipW = 130;
            const tooltipH = 82;
            const tx = hcX + 15 + tooltipW > w ? hcX - tooltipW - 15 : hcX + 15;
            const ty = Math.max(5, Math.min(hover.mouseY - tooltipH / 2, h - tooltipH - 5));
            const isUp = hc.close >= hc.open;
            return (
              <g>
                <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={8} fill="rgba(15,23,42,0.92)" />
                <text x={tx + 10} y={ty + 16} fontSize="10" fontWeight="700" fill="#fff" fontFamily="monospace">OHLC Data</text>
                <text x={tx + 10} y={ty + 32} fontSize="9" fill="#94A3B8" fontFamily="monospace">O: <tspan fill={isUp ? "#38BDF8" : "#EF4444"}>{hc.open.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 46} fontSize="9" fill="#94A3B8" fontFamily="monospace">H: <tspan fill="#fff">{hc.high.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 60} fontSize="9" fill="#94A3B8" fontFamily="monospace">L: <tspan fill="#fff">{hc.low.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 74} fontSize="9" fill="#94A3B8" fontFamily="monospace">C: <tspan fill={isUp ? "#38BDF8" : "#EF4444"}>{hc.close.toFixed(4)}</tspan></text>
              </g>
            );
          })()}
        </g>
      }
    </svg>
  );
}

function MarketsPage({ artists, C, fadeIn, guardedClick, setSelectedArtist, Card, TabPill }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chartPeriod, setChartPeriod] = useState("8h");
  const [tradeTab, setTradeTab] = useState("BUY");
  const [amount, setAmount] = useState("5.00");
  const [leverage, setLeverage] = useState(50);
  const [stopLoss, setStopLoss] = useState("0%");
  const [takeProfit, setTakeProfit] = useState("900%");

  const selected = artists[selectedIdx];
  const isTripped = selected.circuitBreakerStatus === "tripped";
  const [candles] = useState(() => generateCandlesticks(selected.price, 45));
  const lastPrice = candles[candles.length - 1]?.close || selected.price;
  const execPrice = (lastPrice * parseFloat(amount || 1)).toFixed(2);
  const riskLevel = leverage <= 25 ? "Low Risk" : leverage <= 60 ? "Med Risk" : "High Risk";
  const riskColor = leverage <= 25 ? "#38BDF8" : leverage <= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>Markets</h1>
        <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Trade artist tokens in real time</p>
      </div>
      {/* Circuit breaker warning */}
      {isTripped && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 18px",
          borderRadius: 14, marginBottom: 16,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: C.red, fontSize: 13, fontWeight: 600
        }}>
          <AlertTriangle size={18} /> Trading halted — circuit breaker tripped for <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selected.ticker || getTicker(selected.name)}</span> {selected.name}
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
                <span
                  onClick={() => setSelectedArtist(selected)}
                  style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = C.primary}
                  onMouseLeave={e => e.target.style.color = C.text}
                ><span style={{ fontSize: 11, fontWeight: 700, color: selected.change >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 6 }}>{selected.ticker || getTicker(selected.name)}</span>{selected.name} / USD</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>{lastPrice.toFixed(2)}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: selected.change >= 0 ? "#38BDF8" : "#EF4444" }}>
                  {selected.change >= 0 ? "▲" : "▼"} {Math.abs(selected.change)}%
                </span>
              </div>
            </div>
            <TabPill options={["5m", "1h", "8h", "1D", "1W"]} active={chartPeriod} onChange={setChartPeriod} />
          </div>
          <div style={{ width: "100%", height: 360 }}>
            <CandlestickChart candles={candles} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 55px 0", fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>
            {["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"].map((t) => <span key={t}>{t}</span>)}
          </div>
        </Card>

        {/* Right: Trade panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card style={{ padding: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {["BUY", "SELL"].map((t) =>
                <button key={t} onClick={() => !isTripped && setTradeTab(t)} disabled={isTripped} style={{
                  padding: "10px 0", borderRadius: 14, border: "none", fontSize: 13, fontWeight: 700,
                  cursor: isTripped ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
                  background: tradeTab === t ? t === "BUY" ? C.accent : "#1E40AF" : "transparent",
                  color: tradeTab === t ? (t === "BUY" ? "#0F172A" : "#fff") : "#94A3B8", transition: "all 0.2s",
                  opacity: isTripped ? 0.5 : 1
                }}>{t}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Amount</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>USD ▾</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>{amount}</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["1.00", "2.00", "5.00", "10.00", "15.00"].map((v) =>
                <button key={v} onClick={() => setAmount(v)} style={{
                  padding: "4px 8px", borderRadius: 8, border: `1px solid ${amount === v ? "#1E40AF" : "rgba(0,0,0,0.06)"}`,
                  fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                  background: amount === v ? "rgba(30,64,175,0.08)" : "transparent", color: amount === v ? "#1E40AF" : "#475569"
                }}>{v}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Leverage</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: riskColor }}>{riskLevel}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{leverage}x</div>
            <input type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} style={{ width: "100%", accentColor: "#1E40AF" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 2, fontFamily: "monospace" }}>
              {["0", "25", "50", "75", "100"].map((v) => <span key={v}>{v}</span>)}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Stop Loss</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>USD ▾</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>0</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["0%", "-10%", "-25%", "-50%", "-75%"].map((v) =>
                <button key={v} onClick={() => setStopLoss(v)} style={{
                  padding: "4px 9px", borderRadius: 20, border: `1px solid ${stopLoss === v ? "#1E40AF" : "rgba(0,0,0,0.06)"}`,
                  fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                  background: stopLoss === v ? "rgba(30,64,175,0.08)" : "transparent", color: stopLoss === v ? "#1E40AF" : "#475569"
                }}>{v}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Take Profit</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{takeProfit}</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["25%", "50%", "100%", "300%", "900%"].map((v) =>
                <button key={v} onClick={() => setTakeProfit(v)} style={{
                  padding: "4px 9px", borderRadius: 20, border: `1px solid ${takeProfit === v ? "#1E40AF" : "rgba(0,0,0,0.06)"}`,
                  fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                  background: takeProfit === v ? "rgba(30,64,175,0.08)" : "transparent", color: takeProfit === v ? "#1E40AF" : "#475569"
                }}>{v}</button>
              )}
            </div>
          </Card>

          <button
            onClick={() => !isTripped && setSelectedArtist(selected)}
            disabled={isTripped}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700,
              cursor: isTripped ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
              background: isTripped ? "rgba(0,0,0,0.1)" : (tradeTab === "BUY" ? C.accent : C.primary),
              color: isTripped ? C.textMuted : (tradeTab === "BUY" ? "#0F172A" : "#fff"),
              boxShadow: isTripped ? "none" : `0 4px 16px ${tradeTab === "BUY" ? C.accent : C.primary}40`,
              opacity: isTripped ? 0.6 : 1
            }}>
            {isTripped ? "Trading Halted" : `Place ${tradeTab === "BUY" ? "Buy" : "Sell"}`}
          </button>

          <Card style={{ padding: 14 }}>
            {[["Execution price", execPrice], ["Spread", "0%"], ["Slippage", "--"], ["Notional value", `${amount} USD`], ["Platform fee", "0 USD (0.023%)"], ["Daily limit", "10,000 USD"]].map(([l, v]) =>
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                <span style={{ color: "#475569" }}>{l}</span>
                <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 11 }}>{v}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom ticker cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {artists.slice(0, 4).map((a, i) =>
          <Card key={a.id} style={{ padding: 18, cursor: "pointer" }} hover>
            <div onClick={() => setSelectedIdx(i)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <img
                  src={avatarUrl(a.name, 52)} alt={a.name}
                  onClick={(e) => { e.stopPropagation(); setSelectedArtist(a); }}
                  style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)", cursor: "pointer" }}
                />
                <span
                  onClick={(e) => { e.stopPropagation(); setSelectedArtist(a); }}
                  style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = C.primary}
                  onMouseLeave={e => e.target.style.color = C.text}
                ><span style={{ fontWeight: 700, color: a.change >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 4, fontSize: 11 }}>{a.ticker || getTicker(a.name)}</span>{a.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: a.change >= 0 ? "#38BDF8" : "#EF4444" }}>
                  {a.change >= 0 ? "▲" : "▼"} {Math.abs(a.change)}%
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>${a.price.toFixed(2)}</div>
              <SparkLine positive={a.change >= 0} w={100} h={22} />
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

export default function CrescendoDashboard({ navigate, initialTab = "Portfolio", showProfile = false, isLoggedIn = true, user, openAuth, onLogout }) {
  const [tab, setTab] = useState(initialTab);
  const [period, setPeriod] = useState("1W");
  const [marketPeriod, setMarketPeriod] = useState("Daily");
  const [loaded, setLoaded] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

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

  // Map live artists to display format (merge with mock for fields backend doesn't have)
  const artists = liveArtists ? liveArtists.map((a, i) => ({
    id: a.id,
    name: a.stageName || a.name || `Artist ${i + 1}`,
    ticker: getTicker(a.stageName || a.name || ""),
    genre: a.genre || mockArtists[i % mockArtists.length]?.genre || "Music",
    price: a.currentPrice || 0,
    change: a.change24h || mockArtists[i % mockArtists.length]?.change || 0,
    volume: a.volume24h || mockArtists[i % mockArtists.length]?.volume || "0",
    shares: 0,
    avgCost: 0,
    streams: a.streams || mockArtists[i % mockArtists.length]?.streams || "0",
    bio: a.bio || mockArtists[i % mockArtists.length]?.bio || "",
    sharesOutstanding: a.sharesOutstanding || mockArtists[i % mockArtists.length]?.sharesOutstanding || 0,
    maxShares: a.maxShares || mockArtists[i % mockArtists.length]?.maxShares || 10000,
    revenueSharePct: a.revenueSharePct || mockArtists[i % mockArtists.length]?.revenueSharePct || 0,
    circuitBreakerStatus: a.circuitBreakerStatus || "normal",
  })) : mockArtists;

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

        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.6)", borderRadius: 0, padding: 3, border: "1px solid rgba(255,255,255,0.8)" }}>
          {["Portfolio", "Markets", "News"].map((t) =>
            <button key={t} onClick={() => { setTab(t); navigate(t.toLowerCase()); }} style={{
              padding: "8px 20px", borderRadius: 0, border: "none",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
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
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, cursor: "pointer", position: "relative"
          }}>
            <Bell size={18} color={C.text} />
            <div style={{
              position: "absolute", top: 6, right: 6, width: 7, height: 7,
              borderRadius: "50%", background: C.primary, border: "2px solid #fff"
            }} />
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: C.text,
            border: showProfile ? `2px solid ${C.primary}` : "1px solid rgba(255,255,255,0.8)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onClick={() => isLoggedIn ? navigate('profile') : openAuth('signup')}>
            {isLoggedIn ? user?.initials || 'LN' : '→'}</div>
          {!isLoggedIn &&
            <button
              onClick={() => openAuth('signup')}
              style={{
                height: 38, padding: "0 16px", borderRadius: 10, border: "none",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                background: C.primary,
                color: "#fff",
                boxShadow: `0 2px 10px ${C.primary}40`,
                transition: "all 0.2s"
              }}>
              Sign Up</button>
          }
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", position: "relative", zIndex: 1 }}>

        {/* ─── PROFILE PAGE ─── */}
        {showProfile &&
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
                  }}>LN</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Luna N.</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>@luna_crescendo</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Member since Jan 2026</div>
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
        {!showProfile && tab === "Markets" &&
          <MarketsPage
            artists={artists}
            C={C}
            fadeIn={fadeIn}
            guardedClick={guardedClick}
            setSelectedArtist={setSelectedArtist}
            Card={Card}
            TabPill={TabPill} />
        }

        {/* ─── NEWS PAGE ─── */}
        {!showProfile && tab === "News" &&
          <NewsPage C={C} fadeIn={fadeIn} Card={Card} />
        }

        {/* ─── DASHBOARD PAGE (original content) ─── */}
        {!showProfile && tab === "Portfolio" && <>

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
                        {[C.accent, "#3B82F6", C.primary].map((c, i) =>
                          <div key={i} style={{
                            width: 28 - i * 4, height: 28 - i * 4, borderRadius: "50%",
                            background: `radial-gradient(circle, ${c}90 0%, ${c}30 70%)`,
                            filter: "blur(0.5px)"
                          }} />
                        )}
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
                  <TabPill options={["1D", "1W", "1M"]} active={period} onChange={setPeriod} />
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
                          <span style={{ fontSize: 14, fontWeight: 600 }}><span style={{ fontSize: 10, fontWeight: 700, color: a.change >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 5 }}>{a.ticker || getTicker(a.name)}</span>{a.name}</span>
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

          {/* Trending Sounds */}
          <div style={{ marginBottom: 20, ...fadeIn(0.38) }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "24px 24px 0 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Trending Sounds</h2>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: "linear-gradient(135deg, rgba(80,227,194,0.15), rgba(30,64,175,0.15))",
                        color: C.primary, border: `1px solid ${C.primary}18`
                      }}>
                        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.accent, animation: "pulse 2s infinite" }} /> LIVE
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSec }}>Songs gaining traction on TikTok & Reels — early signals for price movement</p>
                  </div>
                  <TabPill options={["All", "TikTok", "Reels"]} active="All" onChange={() => {}} />
                </div>
              </div>

              <div style={{
                display: "flex", gap: 14, padding: "16px 24px 24px 24px",
                overflowX: "auto", scrollSnapType: "x mandatory"
              }}>
                {trendingSounds.map((sound) => {
                  const isExplosive = sound.growthNum >= 500;
                  const isNew = sound.daysAgo === 0;
                  const matchedArtist = artists.find((a) => a.name === sound.artist);
                  const waveMax = Math.max(...sound.wave);

                  return (
                    <div key={sound.id} style={{
                      minWidth: 260, maxWidth: 260, scrollSnapAlign: "start",
                      borderRadius: 16, padding: 18, position: "relative", overflow: "hidden",
                      background: "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
                      transition: "transform 0.25s, box-shadow 0.25s",
                      cursor: "pointer",
                      flex: "0 0 auto"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.03)"; }}>

                      <div style={{
                        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                        background: isExplosive ?
                          "radial-gradient(circle, rgba(30,64,175,0.25) 0%, transparent 70%)" :
                          "radial-gradient(circle, rgba(80,227,194,0.25) 0%, transparent 70%)",
                        filter: "blur(10px)", pointerEvents: "none"
                      }} />

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: sound.platform === "TikTok" ? "#00000010" : "linear-gradient(135deg, rgba(30,64,175,0.08), rgba(80,227,194,0.08))",
                          color: sound.platform === "TikTok" ? C.text : C.primary,
                          border: `1px solid ${sound.platform === "TikTok" ? "rgba(0,0,0,0.06)" : C.primary + "18"}`
                        }}>
                          {sound.platform === "TikTok" ? "♪ TikTok" : "◎ Reels"}
                        </span>
                        {isNew &&
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: `${C.accent}30`, color: C.accentDark, border: `1px solid ${C.accent}40`
                          }}>NEW TODAY</span>
                        }
                        {isExplosive &&
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: `${C.primary}12`, color: C.primary, border: `1px solid ${C.primary}18`
                          }}>🚀 EXPLOSIVE</span>
                        }
                      </div>

                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2, lineHeight: 1.3 }}>
                        {sound.title}
                      </div>
                      <div style={{ fontSize: 12, color: C.primary, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                        {matchedArtist && <img src={avatarUrl(sound.artist, 32)} alt="" style={{ width: 14, height: 14, borderRadius: 4 }} />}
                        <span style={{ fontSize: 10, fontWeight: 700, color: sound.priceImpact >= 0 ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 5 }}>{getTicker(sound.artist)}</span>{sound.artist}
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32, marginBottom: 10 }}>
                        {sound.wave.map((v, wi) =>
                          <div key={wi} style={{
                            flex: 1, borderRadius: 2,
                            height: `${v / waveMax * 100}%`,
                            background: v === waveMax ?
                              isExplosive ? C.primary : C.accent :
                              `linear-gradient(180deg, ${isExplosive ? C.primary + "40" : C.accent + "40"}, ${isExplosive ? C.primary + "15" : C.accent + "15"})`,
                            transition: "height 0.3s"
                          }} />
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Uses</div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{sound.uses}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Growth</div>
                          <div style={{
                            fontSize: 14, fontWeight: 700,
                            color: isExplosive ? C.primary : C.green
                          }}>{sound.growth}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Price Impact</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>+{sound.priceImpact}%</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {sound.tags.map((tag) =>
                          <span key={tag} style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10,
                            background: "rgba(0,0,0,0.03)", color: C.textMuted,
                            fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)"
                          }}>#{tag}</span>
                        )}
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 10,
                          background: "rgba(0,0,0,0.03)", color: C.textMuted,
                          fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)"
                        }}>{sound.duration}</span>
                      </div>

                      {matchedArtist &&
                        <div style={{
                          marginTop: 12, padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.04)",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <span style={{ fontSize: 12, color: C.textSec }}>
                            Share price: <span style={{ fontWeight: 700, color: C.text }}>${matchedArtist.price.toFixed(2)}</span>
                          </span>
                          <span style={{
                            padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: C.primary, color: "#fff", cursor: "pointer"
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedArtist(matchedArtist); }}>
                            Invest →</span>
                        </div>
                      }
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
            <WalletPanel onClose={() => setShowWallet(false)} />
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
        trendingSounds={trendingSounds}
        isLoggedIn={isLoggedIn}
        auth={auth}
        onTradeComplete={handleTradeComplete} />

    </div>
  );
}
