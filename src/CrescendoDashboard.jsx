import { useState, useEffect } from "react";
import { Bell, ArrowLeft, MapPin, Calendar, Tag, TrendingUp, TrendingDown } from "lucide-react";
import ArtistDetailModal from "./ArtistDetailModal";
import WalletPanel from "./WalletPanel";
import OrderHistory from "./OrderHistory";
import EarningsBand from "./EarningsBand";
import { useAuth } from "./AuthContext";
import * as api from "./api";

// ─── Crescendo Dashboard ─── glassmorphic light mode, neon blob accents ───

const C = {
  bg: "#EAF0FA",
  card: "rgba(255,255,255,0.72)",
  cardSolid: "#FFFFFF",
  border: "rgba(255,255,255,0.9)",
  shadow: "0 2px 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
  shadowHover: "0 4px 32px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.9)",
  primary: "#4338CA",
  primarySoft: "rgba(67,56,202,0.08)",
  accent: "#50E3C2",
  accentDark: "#2CB59E",
  green: "#36D7B7",
  greenSoft: "rgba(54,215,183,0.1)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.1)",
  text: "#0F172A",
  textSec: "#64748B",
  textMuted: "#94A3B8",
  blob1: "radial-gradient(circle, rgba(80,227,194,0.50) 0%, transparent 70%)",
  blob2: "radial-gradient(circle, rgba(67,56,202,0.35) 0%, transparent 70%)",
  blob3: "radial-gradient(circle, rgba(91,106,232,0.30) 0%, transparent 70%)"
};

const mockArtists = [
{ id: 1, name: "Mira Voss", genre: "Indie Pop", price: 2.47, change: +18.3, volume: "42.1K", shares: 120, avgCost: 1.82, streams: "2.1M", emoji: "🎤" },
{ id: 2, name: "KODA", genre: "Electronic", price: 5.12, change: +7.2, volume: "118K", shares: 45, avgCost: 4.30, streams: "8.4M", emoji: "🎹" },
{ id: 3, name: "Solène", genre: "R&B / Soul", price: 3.88, change: +31.5, volume: "67.3K", shares: 200, avgCost: 2.10, streams: "5.2M", emoji: "🎵" },
{ id: 4, name: "duskwave", genre: "Lo-fi", price: 0.74, change: +4.8, volume: "8.2K", shares: 500, avgCost: 0.55, streams: "1.4M", emoji: "🌊" },
{ id: 5, name: "The Pale Moths", genre: "Alt Rock", price: 1.03, change: -2.1, volume: "15.8K", shares: 0, avgCost: 0, streams: "890K", emoji: "🎸" },
{ id: 6, name: "Jax Rennick", genre: "Hip-Hop", price: 1.95, change: -5.4, volume: "31.0K", shares: 0, avgCost: 0, streams: "3.7M", emoji: "🎙️" }];


const news = [
{ artist: "Solène", text: "New single 'Amber Light' hits 1M streams in 48 hours", time: "2h", up: true },
{ artist: "KODA", text: "Confirmed for Coachella 2026 lineup", time: "5h", up: true },
{ artist: "Mira Voss", text: "Signed sync deal with A24 for upcoming film", time: "8h", up: true },
{ artist: "Jax Rennick", text: "Postponed North American tour dates", time: "1d", up: false }];


const newsArticles = [
{ id: 1, artist: "2hollis", category: "Releases", location: "Los Angeles, CA", year: "2026", headline: "New EP 'Phantom Thread' drops to critical acclaim", description: "2hollis has released a 6-track EP blending experimental hip-hop with ambient production. The project, produced entirely in-house, has already generated over 2M streams in its first week. Critics are calling it a defining moment for the underground scene, with standout tracks 'Veil' and 'Drift' receiving heavy rotation across independent radio stations.", up: true },
{ id: 2, artist: "Snow Strippers", category: "Touring", location: "Brooklyn, NY", year: "2026", headline: "Sold-out residency at Brooklyn Steel announced", description: "Snow Strippers will perform a 4-night residency at Brooklyn Steel this April, with all dates selling out within 12 minutes. The shows will feature new material from their upcoming album alongside fan favorites. VIP packages include exclusive merchandise and a meet-and-greet session.", up: true },
{ id: 3, artist: "Doechii", category: "Awards", location: "Atlanta, GA", year: "2026", headline: "Nominated for 3 Grammy Awards including Best New Artist", description: "Following a breakout year, Doechii has earned three Grammy nominations spanning Best New Artist, Best Rap Performance, and Best Music Video. Her innovative approach to blending rap with theatrical performance art has garnered widespread industry recognition and a rapidly growing fanbase.", up: true },
{ id: 4, artist: "King Krule", category: "Releases", location: "London, UK", year: "2025", headline: "Surprise album 'Concrete Garden' released overnight", description: "King Krule dropped an unannounced album at midnight, featuring 12 tracks of his signature blend of jazz, punk, and spoken word. The album was recorded entirely in his South London home studio over the past year. Early reviews praise its raw intimacy and sonic experimentation.", up: true },
{ id: 5, artist: "JPEGMAFIA", category: "Collaborations", location: "Baltimore, MD", year: "2026", headline: "Joint project with Danny Brown confirmed for spring", description: "JPEGMAFIA and Danny Brown have announced a collaborative album dropping in March. The pair have been teasing the project on social media with cryptic studio clips. Producers include Kenny Beats and Madlib, promising a fusion of glitch-rap and classic Detroit energy.", up: true },
{ id: 6, artist: "Men I Trust", category: "Touring", location: "Montreal, QC", year: "2026", headline: "World tour spanning 45 cities kicks off in May", description: "The Montreal trio has announced their most ambitious tour yet, covering North America, Europe, and Asia over five months. Support acts include Crumb and Fazerdaze. The tour will showcase material from their forthcoming fourth studio album, described as their most lush and cinematic work to date.", up: true },
{ id: 7, artist: "Feng", category: "Sync", location: "Shanghai, CN", year: "2026", headline: "Track featured in HBO's latest limited series", description: "Feng's atmospheric track 'Still Water' has been placed in the opening credits of HBO's new limited series 'The Garden.' The sync deal marks a significant crossover moment for the artist, whose blend of traditional Chinese instrumentation with electronic production has caught the attention of music supervisors worldwide.", up: true },
{ id: 8, artist: "Ian", category: "Releases", location: "Chicago, IL", year: "2025", headline: "Debut mixtape surpasses 10M total streams", description: "Ian's self-released debut mixtape has quietly crossed the 10 million stream mark across platforms, driven by organic playlist placements and word-of-mouth buzz. The project's lo-fi R&B sound has resonated particularly with Gen-Z listeners, positioning Ian as one to watch in 2026.", up: true },
{ id: 9, artist: "Malcom Todd", category: "Live", location: "Austin, TX", year: "2026", headline: "Headlining SXSW showcase draws record crowd", description: "Malcom Todd's late-night SXSW showcase packed out the Mohawk venue, with fans lined up around the block. The performance featured a full band arrangement and debuted three unreleased songs. Industry insiders are calling it one of the standout moments of the festival.", up: true },
{ id: 10, artist: "Matt Maltese", category: "Releases", location: "London, UK", year: "2026", headline: "Fourth album 'Midnight Baroque' announced with lead single", description: "Matt Maltese has unveiled plans for his fourth studio album alongside lead single 'Chandelier Dust,' a sweeping orchestral pop ballad. The album, due in June, was recorded at Abbey Road Studios with a 24-piece string section. Pre-orders have already surpassed his previous album's first-week figures.", up: true },
{ id: 11, artist: "Esdeekid", category: "Collaborations", location: "São Paulo, BR", year: "2026", headline: "Production credits on major label debut", description: "Esdeekid has landed production credits on a major label artist's debut album, marking a significant milestone. The producer's signature blend of Brazilian funk with trap elements has been gaining traction in international circles, and this placement is expected to open doors to further high-profile collaborations.", up: true },
{ id: 12, artist: "The Tulips", category: "Touring", location: "Amsterdam, NL", year: "2025", headline: "European festival circuit confirms 8 headline slots", description: "The Tulips have been confirmed as headliners at eight major European festivals this summer, including Primavera Sound and Rock Werchter. The band's psychedelic dream-pop sound has been steadily building a devoted European following, and these bookings represent their biggest stages to date.", up: false }];


const trendingSounds = [
{ id: 1, title: "Amber Light", artist: "Solène", platform: "TikTok", uses: "1.2M", growth: "+340%", growthNum: 340, duration: "0:18", snippet: "♪ caught in the amber light, I don't wanna leave tonight...", priceImpact: +12.4, daysAgo: 2, tags: ["viral", "aesthetic"], wave: [3, 5, 4, 7, 9, 14, 18, 25, 38, 52, 71, 89] },
{ id: 2, title: "dissolve (slowed)", artist: "duskwave", platform: "Reels", uses: "842K", growth: "+580%", growthNum: 580, duration: "0:22", snippet: "♪ let me dissolve into the noise...", priceImpact: +8.7, daysAgo: 1, tags: ["slowed", "study"], wave: [2, 3, 5, 4, 8, 11, 19, 28, 44, 62, 78, 95] },
{ id: 3, title: "RUNAWAY", artist: "Jax Rennick", platform: "TikTok", uses: "2.4M", growth: "+120%", growthNum: 120, duration: "0:15", snippet: "♪ I been running, running, can't stop now...", priceImpact: +22.1, daysAgo: 5, tags: ["dance", "transition"], wave: [8, 15, 28, 45, 62, 78, 88, 92, 95, 90, 85, 82] },
{ id: 4, title: "moth song", artist: "The Pale Moths", platform: "TikTok", uses: "390K", growth: "+1,200%", growthNum: 1200, duration: "0:20", snippet: "♪ flickering like a moth to your flame...", priceImpact: +5.2, daysAgo: 0, tags: ["new", "sleeper"], wave: [1, 1, 2, 2, 3, 5, 8, 14, 25, 48, 72, 100] },
{ id: 5, title: "Pulse (remix)", artist: "KODA", platform: "Reels", uses: "678K", growth: "+95%", growthNum: 95, duration: "0:17", snippet: "♪ feel the pulse, feel it drop...", priceImpact: +3.8, daysAgo: 3, tags: ["remix", "gym"], wave: [12, 18, 25, 32, 38, 42, 48, 52, 58, 60, 62, 65] }];


// NOTE: portfolioHoldings, totalValue, totalReturn, totalPct are computed inside the component from live data

const graphWeek = [
{ d: "Mon", v: 1420 }, { d: "Tue", v: 1380 }, { d: "Wed", v: 1510 },
{ d: "Thu", v: 1475 }, { d: "Fri", v: 1620 }, { d: "Sat", v: 1590 }, { d: "Sun", v: 1734 }];


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
          background: `linear-gradient(90deg, ${color1}, ${color2})`,
          transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.textMuted }}>
        <span>${val1.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[0]}</span></span>
        <span>${val2.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[1]}</span></span>
      </div>
    </div>);

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
    </svg>);

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
    </svg>);

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
  const [hover, setHover] = useState(null); // { idx, mouseX, mouseY }
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
    // Find closest candle
    let closest = 0;
    let closestDist = Infinity;
    candles.forEach((c, i) => {
      const cx = 55 + i * ((w - 60) / candles.length) + barW / 2;
      const dist = Math.abs(mouseX - cx);
      if (dist < closestDist) {closestDist = dist;closest = i;}
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
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={isUp ? "#36D7B7" : "#EF4444"} strokeWidth={isHovered ? 2 : 1} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} rx={1} fill={isUp ? "#36D7B7" : "#EF4444"} opacity={isHovered ? 1 : 0.9} />
          </g>);

      })}
      <line x1={50} y1={lastY} x2={w} y2={lastY} stroke="#4338CA" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />
      <rect x={0} y={lastY - 10} width={52} height={20} rx={4} fill="#4338CA" />
      <text x={26} y={lastY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">{lastCandle.close.toFixed(2)}</text>

      {/* Crosshair + tooltip */}
      {hover && hc &&
      <g>
          {/* Vertical crosshair */}
          <line x1={hcX} y1={20} x2={hcX} y2={h - 20} stroke="rgba(67,56,202,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          {/* Horizontal crosshair */}
          <line x1={50} y1={hover.mouseY} x2={w} y2={hover.mouseY} stroke="rgba(67,56,202,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          {/* Price label on Y axis */}
          <rect x={0} y={hover.mouseY - 10} width={52} height={20} rx={4} fill="rgba(67,56,202,0.7)" />
          <text x={26} y={hover.mouseY + 4} fontSize="9" fill="white" textAnchor="middle" fontFamily="monospace">
            {(allLow + (1 - (hover.mouseY - 20) / (h - 40)) * range).toFixed(2)}
          </text>
          {/* OHLC tooltip */}
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
                <text x={tx + 10} y={ty + 32} fontSize="9" fill="#94A3B8" fontFamily="monospace">O: <tspan fill={isUp ? "#36D7B7" : "#EF4444"}>{hc.open.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 46} fontSize="9" fill="#94A3B8" fontFamily="monospace">H: <tspan fill="#fff">{hc.high.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 60} fontSize="9" fill="#94A3B8" fontFamily="monospace">L: <tspan fill="#fff">{hc.low.toFixed(4)}</tspan></text>
                <text x={tx + 10} y={ty + 74} fontSize="9" fill="#94A3B8" fontFamily="monospace">C: <tspan fill={isUp ? "#36D7B7" : "#EF4444"}>{hc.close.toFixed(4)}</tspan></text>
              </g>);

        })()}
        </g>
      }
    </svg>);

}

function MarketsPage({ artists, C, fadeIn, guardedClick, setSelectedArtist, Card, TabPill, isLoggedIn, auth, onTradeComplete }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chartPeriod, setChartPeriod] = useState("8h");
  const [tradeTab, setTradeTab] = useState("BUY");
  const [amount, setAmount] = useState("5");
  const [leverage, setLeverage] = useState(50);
  const [stopLoss, setStopLoss] = useState("0%");
  const [takeProfit, setTakeProfit] = useState("900%");
  const [liveCandles, setLiveCandles] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState(null);

  const selected = artists[selectedIdx];

  // Fetch live candles + quote when artist changes
  useEffect(() => {
    if (!selected?.id) return;
    let cancelled = false;
    api.getCandles(selected.id).then(c => {
      if (!cancelled && c.length > 0) setLiveCandles(c);
    }).catch(() => {});
    api.getQuote(selected.id).then(q => {
      if (!cancelled) setLiveQuote(q);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.id]);

  const [fallbackCandles] = useState(() => generateCandlesticks(selected.price, 45));
  const candles = liveCandles || fallbackCandles;
  const lastPrice = candles[candles.length - 1]?.close || selected.price;
  const execPrice = (lastPrice * parseFloat(amount || 1)).toFixed(2);
  const riskLevel = leverage <= 25 ? "Low Risk" : leverage <= 60 ? "Med Risk" : "High Risk";
  const riskColor = leverage <= 25 ? "#36D7B7" : leverage <= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 16 }}>
        {/* Left: Chart */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{selected.emoji}</span>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>{selected.name} / USD</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>{lastPrice.toFixed(2)}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: selected.change >= 0 ? "#36D7B7" : "#EF4444" }}>
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
              <button key={t} onClick={() => setTradeTab(t)} style={{
                padding: "10px 0", borderRadius: 14, border: "none", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
                background: tradeTab === t ? t === "BUY" ? "#4338CA" : C.accent : "transparent",
                color: tradeTab === t ? "#fff" : "#94A3B8", transition: "all 0.2s"
              }}>{t}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Amount</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>USD ▾</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>{amount}</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["1.00", "2.00", "5.00", "10.00", "15.00"].map((v) =>
              <button key={v} onClick={() => setAmount(v)} style={{
                padding: "4px 8px", borderRadius: 8, border: `1px solid ${amount === v ? "#4338CA" : "rgba(0,0,0,0.06)"}`,
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                background: amount === v ? "rgba(67,56,202,0.08)" : "transparent", color: amount === v ? "#4338CA" : "#64748B"
              }}>{v}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Leverage</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: riskColor }}>{riskLevel}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{leverage}x</div>
            <input type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} style={{ width: "100%", accentColor: "#4338CA" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 2, fontFamily: "monospace" }}>
              {["0", "25", "50", "75", "100"].map((v) => <span key={v}>{v}</span>)}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Stop Loss</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>USD ▾</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>0</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["0%", "-10%", "-25%", "-50%", "-75%"].map((v) =>
              <button key={v} onClick={() => setStopLoss(v)} style={{
                padding: "4px 9px", borderRadius: 20, border: `1px solid ${stopLoss === v ? "#4338CA" : "rgba(0,0,0,0.06)"}`,
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                background: stopLoss === v ? "rgba(67,56,202,0.08)" : "transparent", color: stopLoss === v ? "#4338CA" : "#64748B"
              }}>{v}</button>
              )}
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>Take Profit</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{takeProfit}</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["25%", "50%", "100%", "300%", "900%"].map((v) =>
              <button key={v} onClick={() => setTakeProfit(v)} style={{
                padding: "4px 9px", borderRadius: 20, border: `1px solid ${takeProfit === v ? "#4338CA" : "rgba(0,0,0,0.06)"}`,
                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "monospace",
                background: takeProfit === v ? "rgba(67,56,202,0.08)" : "transparent", color: takeProfit === v ? "#4338CA" : "#64748B"
              }}>{v}</button>
              )}
            </div>
          </Card>

          {tradeMsg && (
            <div style={{
              fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 10, textAlign: "center",
              background: tradeMsg.type === "success" ? "rgba(54,215,183,0.1)" : "rgba(239,68,68,0.1)",
              color: tradeMsg.type === "success" ? "#36D7B7" : "#EF4444",
            }}>{tradeMsg.text}</div>
          )}

          <button onClick={async () => {
            if (!isLoggedIn) { guardedClick(() => {}); return; }
            const qty = parseInt(amount) || 1;
            setTradeLoading(true); setTradeMsg(null);
            try {
              if (tradeTab === "BUY") await api.buyShares(selected.id, qty);
              else await api.sellShares(selected.id, qty);
              setTradeMsg({ type: "success", text: `${tradeTab === "BUY" ? "Bought" : "Sold"} ${qty} shares of ${selected.name}` });
              if (auth) auth.refreshBalance();
              if (onTradeComplete) onTradeComplete();
            } catch (err) {
              setTradeMsg({ type: "error", text: err.message || "Trade failed" });
            } finally { setTradeLoading(false); }
          }} disabled={tradeLoading} style={{
            width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700,
            cursor: tradeLoading ? "wait" : "pointer", fontFamily: "'Inter', sans-serif",
            background: tradeTab === "BUY" ? "#4338CA" : "#EF4444",
            color: "#fff", boxShadow: `0 4px 16px ${tradeTab === "BUY" ? "#4338CA" : "#EF4444"}40`
          }}>{tradeLoading ? "Executing..." : `Place ${tradeTab === "BUY" ? "Buy" : "Sell"}`}</button>

          <Card style={{ padding: 14 }}>
            {[["Execution price", `$${lastPrice.toFixed(4)}`], ["Spread", liveQuote ? `${(liveQuote.spreadBps / 100).toFixed(2)}%` : "—"], ["Bid", liveQuote ? `$${liveQuote.bid.toFixed(4)}` : "—"], ["Ask", liveQuote ? `$${liveQuote.ask.toFixed(4)}` : "—"], ["Balance", auth?.balance !== null ? `$${auth?.balance?.toFixed(2) || "—"}` : "—"]].map(([l, v]) =>
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                <span style={{ color: "#64748B" }}>{l}</span>
                <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 11 }}>{v}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Earnings band for selected artist */}
      {selected?.id && (
        <div style={{ marginBottom: 16 }}>
          <EarningsBand artistId={selected.id} />
        </div>
      )}

      {/* Bottom ticker cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {artists.slice(0, 4).map((a, i) =>
        <Card key={a.id} style={{ padding: 18, cursor: "pointer" }} hover>
            <div onClick={() => { setSelectedIdx(i); setLiveCandles(null); setLiveQuote(null); setTradeMsg(null); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                width: 26, height: 26, borderRadius: 8, background: "rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, border: "1px solid rgba(0,0,0,0.05)"
              }}>{a.emoji}</div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}/USD</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: a.change >= 0 ? "#36D7B7" : "#EF4444" }}>
                  {a.change >= 0 ? "▲" : "▼"} {Math.abs(a.change)}%
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>${a.price.toFixed(2)}</div>
              <SparkLine positive={a.change >= 0} w={100} h={22} />
            </div>
          </Card>
        )}
      </div>
    </div>);

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
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: C.primarySoft,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: C.primary
            }}>{selectedArticle.artist.charAt(0)}</div>
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

          <div style={{
            fontSize: 15, lineHeight: 1.7, color: C.textSec, maxWidth: 640
          }}>
            {selectedArticle.description}
          </div>
        </Card>
      </div>);

  }

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>News</h1>
          <p style={{ fontSize: 14, color: C.textSec }}>Stay updated with the latest in music investing</p>
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

      {/* Column headers */}
      <div style={{
        display: "grid", gridTemplateColumns: "48px 2fr 1fr 1fr 80px",
        padding: "0 20px 12px", fontSize: 11, fontWeight: 600, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace"
      }}>
        <span></span><span>Artist</span><span>Category</span><span>Location</span><span>Year</span>
      </div>

      {/* Rows */}
      {filtered.map((article, i) =>
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

          <div style={{
          width: 36, height: 36, borderRadius: 8, background: C.primarySoft,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: C.primary,
          border: "1px solid rgba(67,56,202,0.1)"
        }}>
            {article.artist.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{article.artist}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 1.3 }}>{article.headline}</div>
          </div>
          <span style={{ fontSize: 13, color: C.textSec }}>{article.category}</span>
          <span style={{ fontSize: 13, color: C.textSec }}>{article.location}</span>
          <span style={{ fontSize: 13, color: C.textMuted, fontFamily: "monospace" }}>{article.year}</span>
        </div>
      )}
      {/* Bottom border */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />
    </div>);

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
    </div>);

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
    </div>);

}

export default function CrescendoDashboard({ navigate, initialTab = "Portfolio", showProfile = false, isLoggedIn = true, user, openAuth, onLogout }) {
  const [tab, setTab] = useState(initialTab);
  const [period, setPeriod] = useState("1W");
  const [marketPeriod, setMarketPeriod] = useState("Daily");
  const [loaded, setLoaded] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
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

  // Map live artists to display format
  const artists = liveArtists ? liveArtists.map((a, i) => ({
    id: a.id,
    name: a.stageName || a.name || `Artist ${i + 1}`,
    genre: a.genre || mockArtists[i % mockArtists.length]?.genre || "Music",
    price: a.currentPrice || 0,
    change: a.change24h || mockArtists[i % mockArtists.length]?.change || 0,
    volume: a.volume24h || mockArtists[i % mockArtists.length]?.volume || "0",
    shares: 0,
    avgCost: 0,
    streams: a.streams || mockArtists[i % mockArtists.length]?.streams || "0",
    emoji: mockArtists[i % mockArtists.length]?.emoji || "🎵",
    circuitBreakerStatus: a.circuitBreakerStatus,
    revenueSharePct: a.revenueSharePct,
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
        emoji: artists.find(a => a.id === p.artistId)?.emoji || "🎵",
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
      {/* font loaded from index.html */}
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

      {/* Background blobs */}
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
          {["Portfolio", "Markets", "News"].map((t) =>
          <button key={t} onClick={() => {setTab(t);navigate(t.toLowerCase());}} style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.06em",
            background: tab === t && !showProfile ? "#fff" : "transparent",
            color: tab === t && !showProfile ? C.text : C.textSec,
            boxShadow: tab === t && !showProfile ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s"
          }}>{t}</button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Wallet balance */}
          {isLoggedIn && (
            <button onClick={() => { setShowWallet(!showWallet); setShowOrderHistory(false); }} style={{
              padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.8)",
              background: "rgba(255,255,255,0.7)", cursor: "pointer",
              fontSize: 12, fontWeight: 700, color: C.text,
              fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>$</span>
              {auth.balance !== null ? auth.balance.toFixed(2) : "—"}
            </button>
          )}
          {/* Trade history */}
          {isLoggedIn && (
            <button onClick={() => { setShowOrderHistory(!showOrderHistory); setShowWallet(false); }} title="Trade History" style={{
              width: 38, height: 38, borderRadius: 12,
              background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: C.text }}>TH</span>
            </button>
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
            {isLoggedIn ? user?.initials || 'U' : '→'}</div>
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

      {/* Wallet overlay */}
      {showWallet && (
        <div style={{
          position: "fixed", top: 70, right: 32, zIndex: 150,
          width: 340, animation: "slideDown 0.3s ease-out",
        }}>
          <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <WalletPanel
            balance={auth.balance}
            onBalanceUpdate={() => auth.refreshBalance()}
            onClose={() => setShowWallet(false)}
          />
        </div>
      )}

      {/* Order History overlay */}
      {showOrderHistory && (
        <div style={{
          position: "fixed", top: 70, right: 32, zIndex: 150,
          width: 420, maxHeight: "80vh", overflowY: "auto",
          animation: "slideDown 0.3s ease-out",
        }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowOrderHistory(false)} style={{
              position: "absolute", top: 8, right: 8, zIndex: 10,
              background: "rgba(0,0,0,0.04)", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer", fontSize: 14, color: C.textMuted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
            <OrderHistory artistMap={artistMap} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", position: "relative", zIndex: 1 }}>

        {/* ─── PROFILE PAGE ─── */}
        {showProfile &&
        <div style={fadeIn(0.1)}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Profile</h1>
              <p style={{ fontSize: 14, color: C.textSec }}>Manage your account and preferences</p>
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
                }}>{user?.initials || 'U'}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>@{(user?.name || 'user').toLowerCase().replace(/\s/g, '_')}_crescendo</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Member since Jan 2026</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[{ label: "Balance", value: auth.balance !== null ? `$${auth.balance.toFixed(0)}` : "$—" }, { label: "Portfolio Value", value: `$${totalValue.toFixed(0)}` }, { label: "Total Returns", value: `${totalReturn >= 0 ? "+" : ""}$${totalReturn.toFixed(0)}` }].map((s) =>
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
                <button onClick={onLogout} style={{
                  marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 12,
                  border: `1px solid ${C.red}30`, background: C.redSoft, color: C.red,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}>Sign Out</button>
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
          TabPill={TabPill}
          isLoggedIn={isLoggedIn}
          auth={auth}
          onTradeComplete={handleTradeComplete} />

        }

        {/* ─── NEWS PAGE ─── */}
        {!showProfile && tab === "News" &&
        <NewsPage C={C} fadeIn={fadeIn} Card={Card} />
        }

        {/* ─── DASHBOARD PAGE (original content) ─── */}
        {!showProfile && tab === "Portfolio" && <>

          {/* Portfolio Value Header */}
          <div style={{ marginBottom: 24, ...fadeIn(0.1) }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Portfolio</h1>
            <p style={{ fontSize: 14, color: C.textSec }}>Your music investment overview</p>
          </div>

          {/* Top Row: Two Progress Bars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, ...fadeIn(0.15) }}>
            <Card style={{ padding: 24 }}>
              <ProgressBar
                value={totalValue} max={2500}
                color1={C.primary} color2="#8B5CF6"
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

            {/* Expenses-style: Portfolio Breakdown */}
            <Card style={{ padding: 24, gridRow: "span 2" }} hover>
              <div style={fadeIn(0.2)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Holdings</h2>
                  <TabPill options={["Value", "%"]} active="Value" onChange={() => {}} />
                </div>

                {/* Blob visualization mimicking the expense chart */}
                <div style={{
                  position: "relative", width: "100%", height: 220,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20
                }}>
                  {/* Decorative grid */}
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
                    {[0.25, 0.5, 0.75, 1].map((r, i) =>
                    <ellipse key={i} cx="50%" cy="55%" rx={`${r * 45}%`} ry={`${r * 40}%`} fill="none" stroke={C.textMuted} strokeWidth="0.5" />
                    )}
                  </svg>
                  {/* Colored blobs for each holding */}
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
                    background: "radial-gradient(circle, rgba(67,56,202,0.4) 0%, rgba(67,56,202,0.1) 60%, transparent 80%)",
                    bottom: 30, left: "35%", filter: "blur(6px)"
                  }} />
                  <div style={{
                    position: "absolute", width: 60, height: 60, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(54,215,183,0.4) 0%, transparent 70%)",
                    bottom: 50, right: "30%", filter: "blur(5px)"
                  }} />
                  {/* Center labels */}
                  {portfolioHoldings.map((a, i) => {
                    const positions = [
                    { left: "12%", bottom: 10 },
                    { right: "12%", bottom: 10 },
                    { left: "12%", top: 0 },
                    { right: "12%", top: 0 }];

                    const colors = [C.accent, "#5B6AE8", C.primary, C.green];
                    return (
                      <div key={a.id} onClick={() => guardedClick(() => setSelectedArtist(a))} style={{ position: "absolute", ...positions[i], textAlign: "center", cursor: "pointer" }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: colors[i], margin: "0 auto 4px",
                          boxShadow: `0 0 8px ${colors[i]}60`
                        }} />
                        <div style={{ fontSize: 11, color: C.textMuted }}>{a.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>${(a.shares * a.price).toFixed(0)}</div>
                      </div>);

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
              </div>
            </Card>

            {/* Bank Accounts style: Active Positions */}
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
                  const pct = ((a.price - a.avgCost) / a.avgCost * 100).toFixed(1);
                  return (
                    <div key={a.id} style={{
                      padding: "14px 0",
                      borderBottom: idx === 0 ? "1px solid rgba(0,0,0,0.05)" : "none"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{a.emoji}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
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

                      {/* Blob row mimicking the QuickBooks circle indicators */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        {[C.accent, "#5B6AE8", C.primary].map((c, i) =>
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
                    </div>);

                })}
              </div>
            </Card>

            {/* Sales-style: Performance Chart */}
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

                {/* Tips-style card at bottom */}
                <div style={{
                  marginTop: 16, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.primary}14, ${C.accent}20)`,
                  padding: 16, position: "relative", overflow: "hidden"
                }}>
                  {/* Decorative wireframe globe */}
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

            {/* Bottom card spanning 2 cols: Most Active Markets */}
            <Card style={{ padding: 24, gridColumn: "span 2" }} hover>
              <div style={fadeIn(0.35)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Most Active Markets</h2>
                  <TabPill options={["Daily", "Weekly", "Monthly"]} active={marketPeriod} onChange={setMarketPeriod} />
                </div>

                {/* Column headers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 70px",
                  padding: "0 0 10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
                  fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase",
                  letterSpacing: "0.08em", fontFamily: "monospace"
                }}>
                  <span>Artist</span><span>Price</span><span>Change</span><span>Volume</span><span></span>
                </div>

                {artists.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume)).map((a, i) =>
                <div key={a.id} onClick={() => guardedClick(() => setSelectedArtist(a))} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 70px",
                  alignItems: "center", padding: "12px 0",
                  borderBottom: i < artists.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  cursor: "pointer", transition: "background 0.15s", borderRadius: 8
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "rgba(0,0,0,0.03)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, border: "1px solid rgba(0,0,0,0.04)"
                    }}>{a.emoji}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{a.genre}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${a.price.toFixed(2)}</div>
                    <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: a.change >= 0 ? C.green : C.red
                  }}>{a.change >= 0 ? "+" : ""}{a.change}%</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{a.volume}</div>
                    <SparkLine positive={a.change >= 0} />
                  </div>
                )}
              </div>
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
                        background: "linear-gradient(135deg, rgba(80,227,194,0.15), rgba(67,56,202,0.15))",
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

              {/* Scrollable cards row */}
              <div style={{
                display: "flex", gap: 14, padding: "16px 24px 24px 24px",
                overflowX: "auto", scrollSnapType: "x mandatory"
              }}>
                {trendingSounds.map((sound, i) => {
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
                    onMouseEnter={(e) => {e.currentTarget.style.transform = "translateY(-3px)";e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";}}
                    onMouseLeave={(e) => {e.currentTarget.style.transform = "none";e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.03)";}}>

                      {/* Decorative blob */}
                      <div style={{
                        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                        background: isExplosive ?
                        "radial-gradient(circle, rgba(67,56,202,0.25) 0%, transparent 70%)" :
                        "radial-gradient(circle, rgba(80,227,194,0.25) 0%, transparent 70%)",
                        filter: "blur(10px)", pointerEvents: "none"
                      }} />

                      {/* Platform + Tags */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: sound.platform === "TikTok" ? "#00000010" : "linear-gradient(135deg, rgba(67,56,202,0.08), rgba(80,227,194,0.08))",
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
                        }}>🚀 EXPLOSIVE
                          </span>}
                      </div>

                      {/* Title + Artist */}
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2, lineHeight: 1.3 }}>
                        {sound.title}
                      </div>
                      <div style={{ fontSize: 12, color: C.primary, fontWeight: 600, marginBottom: 10 }}>
                        {matchedArtist?.emoji} {sound.artist}
                      </div>

                      {/* Wave visualization */}
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

                      {/* Stats row */}
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

                      {/* Tags */}
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

                      {/* Invest CTA */}
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
                        onClick={(e) => {e.stopPropagation();guardedClick(() => setSelectedArtist(matchedArtist));}}>
                          Invest →</span>
                        </div>
                      }
                    </div>);

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
                      <span style={{ fontWeight: 600, color: C.primary }}>{n.artist}</span>
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
      {/* Floating sign-up banner for non-authenticated users */}
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
            background: `linear-gradient(135deg, ${C.primary}, #5B6AE8)`,
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

      {/* Artist Detail Modal */}
      <ArtistDetailModal
        artist={selectedArtist}
        onClose={() => setSelectedArtist(null)}
        allNews={news}
        trendingSounds={trendingSounds}
        isLoggedIn={isLoggedIn}
        balance={auth.balance}
        onTradeComplete={handleTradeComplete} />

    </div>);

}