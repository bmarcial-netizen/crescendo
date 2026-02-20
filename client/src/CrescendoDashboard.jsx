import { useState, useEffect, useRef, useCallback } from "react";
import ArtistDetailModal from "./ArtistDetailModal";
import InteractiveChart from "./InteractiveChart";
import TickerTape from "./TickerTape";
import Confetti from "./Confetti";
// useGestures hook available for extending swipe/long-press/double-tap interactions

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
  blob3: "radial-gradient(circle, rgba(91,106,232,0.30) 0%, transparent 70%)",
};

const artists = [
  { id: 1, name: "Mira Voss", genre: "Indie Pop", price: 2.47, change: +18.3, volume: "42.1K", shares: 120, avgCost: 1.82, streams: "2.1M", emoji: "🎤" },
  { id: 2, name: "KODA", genre: "Electronic", price: 5.12, change: +7.2, volume: "118K", shares: 45, avgCost: 4.30, streams: "8.4M", emoji: "🎹" },
  { id: 3, name: "Solène", genre: "R&B / Soul", price: 3.88, change: +31.5, volume: "67.3K", shares: 200, avgCost: 2.10, streams: "5.2M", emoji: "🎵" },
  { id: 4, name: "duskwave", genre: "Lo-fi", price: 0.74, change: +4.8, volume: "8.2K", shares: 500, avgCost: 0.55, streams: "1.4M", emoji: "🌊" },
  { id: 5, name: "The Pale Moths", genre: "Alt Rock", price: 1.03, change: -2.1, volume: "15.8K", shares: 0, avgCost: 0, streams: "890K", emoji: "🎸" },
  { id: 6, name: "Jax Rennick", genre: "Hip-Hop", price: 1.95, change: -5.4, volume: "31.0K", shares: 0, avgCost: 0, streams: "3.7M", emoji: "🎙️" },
];

const news = [
  { artist: "Solène", text: "New single 'Amber Light' hits 1M streams in 48 hours", time: "2h", up: true },
  { artist: "KODA", text: "Confirmed for Coachella 2026 lineup", time: "5h", up: true },
  { artist: "Mira Voss", text: "Signed sync deal with A24 for upcoming film", time: "8h", up: true },
  { artist: "Jax Rennick", text: "Postponed North American tour dates", time: "1d", up: false },
];

const trendingSounds = [
  { id: 1, title: "Amber Light", artist: "Solène", platform: "TikTok", uses: "1.2M", growth: "+340%", growthNum: 340, duration: "0:18", snippet: "♪ caught in the amber light, I don't wanna leave tonight...", priceImpact: +12.4, daysAgo: 2, tags: ["viral", "aesthetic"], wave: [3, 5, 4, 7, 9, 14, 18, 25, 38, 52, 71, 89] },
  { id: 2, title: "dissolve (slowed)", artist: "duskwave", platform: "Reels", uses: "842K", growth: "+580%", growthNum: 580, duration: "0:22", snippet: "♪ let me dissolve into the noise...", priceImpact: +8.7, daysAgo: 1, tags: ["slowed", "study"], wave: [2, 3, 5, 4, 8, 11, 19, 28, 44, 62, 78, 95] },
  { id: 3, title: "RUNAWAY", artist: "Jax Rennick", platform: "TikTok", uses: "2.4M", growth: "+120%", growthNum: 120, duration: "0:15", snippet: "♪ I been running, running, can't stop now...", priceImpact: +22.1, daysAgo: 5, tags: ["dance", "transition"], wave: [8, 15, 28, 45, 62, 78, 88, 92, 95, 90, 85, 82] },
  { id: 4, title: "moth song", artist: "The Pale Moths", platform: "TikTok", uses: "390K", growth: "+1,200%", growthNum: 1200, duration: "0:20", snippet: "♪ flickering like a moth to your flame...", priceImpact: +5.2, daysAgo: 0, tags: ["new", "sleeper"], wave: [1, 1, 2, 2, 3, 5, 8, 14, 25, 48, 72, 100] },
  { id: 5, title: "Pulse (remix)", artist: "KODA", platform: "Reels", uses: "678K", growth: "+95%", growthNum: 95, duration: "0:17", snippet: "♪ feel the pulse, feel it drop...", priceImpact: +3.8, daysAgo: 3, tags: ["remix", "gym"], wave: [12, 18, 25, 32, 38, 42, 48, 52, 58, 60, 62, 65] },
];

const portfolioHoldings = artists.filter(a => a.shares > 0);
const totalValue = portfolioHoldings.reduce((s, a) => s + a.shares * a.price, 0);
const totalCost = portfolioHoldings.reduce((s, a) => s + a.shares * a.avgCost, 0);
const totalReturn = totalValue - totalCost;
const totalPct = ((totalReturn / totalCost) * 100).toFixed(1);

const graphWeek = [
  { d: "Mon", v: 1420 }, { d: "Tue", v: 1380 }, { d: "Wed", v: 1510 },
  { d: "Thu", v: 1475 }, { d: "Fri", v: 1620 }, { d: "Sat", v: 1590 }, { d: "Sun", v: 1734 },
];

// Extended portfolio history for interactive chart (30 data points)
const portfolioHistory = [
  { d: "Jan 1", v: 980, vol: "12.3K" }, { d: "Jan 5", v: 1020, vol: "14.1K" },
  { d: "Jan 10", v: 1005, vol: "11.8K" }, { d: "Jan 15", v: 1080, vol: "18.2K" },
  { d: "Jan 20", v: 1120, vol: "15.5K" }, { d: "Jan 25", v: 1095, vol: "13.7K" },
  { d: "Jan 30", v: 1150, vol: "16.4K" }, { d: "Feb 4", v: 1200, vol: "19.1K" },
  { d: "Feb 8", v: 1180, vol: "14.8K" }, { d: "Feb 12", v: 1250, vol: "21.3K" },
  { d: "Feb 16", v: 1230, vol: "17.6K" }, { d: "Feb 20", v: 1310, vol: "22.8K" },
  { d: "Feb 24", v: 1280, vol: "15.2K" }, { d: "Feb 28", v: 1350, vol: "20.4K" },
  { d: "Mar 4", v: 1320, vol: "18.9K" }, { d: "Mar 8", v: 1400, vol: "24.1K" },
  { d: "Mar 12", v: 1385, vol: "19.7K" }, { d: "Mar 16", v: 1450, vol: "26.3K" },
  { d: "Mar 20", v: 1420, vol: "17.8K" }, { d: "Mar 24", v: 1480, vol: "23.5K" },
  { d: "Mar 28", v: 1510, vol: "28.1K" }, { d: "Apr 1", v: 1490, vol: "21.4K" },
  { d: "Apr 5", v: 1550, vol: "25.7K" }, { d: "Apr 9", v: 1530, vol: "19.3K" },
  { d: "Apr 13", v: 1600, vol: "30.2K" }, { d: "Apr 17", v: 1580, vol: "22.6K" },
  { d: "Apr 21", v: 1640, vol: "27.8K" }, { d: "Apr 25", v: 1620, vol: "24.1K" },
  { d: "Apr 29", v: 1690, vol: "31.5K" }, { d: "May 3", v: totalValue, vol: "28.9K" },
];

// Find best performing holding
const bestCall = portfolioHoldings.length > 0
  ? portfolioHoldings.reduce((best, a) => {
      const pct = ((a.price - a.avgCost) / a.avgCost) * 100;
      const bestPct = ((best.price - best.avgCost) / best.avgCost) * 100;
      return pct > bestPct ? a : best;
    })
  : null;
const bestCallPct = bestCall ? (((bestCall.price - bestCall.avgCost) / bestCall.avgCost) * 100).toFixed(1) : 0;

function Blob({ style }) {
  return <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none", ...style }} />;
}

function ProgressBar({ value, max, color1, color2, label1, label2, val1, val2 }) {
  const pct = Math.min((value / max) * 100, 100);
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
          transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.textMuted }}>
        <span>${val1.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[0]}</span></span>
        <span>${val2.toLocaleString()} <span style={{ color: C.textMuted }}>{label2?.split("|")[1]}</span></span>
      </div>
    </div>
  );
}

function MiniChart({ data, color, w = 100, h = 36, showCandles = false, interactive = false, onHover }) {
  // Normalize data: accept both [{v}] and raw number arrays
  const norm = data.map(d => (typeof d === "number" ? d : d.v));
  const max = Math.max(...norm);
  const min = Math.min(...norm);
  const range = max - min || 1;
  const PAD = 4;
  const pts = norm.map((v, i) => ({
    x: (i / Math.max(norm.length - 1, 1)) * w,
    y: PAD + (1 - (v - min) / range) * (h - PAD * 2),
  }));

  // Smooth bezier
  const smoothLine = pts.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = arr[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, "");
  const smoothArea = smoothLine + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

  const [hIdx, setHIdx] = useState(null);
  const gradId = `fill-${color.replace("#", "")}-${w}-${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: h, cursor: interactive ? "crosshair" : "default" }}
      onMouseMove={interactive ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        const idx = Math.max(0, Math.min(norm.length - 1, Math.round(pct * (norm.length - 1))));
        setHIdx(idx);
        if (onHover) onHover(idx);
      } : undefined}
      onMouseLeave={interactive ? () => { setHIdx(null); if (onHover) onHover(null); } : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {interactive && [0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={PAD + (h - PAD * 2) * (1 - f)} x2={w} y2={PAD + (h - PAD * 2) * (1 - f)}
          stroke="rgba(0,0,0,0.04)" strokeWidth={0.5} />
      ))}

      {showCandles ? (
        /* Candlestick mode */
        norm.map((v, i) => {
          const prev = i > 0 ? norm[i - 1] : v;
          const bullish = v >= prev;
          const cColor = bullish ? C.green : C.red;
          const bodyTop = Math.min(pts[i].y, i > 0 ? pts[i - 1].y : pts[i].y);
          const bodyBot = Math.max(pts[i].y, i > 0 ? pts[i - 1].y : pts[i].y);
          const bodyH = Math.max(1.5, bodyBot - bodyTop);
          const cw = Math.max(3, w / norm.length * 0.6);
          const wickH = bodyH * 0.4;
          return (
            <g key={i}>
              <line x1={pts[i].x} y1={bodyTop - wickH} x2={pts[i].x} y2={bodyBot + wickH}
                stroke={cColor} strokeWidth={1} strokeOpacity={hIdx === i ? 1 : 0.7} />
              <rect x={pts[i].x - cw / 2} y={bodyTop} width={cw} height={bodyH}
                rx={1} fill={bullish ? `${cColor}40` : `${cColor}90`} stroke={cColor} strokeWidth={0.8}
                opacity={hIdx === i ? 1 : 0.8} />
            </g>
          );
        })
      ) : (
        <>
          <path d={smoothArea} fill={`url(#${gradId})`} />
          <path d={smoothLine} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
        </>
      )}

      {/* Hover indicator */}
      {interactive && hIdx !== null && pts[hIdx] && (
        <>
          <line x1={pts[hIdx].x} y1={0} x2={pts[hIdx].x} y2={h}
            stroke={color} strokeWidth={0.8} strokeDasharray="2,2" opacity={0.5} />
          <circle cx={pts[hIdx].x} cy={pts[hIdx].y} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

function SparkLine({ positive, w = 60, h = 20 }) {
  const data = positive
    ? [4, 6, 5, 8, 7, 10, 9, 13, 12, 15]
    : [14, 12, 13, 10, 11, 8, 9, 7, 8, 6];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${2 + (1 - (v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={positive ? C.green : C.red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
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
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TabPill({ options, active, onChange }) {
  return (
    <div style={{
      display: "inline-flex", gap: 1, background: "rgba(0,0,0,0.04)",
      borderRadius: 10, padding: 3,
    }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "5px 14px", borderRadius: 8, border: "none",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "monospace",
          background: active === o ? "#fff" : "transparent",
          color: active === o ? C.text : C.textMuted,
          boxShadow: active === o ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          transition: "all 0.2s",
        }}>{o}</button>
      ))}
    </div>
  );
}

// Swipeable artist row for Markets tab
function SwipeableArtistRow({ artist, onClick, onSwipeRight, onSwipeLeft, children }) {
  const rowRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const handleDown = (e) => {
    startX.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    currentX.current = 0;
    swiping.current = true;
  };

  const handleMove = (e) => {
    if (!swiping.current) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = x - startX.current;
    currentX.current = dx;
    if (rowRef.current && Math.abs(dx) > 10) {
      rowRef.current.style.transform = `translateX(${dx * 0.5}px)`;
      rowRef.current.style.transition = "none";
    }
  };

  const handleUp = () => {
    swiping.current = false;
    if (rowRef.current) {
      rowRef.current.style.transform = "translateX(0)";
      rowRef.current.style.transition = "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
    }
    if (currentX.current > 80 && onSwipeRight) {
      onSwipeRight(artist);
    } else if (currentX.current < -80 && onSwipeLeft) {
      onSwipeLeft(artist);
    }
    currentX.current = 0;
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {/* Background actions */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          flex: 1, background: `linear-gradient(90deg, ${C.green}30, ${C.green}15)`,
          display: "flex", alignItems: "center", padding: "0 20px",
          fontSize: 12, fontWeight: 700, color: C.green,
        }}>
          Buy →
        </div>
        <div style={{
          flex: 1, background: `linear-gradient(270deg, ${C.primary}30, ${C.primary}15)`,
          display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px",
          fontSize: 12, fontWeight: 700, color: C.primary,
        }}>
          ← Watchlist
        </div>
      </div>
      <div
        ref={rowRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        onClick={onClick}
        style={{ position: "relative", touchAction: "pan-y" }}
      >
        {children}
      </div>
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
  const [marketSearch, setMarketSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [marketFilter, setMarketFilter] = useState("all"); // all | trending | watchlist
  const [volumeHoverIdx, setVolumeHoverIdx] = useState(null);
  const [volumePeriod, setVolumePeriod] = useState("ALL");
  const [portfolioPeriod, setPortfolioPeriod] = useState("Month");
  const [portHoverIdx, setPortHoverIdx] = useState(null);
  const [portChartMode, setPortChartMode] = useState("line"); // line | candle
  const [mktChartMode, setMktChartMode] = useState("line"); // line | candle
  const [watchlist, setWatchlist] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [doubleTapAnim, setDoubleTapAnim] = useState(null); // sound id that was double-tapped
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profileUser, setProfileUser] = useState(user || null);

  const mainRef = useRef(null);
  const pullStartY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);

  // Show toast helper
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  }, []);

  // Confetti trigger: fire once on mount if portfolio is at ATH
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Pull-to-refresh handlers
  const handleTouchStartRefresh = useCallback((e) => {
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMoveRefresh = useCallback((e) => {
    if (pullStartY.current == null) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0 && !isRefreshing) {
      setPullDistance(Math.min(dy * 0.5, 80));
    }
  }, [isRefreshing]);

  const handleTouchEndRefresh = useCallback(() => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        showToast("Portfolio refreshed");
      }, 1500);
    } else {
      setPullDistance(0);
    }
    pullStartY.current = null;
  }, [pullDistance, isRefreshing, showToast]);

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

  // When profile page is shown, fetch latest user data from backend (if token present)
  useEffect(() => {
    if (!showProfile) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let mounted = true;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Failed to fetch'); return res.json(); })
      .then(data => { if (mounted && data?.user) setProfileUser({
        id: data.user.id,
        name: data.user.displayName || data.user.email.split('@')[0],
        email: data.user.email,
        role: data.user.role,
        initials: (data.user.displayName || data.user.email).slice(0, 2).toUpperCase(),
      }); })
      .catch(() => { /* ignore */ });
    return () => { mounted = false; };
  }, [showProfile]);

  const fadeIn = (delay) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.6s ${delay}s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s ${delay}s cubic-bezier(0.22, 1, 0.36, 1)`,
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
      lineHeight: 1.35,
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
        ...fadeIn(0),
      }}>
        <div
          onClick={() => navigate('home')}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.primary}, #5B6AE8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: "#fff",
          }}>C</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>Crescendo</span>
        </div>

        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: 3, border: "1px solid rgba(255,255,255,0.8)" }}>
          {["Dashboard", "Markets", "Portfolio", "News"].map(t => (
            <button key={t} onClick={() => { setTab(t); navigate(t.toLowerCase()); }} style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
              background: tab === t && !showProfile ? "#fff" : "transparent",
              color: tab === t && !showProfile ? C.text : C.textSec,
              boxShadow: tab === t && !showProfile ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, cursor: "pointer", position: "relative",
          }}>
            🔔
            <div style={{
              position: "absolute", top: 6, right: 6, width: 7, height: 7,
              borderRadius: "50%", background: C.primary, border: "2px solid #fff",
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
                  padding: "8px 16px", borderRadius: 10, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  background: `linear-gradient(135deg, ${C.primary}, #5B6AE8)`,
                  color: "#fff",
                  boxShadow: `0 2px 10px ${C.primary}40`,
                  transition: "all 0.2s",
                }}
              >Sign Up Free</button>
            </>
          )}
        </div>
      </header>

      {/* Ticker Tape */}
      {isLoggedIn && portfolioHoldings.length > 0 && (
        <TickerTape holdings={artists} />
      )}

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: `${Math.min(pullDistance, 60)}px 0 ${isRefreshing ? 16 : 0}px`,
          transition: isRefreshing ? "none" : "padding 0.3s",
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 24 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 4, borderRadius: 2,
                background: `linear-gradient(180deg, ${C.primary}, ${C.accent})`,
                height: isRefreshing ? "100%" : `${30 + Math.sin((pullDistance / 10) + i) * 30}%`,
                animation: isRefreshing ? `soundWave 0.6s ${i * 0.1}s ease-in-out infinite alternate` : "none",
                transition: "height 0.1s",
              }} />
            ))}
          </div>
          <style>{`@keyframes soundWave { from { height: 20%; } to { height: 100%; } }`}</style>
        </div>
      )}

      {/* Confetti overlay */}
      <Confetti active={showConfetti} />

      {/* Toast notification */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 300,
          background: "rgba(17,24,39,0.92)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderRadius: 12, padding: "10px 20px",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideDown 0.3s cubic-bezier(0.22,1,0.36,1)",
          fontFamily: "'Inter', sans-serif",
        }}>
          <style>{`@keyframes slideDown { from { opacity:0; transform:translate(-50%,-10px); } to { opacity:1; transform:translate(-50%,0); } }`}</style>
          {toastMsg}
        </div>
      )}

      {/* Main Content */}
      <main
        ref={mainRef}
        onTouchStart={handleTouchStartRefresh}
        onTouchMove={handleTouchMoveRefresh}
        onTouchEnd={handleTouchEndRefresh}
        style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", position: "relative", zIndex: 1 }}
      >

        {/* ─── PROFILE PAGE ─── */}
        {showProfile && (
          <div style={fadeIn(0.1)}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Profile</h1>
              <p style={{ fontSize: 14, color: C.textSec }}>Manage your account and preferences</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* User Info Card */}
              <Card style={{ padding: 32 }} hover>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.accent}90, ${C.primary}50)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 800, color: C.text,
                    border: "2px solid rgba(255,255,255,0.8)",
                  }}>{profileUser?.initials || user?.initials || '?'}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{profileUser?.name || user?.name || 'User'}</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{profileUser?.email || user?.email || ''}</div>
                    <div style={{
                      display: "inline-block", marginTop: 6,
                      padding: "3px 10px", borderRadius: 6,
                      background: `${C.primary}15`, color: C.primary,
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{profileUser?.role || user?.role || 'investor'}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {[{ label: "Total Invested", value: `$${totalValue.toFixed(0)}` }, { label: "Total Returns", value: `+$${totalReturn.toFixed(0)}` }, { label: "Artists Tracked", value: artists.length }].map(s => (
                    <div key={s.label} style={{ padding: 16, borderRadius: 14, background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 12,
                    border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)",
                    color: "#EF4444", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                >Sign Out</button>
              </Card>

              {/* Settings & Payment Card */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card style={{ padding: 32 }} hover>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>Settings</h2>
                  {["Notification Preferences", "Privacy & Security", "Display & Theme"].map((item, i) => (
                    <div key={item} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "14px 0",
                      borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      cursor: "pointer", transition: "color 0.2s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = C.primary}
                      onMouseLeave={e => e.currentTarget.style.color = C.text}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{item}</span>
                      <span style={{ fontSize: 16, color: C.textMuted }}>→</span>
                    </div>
                  ))}
                </Card>
                <Card style={{ padding: 32 }} hover>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Payment Methods</h2>
                    <div style={{
                      padding: "4px 10px", borderRadius: 6,
                      background: "rgba(99,91,255,0.1)", color: "#635BFF",
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                    }}>STRIPE</div>
                  </div>
                  <div style={{
                    padding: 16, borderRadius: 14,
                    background: "linear-gradient(135deg, #635BFF15, #00D4AA10)",
                    border: "1px solid rgba(99,91,255,0.12)",
                    marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 28, borderRadius: 6,
                        background: "linear-gradient(135deg, #1a1f36, #32325d)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.05em",
                      }}>VISA</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>•••• •••• •••• 4242</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>Test card · Expires 12/28</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Stripe is configured in test mode. Use the test card above to simulate payments.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => window.open('/api/stripe', '_blank')}
                      style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer' }}
                    >Manage Payment</button>
                    <button
                      onClick={() => showToast('Demo: No real charges will be made in test mode')}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: 'transparent', color: C.text, cursor: 'pointer' }}
                    >Run Test Charge</button>
                  </div>
                  <div style={{
                    padding: 16, borderRadius: 14,
                    background: "rgba(0,0,0,0.02)",
                    border: "1px dashed rgba(0,0,0,0.1)",
                    textAlign: "center", cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = C.textSec; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>+ Add Payment Method</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ─── MARKETS PAGE ─── */}
        {!showProfile && tab === "Markets" && (() => {
          const volumeData = [
            { label: "9am", value: 12.4, top: "Solène" },
            { label: "10am", value: 18.2, top: "KODA" },
            { label: "11am", value: 15.7, top: "Mira Voss" },
            { label: "12pm", value: 28.3, top: "Solène" },
            { label: "1pm", value: 22.1, top: "KODA" },
            { label: "2pm", value: 31.5, top: "Jax Rennick" },
            { label: "3pm", value: 25.8, top: "Solène" },
            { label: "4pm", value: 38.2, top: "KODA" },
            { label: "5pm", value: 42.1, top: "duskwave" },
            { label: "6pm", value: 35.6, top: "Solène" },
            { label: "7pm", value: 29.4, top: "Mira Voss" },
            { label: "8pm", value: 24.7, top: "KODA" },
          ];
          const maxVol = Math.max(...volumeData.map(d => d.value));
          const avatarColors = ["#4338CA", "#36D7B7", "#5B6AE8", "#50E3C2", "#8B5CF6", "#F59E0B"];

          // Filtered artist list for sidebar
          const sideFiltered = artists.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(marketSearch.toLowerCase());
            if (marketFilter === "watchlist") return matchesSearch && watchlist.includes(a.id);
            return matchesSearch;
          }).sort((a, b) => {
            if (marketFilter === "trending") return Math.abs(b.change) - Math.abs(a.change);
            return 0;
          });

          // Top movers (by |change|)
          const topMovers = [...artists].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 4);

          // Volume by genre
          const genreMap = {};
          artists.forEach(a => {
            genreMap[a.genre] = (genreMap[a.genre] || 0) + parseFloat(a.volume) * 1000;
          });
          const genreEntries = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);
          const maxGenreVol = genreEntries.length > 0 ? genreEntries[0][1] : 1;

          const filterLabel = marketFilter === "trending" ? `${sideFiltered.length} trending` : marketFilter === "watchlist" ? `${sideFiltered.length} watched` : `${sideFiltered.length} artists`;

          return (
            <div style={fadeIn(0.1)}>
              {/* Two-column grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

                {/* ── LEFT COLUMN ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Header */}
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 2, color: C.text }}>Markets</h1>
                    <p style={{ fontSize: 13, color: C.textSec, margin: 0 }}>Real-time trading volume and artist performance</p>
                  </div>

                  {/* ── Dark Volume Chart Card ── */}
                  <div style={{
                    background: "rgba(17,24,39,0.95)",
                    borderRadius: 24, padding: "28px 28px 24px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
                    position: "relative", overflow: "hidden",
                  }}>
                    {/* Subtle gradient glow */}
                    <div style={{
                      position: "absolute", top: -60, right: -60, width: 200, height: 200,
                      borderRadius: "50%", background: `${C.primary}15`, filter: "blur(60px)", pointerEvents: "none",
                    }} />
                    {/* Title row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 6 }}>Market Volume</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Total trading volume across all artists</div>
                      </div>
                      <button
                        onClick={() => setTab("Markets")}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                          background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 11,
                          fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                      >Explore All Artists</button>
                    </div>

                    {/* Period tabs + chart mode toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 20 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["W1", "W2", "W3", "W4", "W5", "ALL"].map(p => (
                          <button key={p} onClick={() => setVolumePeriod(p)} style={{
                            padding: "5px 12px", borderRadius: 8, border: "none",
                            background: volumePeriod === p ? "rgba(255,255,255,0.12)" : "transparent",
                            color: volumePeriod === p ? "#fff" : "rgba(255,255,255,0.35)",
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                            fontFamily: "monospace", letterSpacing: "0.04em",
                            transition: "all 0.15s",
                          }}>{p}</button>
                        ))}
                      </div>
                      {/* Line / Candle toggle */}
                      <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2 }}>
                        {[{ key: "line", label: "Line" }, { key: "candle", label: "Candles" }].map(m => (
                          <button key={m.key} onClick={() => setMktChartMode(m.key)} style={{
                            padding: "4px 10px", borderRadius: 6, border: "none",
                            background: mktChartMode === m.key ? "rgba(255,255,255,0.12)" : "transparent",
                            color: mktChartMode === m.key ? "#fff" : "rgba(255,255,255,0.35)",
                            fontSize: 10, fontWeight: 600, cursor: "pointer",
                            fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                          }}>{m.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Chart SVG — Line + Candle modes */}
                    {(() => {
                      const W = 500, H = 200, PAD_T = 12, PAD_B = 28, PAD_L = 40, PAD_R = 12;
                      const chartH = H - PAD_T - PAD_B;
                      const chartW = W - PAD_L - PAD_R;
                      const step = chartW / (volumeData.length - 1);
                      const minVol = Math.min(...volumeData.map(d => d.value));
                      const volRange = maxVol - minVol || 1;
                      const points = volumeData.map((d, i) => ({
                        x: PAD_L + i * step,
                        y: PAD_T + chartH - ((d.value - minVol) / volRange) * chartH,
                      }));

                      // Smooth bezier
                      const smoothLine = points.reduce((acc, p, i, arr) => {
                        if (i === 0) return `M${p.x},${p.y}`;
                        const prev = arr[i - 1];
                        const cpx = (prev.x + p.x) / 2;
                        return `${acc} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
                      }, "");
                      const smoothArea = smoothLine + ` L${points[points.length - 1].x},${PAD_T + chartH} L${points[0].x},${PAD_T + chartH} Z`;

                      const hoverPt = volumeHoverIdx !== null ? points[volumeHoverIdx] : null;

                      // Y-axis ticks
                      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
                        y: PAD_T + chartH * (1 - pct),
                        label: `$${(minVol + volRange * pct).toFixed(0)}K`,
                      }));

                      // Candle data
                      const candles = volumeData.map((d, i) => {
                        const prev = i > 0 ? volumeData[i - 1].value : d.value;
                        const open = prev;
                        const close = d.value;
                        const high = Math.max(open, close) * (1 + (Math.sin(i * 2.3) * 0.03 + 0.02));
                        const low = Math.min(open, close) * (1 - (Math.cos(i * 1.7) * 0.03 + 0.02));
                        return { open, close, high, low };
                      });

                      return (
                        <div style={{ position: "relative" }}>
                          <svg
                            width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                            style={{ display: "block", cursor: "crosshair" }}
                            onMouseMove={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const mx = (e.clientX - rect.left) / rect.width * W;
                              let closest = 0, minDist = Infinity;
                              points.forEach((p, i) => { const dist = Math.abs(p.x - mx); if (dist < minDist) { minDist = dist; closest = i; } });
                              setVolumeHoverIdx(closest);
                            }}
                            onMouseLeave={() => setVolumeHoverIdx(null)}
                          >
                            <defs>
                              <linearGradient id="volAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="volLineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={C.primary} />
                                <stop offset="50%" stopColor={C.accent} />
                                <stop offset="100%" stopColor={C.green} />
                              </linearGradient>
                            </defs>

                            {/* Y-axis labels + grid */}
                            {yTicks.map(t => (
                              <g key={t.label}>
                                <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                                <text x={PAD_L - 6} y={t.y + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">{t.label}</text>
                              </g>
                            ))}

                            {mktChartMode === "line" ? (
                              <>
                                {/* Area fill */}
                                <path d={smoothArea} fill="url(#volAreaGrad)" />
                                {/* Line */}
                                <path d={smoothLine} fill="none" stroke="url(#volLineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                {/* Data dots */}
                                {points.map((p, i) => (
                                  <circle key={i} cx={p.x} cy={p.y} r={volumeHoverIdx === i ? 6 : 2.5}
                                    fill={volumeHoverIdx === i ? C.accent : "rgba(255,255,255,0.3)"}
                                    stroke={volumeHoverIdx === i ? "#fff" : "none"} strokeWidth={volumeHoverIdx === i ? 2.5 : 0}
                                    style={{ transition: "all 0.1s ease" }} />
                                ))}
                              </>
                            ) : (
                              <>
                                {/* Candlestick mode */}
                                {candles.map((c, i) => {
                                  const bullish = c.close >= c.open;
                                  const cColor = bullish ? C.green : C.red;
                                  const toYc = (v) => PAD_T + chartH - ((v - minVol) / volRange) * chartH;
                                  const bodyTop = toYc(Math.max(c.open, c.close));
                                  const bodyBot = toYc(Math.min(c.open, c.close));
                                  const wickTop = toYc(c.high);
                                  const wickBot = toYc(c.low);
                                  const cx = points[i].x;
                                  const cw = Math.max(8, step * 0.55);
                                  const isHovered = volumeHoverIdx === i;
                                  return (
                                    <g key={i} opacity={isHovered ? 1 : 0.85}>
                                      <line x1={cx} y1={wickTop} x2={cx} y2={wickBot} stroke={cColor} strokeWidth={isHovered ? 2 : 1.5} />
                                      <rect x={cx - cw / 2} y={bodyTop} width={cw} height={Math.max(2, bodyBot - bodyTop)}
                                        rx={2} fill={bullish ? `${cColor}50` : cColor} stroke={cColor} strokeWidth={1}
                                        style={{ transition: "all 0.1s ease" }} />
                                      {isHovered && (
                                        <rect x={cx - cw / 2 - 2} y={bodyTop - 2} width={cw + 4} height={Math.max(6, bodyBot - bodyTop + 4)}
                                          rx={3} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} />
                                      )}
                                    </g>
                                  );
                                })}
                              </>
                            )}

                            {/* Hover scrubber line */}
                            {hoverPt && (
                              <line x1={hoverPt.x} y1={PAD_T} x2={hoverPt.x} y2={PAD_T + chartH}
                                stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="3,3" />
                            )}

                            {/* X-axis labels */}
                            {volumeData.map((d, i) => (
                              <text key={i} x={points[i].x} y={H - 6} textAnchor="middle"
                                fill={volumeHoverIdx === i ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)"}
                                fontSize="9" fontFamily="monospace"
                                style={{ transition: "fill 0.1s" }}>{d.label}</text>
                            ))}
                          </svg>

                          {/* Hover tooltip */}
                          {volumeHoverIdx !== null && (() => {
                            const d = volumeData[volumeHoverIdx];
                            const leftPct = (points[volumeHoverIdx].x / W) * 100;
                            const c = mktChartMode === "candle" ? candles[volumeHoverIdx] : null;
                            return (
                              <div style={{
                                position: "absolute", top: -8, left: `${leftPct}%`,
                                transform: "translateX(-50%)",
                                background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)",
                                borderRadius: 10, padding: "10px 16px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                                whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
                              }}>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontFamily: "monospace" }}>{d.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                                  ${d.value}K
                                </div>
                                {c && (
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", display: "flex", gap: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4 }}>
                                    <span>O: ${c.open.toFixed(1)}K</span>
                                    <span>H: ${c.high.toFixed(1)}K</span>
                                    <span>L: ${c.low.toFixed(1)}K</span>
                                    <span>C: ${c.close.toFixed(1)}K</span>
                                  </div>
                                )}
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                                  Top: {d.top}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* Bottom metric row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>$247K</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>Volume Today</span>
                      </div>
                      <button
                        onClick={() => {}}
                        style={{
                          padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: 12,
                          fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                          display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                      >Explore Artists <span style={{ fontSize: 14 }}>→</span></button>
                    </div>
                  </div>

                  {/* ── Bottom Two Cards ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* Top Movers Card */}
                    <div style={{
                      background: `linear-gradient(135deg, ${C.primary}, #5B6AE8)`,
                      borderRadius: 20, padding: "24px",
                      boxShadow: `0 8px 32px ${C.primary}30`,
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", top: -30, right: -30, width: 120, height: 120,
                        borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none",
                      }} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 4 }}>Top Movers</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>Biggest price changes today</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        {topMovers.map((a, i) => (
                          <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: "50%",
                              background: "rgba(255,255,255,0.15)",
                              border: "2px solid rgba(255,255,255,0.25)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 18,
                            }}>{a.emoji}</div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                              color: a.change >= 0 ? "#A7F3D0" : "#FCA5A5",
                              padding: "2px 6px", borderRadius: 4,
                              background: a.change >= 0 ? "rgba(167,243,208,0.15)" : "rgba(252,165,165,0.15)",
                            }}>{a.change >= 0 ? "+" : ""}{a.change}%</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>${a.price.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Volume by Genre Card */}
                    <div style={{
                      background: "rgba(255,255,255,0.5)",
                      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      borderRadius: 20, padding: "24px",
                      border: "1px solid rgba(255,255,255,0.6)",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 4 }}>Volume by Genre</div>
                      <div style={{ fontSize: 12, color: C.textSec, marginBottom: 16 }}>Trading volume distribution</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {genreEntries.map(([genre, vol], i) => (
                          <div key={genre}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{genre}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: C.textSec }}>${(vol / 1000).toFixed(0)}K</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${(vol / maxGenreVol) * 100}%`,
                                background: `linear-gradient(90deg, ${avatarColors[i % avatarColors.length]}, ${avatarColors[(i + 1) % avatarColors.length]}80)`,
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Active Markets header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    borderRadius: 16, padding: "16px 20px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>Active Markets</div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {/* Avatar group */}
                      {artists.slice(0, 4).map((a, i) => (
                        <div key={a.id} style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: avatarColors[i % avatarColors.length],
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, border: "2px solid #fff",
                          marginLeft: i === 0 ? 0 : -8,
                          zIndex: 4 - i,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        }}>{a.emoji}</div>
                      ))}
                      {artists.length > 4 && (
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "rgba(0,0,0,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: C.textMuted,
                          border: "2px solid #fff", marginLeft: -8,
                          fontFamily: "monospace",
                        }}>+{artists.length - 4}</div>
                      )}
                    </div>
                  </div>

                  {/* Search bar */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                    borderRadius: 14, padding: "10px 16px",
                    border: "1px solid rgba(255,255,255,0.7)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
                  }}>
                    <span style={{ fontSize: 14, color: C.textMuted }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search artists by name, genre..."
                      value={marketSearch}
                      onChange={e => setMarketSearch(e.target.value)}
                      style={{
                        flex: 1, border: "none", background: "transparent", outline: "none",
                        fontSize: 13, fontWeight: 500, color: C.text,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </div>

                  {/* Filter tabs */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      { key: "all", label: "All Artists" },
                      { key: "trending", label: "Trending" },
                      { key: "watchlist", label: "Watchlist" },
                    ].map(f => (
                      <button key={f.key} onClick={() => setMarketFilter(f.key)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em",
                        background: marketFilter === f.key
                          ? `linear-gradient(135deg, ${C.primary}, #5B6AE8)`
                          : "rgba(255,255,255,0.45)",
                        color: marketFilter === f.key ? "#fff" : C.textSec,
                        boxShadow: marketFilter === f.key ? `0 2px 10px ${C.primary}30` : "none",
                        transition: "all 0.2s",
                      }}>{f.label}</button>
                    ))}
                  </div>

                  {/* Artist count */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, padding: "0 4px" }}>{filterLabel}</div>

                  {/* Scrollable artist list */}
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    maxHeight: 480, overflowY: "auto",
                    paddingRight: 4,
                  }}>
                    {sideFiltered.map((a, idx) => (
                      <SwipeableArtistRow
                        key={a.id}
                        artist={a}
                        onClick={() => guardedClick(() => setSelectedArtist(a))}
                        onSwipeRight={(artist) => {
                          guardedClick(() => {
                            setSelectedArtist(artist);
                            showToast(`Quick buy ${artist.name} →`);
                          });
                        }}
                        onSwipeLeft={(artist) => {
                          setWatchlist(prev => prev.includes(artist.id) ? prev : [...prev, artist.id]);
                          showToast(`${artist.name} added to watchlist`);
                        }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 14px",
                          background: watchlist.includes(a.id) ? `rgba(67,56,202,0.04)` : "rgba(255,255,255,0.55)",
                          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                          borderRadius: 14,
                          border: watchlist.includes(a.id) ? `1px solid ${C.primary}20` : "1px solid rgba(255,255,255,0.6)",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.02)",
                          cursor: "pointer", transition: "all 0.2s ease",
                        }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.85)";
                            e.currentTarget.style.boxShadow = "0 3px 16px rgba(0,0,0,0.05)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = watchlist.includes(a.id) ? `rgba(67,56,202,0.04)` : "rgba(255,255,255,0.55)";
                            e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.02)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* Letter circle avatar */}
                            <div style={{
                              width: 38, height: 38, borderRadius: "50%",
                              background: avatarColors[idx % avatarColors.length],
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 15, fontWeight: 700, color: "#fff",
                              position: "relative", flexShrink: 0,
                            }}>
                              {a.name.charAt(0).toUpperCase()}
                              {watchlist.includes(a.id) && (
                                <div style={{
                                  position: "absolute", top: -2, right: -2,
                                  width: 10, height: 10, borderRadius: "50%",
                                  background: C.primary, border: "2px solid #fff",
                                }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: C.text }}>{a.name}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{a.genre} · {a.volume} shares</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>${a.price.toFixed(2)}</div>
                            <div style={{
                              fontSize: 11, fontWeight: 600, fontFamily: "monospace",
                              color: a.change >= 0 ? C.accentDark : C.red,
                            }}>{a.change >= 0 ? "+" : ""}{a.change}%</div>
                          </div>
                        </div>
                      </SwipeableArtistRow>
                    ))}
                    {sideFiltered.length === 0 && (
                      <div style={{
                        textAlign: "center", padding: "32px 0",
                        color: C.textMuted, fontSize: 13,
                      }}>No artists match your search</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── PORTFOLIO PAGE ─── */}
        {!showProfile && tab === "Portfolio" && (() => {
          const sorted = [...portfolioHoldings].sort((a, b) => (b.shares * b.price) - (a.shares * a.price));
          const avatarColors = ["#4338CA", "#36D7B7", "#5B6AE8", "#50E3C2", "#8B5CF6", "#F59E0B"];
          const chartData = portfolioHistory;
          const chartMax = Math.max(...chartData.map(d => d.v));
          const chartMin = Math.min(...chartData.map(d => d.v));
          const allocations = sorted.map((a, i) => ({
            name: a.name, emoji: a.emoji, value: a.shares * a.price,
            color: avatarColors[i % avatarColors.length],
            pct: ((a.shares * a.price) / totalValue * 100).toFixed(1),
          }));
          const transfers = [
            { type: "sell", label: "Sold shares", artist: sorted[1]?.name || "—", amount: 159, addr: "To BGPPCE...LCwmH", time: "2h ago" },
            { type: "buy", label: "Bought shares", artist: sorted[0]?.name || "—", amount: 250, addr: "From main wallet", time: "5h ago" },
            { type: "dividend", label: "Dividend payout", artist: "All Artists", amount: 14.5, addr: "Portfolio yield", time: "1d ago" },
          ];
          const displayValue = portHoverIdx !== null ? chartData[portHoverIdx].v : totalValue;
          const displayDate = portHoverIdx !== null ? chartData[portHoverIdx].d : null;
          const isPositive = (portHoverIdx !== null ? chartData[portHoverIdx].v - chartData[0].v : totalReturn) >= 0;

          // OHLC candle data (deterministic)
          const candles = chartData.map((d, i) => {
            const prev = i > 0 ? chartData[i - 1].v : d.v;
            const open = prev;
            const close = d.v;
            const n1 = Math.sin(i * 2.3 + 7) * 0.03 + 0.02;
            const n2 = Math.cos(i * 1.7 + 3) * 0.03 + 0.02;
            return { open, close, high: Math.max(open, close) * (1 + n1), low: Math.min(open, close) * (1 - n2) };
          });

          // X-axis month labels
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

          return (
            <div style={fadeIn(0.1)}>

              {/* ═══ ROW 1: Title + Ticker Strip ═══ */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: C.text }}>My Portfolio</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {sorted.slice(0, 3).map(a => (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)",
                      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      <span>{a.emoji}</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{a.name}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>${a.price.toFixed(2)}</span>
                      <span style={{
                        fontFamily: "monospace", fontWeight: 700, fontSize: 11,
                        color: a.change >= 0 ? C.green : C.red,
                        padding: "1px 6px", borderRadius: 4,
                        background: a.change >= 0 ? `${C.green}12` : `${C.red}12`,
                      }}>{a.change >= 0 ? "+" : ""}{a.change}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ ROW 2: Portfolio Cards + Arc Gauge ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 16, marginBottom: 20 }}>
                {/* Card: Music Portfolio */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "22px 24px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Music Portfolio</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>/</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 12 }}>${totalValue.toFixed(2)}</div>
                  {/* Wavy colored chart thumbnail */}
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

                {/* Card: Watchlist */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "22px 24px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Watchlist</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>/</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 12 }}>${(totalCost).toFixed(2)}</div>
                  <svg viewBox="0 0 120 40" style={{ width: "100%", height: 40, display: "block" }}>
                    <defs>
                      <linearGradient id="wavyFill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="100%" stopColor={C.primary} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <path d="M0,30 C15,22 25,32 40,25 C55,18 65,28 80,20 C95,12 105,22 120,16 L120,40 L0,40 Z" fill="url(#wavyFill2)" />
                    <path d="M0,30 C15,22 25,32 40,25 C55,18 65,28 80,20 C95,12 105,22 120,16" fill="none" stroke="#F59E0B" strokeWidth="2" />
                  </svg>
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
                      <linearGradient id="arcGrad2" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={C.primary} />
                        <stop offset="50%" stopColor={C.accent} />
                        <stop offset="100%" stopColor={C.green} />
                      </linearGradient>
                    </defs>
                    {/* Track */}
                    <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" strokeLinecap="round" />
                    {/* Fill */}
                    <path d="M 15 90 A 75 75 0 0 1 165 90" fill="none" stroke="url(#arcGrad2)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${Math.min((totalValue / 2500) * 236, 236)} 236`} />
                    {/* End dots */}
                    <circle cx="15" cy="90" r="4" fill={C.primary} />
                    <circle cx="165" cy="90" r="4" fill="rgba(0,0,0,0.1)" />
                    {/* Progress dot */}
                    {(() => {
                      const pct = Math.min(totalValue / 2500, 1);
                      const angle = Math.PI + pct * Math.PI;
                      const dx = 90 + 75 * Math.cos(angle);
                      const dy = 90 + 75 * Math.sin(angle);
                      return <circle cx={dx} cy={dy} r="5" fill={C.accent} stroke="#fff" strokeWidth="2" />;
                    })()}
                  </svg>
                  <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginTop: -4, marginBottom: 4 }}>Total portfolio value</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>${totalValue.toFixed(2)}</div>
                  <button style={{
                    marginTop: 10, padding: "6px 20px", borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.03)",
                    color: C.text, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 4,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                  >View <span style={{ fontSize: 12 }}>↗</span></button>
                </div>
              </div>

              {/* ═══ ROW 3: Graph Card + AI/Stats Card ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 20 }}>

                {/* ── GRAPH CARD (exact CashPanel style) ── */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "24px 28px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  display: "flex", flexDirection: "column",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📊</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Graph</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}>😊</div>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}>⤢</div>
                    </div>
                  </div>

                  {/* Reactive hover tooltip above chart */}
                  {portHoverIdx !== null && (
                    <div style={{ fontSize: 12, color: C.textSec, marginBottom: 8, fontFamily: "monospace" }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{displayDate}</span>
                      <span style={{ marginLeft: 12, fontWeight: 700, color: C.text, fontSize: 14 }}>${displayValue.toFixed(2)}</span>
                    </div>
                  )}

                  {/* CANDLESTICK CHART */}
                  {(() => {
                    const W = 540, H = 240, PAD_T = 12, PAD_B = 32, PAD_L = 56, PAD_R = 12;
                    const cH = H - PAD_T - PAD_B;
                    const cW = W - PAD_L - PAD_R;
                    const step = cW / chartData.length;

                    // For candle mode: compute range from all OHLC
                    const allVals = candles.flatMap(c => [c.high, c.low]);
                    const cMax = Math.max(...allVals);
                    const cMin = Math.min(...allVals);
                    const cRange = cMax - cMin || 1;
                    const toY = (v) => PAD_T + cH - ((v - cMin) / cRange) * cH;

                    // For line mode
                    const lineRange = chartMax - chartMin || 1;
                    const toYLine = (v) => PAD_T + cH - ((v - chartMin) / lineRange) * cH;
                    const points = chartData.map((d, i) => ({
                      x: PAD_L + i * step + step / 2,
                      y: toYLine(d.v),
                    }));
                    const smoothLine = points.reduce((acc, p, i, arr) => {
                      if (i === 0) return `M${p.x},${p.y}`;
                      const prev = arr[i - 1];
                      const cpx = (prev.x + p.x) / 2;
                      return `${acc} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
                    }, "");
                    const smoothArea = smoothLine + ` L${points[points.length - 1].x},${PAD_T + cH} L${points[0].x},${PAD_T + cH} Z`;

                    // Y-axis ticks
                    const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(pct => {
                      const useRange = portChartMode === "candle" ? cRange : lineRange;
                      const useMin = portChartMode === "candle" ? cMin : chartMin;
                      return {
                        y: PAD_T + cH * (1 - pct),
                        label: (useMin + useRange * pct).toFixed(2),
                      };
                    });

                    // X-axis: distribute month labels
                    const xLabels = chartData.map((d, i) => ({
                      x: PAD_L + i * step + step / 2,
                      label: d.d.length > 3 ? d.d.substring(0, 3) : d.d,
                    }));

                    return (
                      <div style={{ position: "relative", flex: 1 }}>
                        <svg
                          width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                          style={{ display: "block", cursor: "crosshair" }}
                          onMouseMove={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const mx = (e.clientX - rect.left) / rect.width * W;
                            const idx = Math.max(0, Math.min(chartData.length - 1, Math.floor((mx - PAD_L) / step)));
                            setPortHoverIdx(idx);
                          }}
                          onMouseLeave={() => setPortHoverIdx(null)}
                        >
                          {/* Y-axis grid + labels */}
                          {yTicks.map((t, ti) => (
                            <g key={ti}>
                              <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
                              <text x={PAD_L - 8} y={t.y + 3} textAnchor="end" fill={C.textMuted} fontSize="9" fontFamily="monospace">{t.label}</text>
                            </g>
                          ))}

                          {portChartMode === "candle" ? (
                            /* ── CANDLESTICK RENDERING ── */
                            candles.map((c, i) => {
                              const bullish = c.close >= c.open;
                              const color = bullish ? C.green : C.red;
                              const cx = PAD_L + i * step + step / 2;
                              const cw = Math.max(10, step * 0.55);
                              const bTop = toY(Math.max(c.open, c.close));
                              const bBot = toY(Math.min(c.open, c.close));
                              const wTop = toY(c.high);
                              const wBot = toY(c.low);
                              const bodyH = Math.max(3, bBot - bTop);
                              const isHov = portHoverIdx === i;
                              return (
                                <g key={i}>
                                  {/* Hover highlight column */}
                                  {isHov && (
                                    <rect x={cx - step / 2} y={PAD_T} width={step} height={cH}
                                      fill="rgba(0,0,0,0.02)" rx={4} />
                                  )}
                                  {/* Wick */}
                                  <line x1={cx} y1={wTop} x2={cx} y2={wBot}
                                    stroke={color} strokeWidth={isHov ? 2.5 : 1.5} />
                                  {/* Body */}
                                  <rect x={cx - cw / 2} y={bTop} width={cw} height={bodyH}
                                    rx={2}
                                    fill={bullish ? `${color}30` : color}
                                    stroke={color}
                                    strokeWidth={isHov ? 2 : 1.2} />
                                  {/* Hover dot on close price */}
                                  {isHov && (
                                    <circle cx={cx} cy={toY(c.close)} r={5}
                                      fill={color} stroke="#fff" strokeWidth={2} />
                                  )}
                                </g>
                              );
                            })
                          ) : (
                            <>
                              <defs>
                                <linearGradient id="portAreaG2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isPositive ? C.accent : C.red} stopOpacity={0.2} />
                                  <stop offset="100%" stopColor={isPositive ? C.accent : C.red} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="portLineG2" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={isPositive ? C.primary : C.red} />
                                  <stop offset="100%" stopColor={isPositive ? C.accent : "#F87171"} />
                                </linearGradient>
                              </defs>
                              <path d={smoothArea} fill="url(#portAreaG2)" />
                              <path d={smoothLine} fill="none" stroke="url(#portLineG2)" strokeWidth={2.5} strokeLinecap="round" />
                              {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={portHoverIdx === i ? 6 : 0}
                                  fill={isPositive ? C.accent : C.red} stroke="#fff" strokeWidth={portHoverIdx === i ? 2.5 : 0}
                                  style={{ transition: "all 0.08s" }} />
                              ))}
                            </>
                          )}

                          {/* Hover scrubber line */}
                          {portHoverIdx !== null && (
                            <line x1={PAD_L + portHoverIdx * step + step / 2} y1={PAD_T} x2={PAD_L + portHoverIdx * step + step / 2} y2={PAD_T + cH}
                              stroke={C.textMuted} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
                          )}

                          {/* X-axis labels */}
                          {xLabels.map((l, i) => (
                            i % Math.max(1, Math.ceil(chartData.length / 8)) === 0 && (
                              <text key={i} x={l.x} y={H - 8} textAnchor="middle"
                                fill={portHoverIdx === i ? C.text : C.textMuted} fontSize="9" fontFamily="monospace"
                                fontWeight={portHoverIdx === i ? 700 : 400}>{l.label}</text>
                            )
                          ))}
                        </svg>

                        {/* Float tooltip */}
                        {portHoverIdx !== null && (() => {
                          const d = chartData[portHoverIdx];
                          const c = candles[portHoverIdx];
                          const leftPx = ((PAD_L + portHoverIdx * step + step / 2) / W) * 100;
                          return (
                            <div style={{
                              position: "absolute", top: -4, left: `${leftPx}%`,
                              transform: "translateX(-50%)",
                              background: "rgba(17,24,39,0.94)", backdropFilter: "blur(16px)",
                              borderRadius: 10, padding: "10px 16px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                              whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
                            }}>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginBottom: 3 }}>{d.d}</div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>${d.v.toFixed(2)}</div>
                              {portChartMode === "candle" && (
                                <div style={{ display: "flex", gap: 6, fontSize: 9, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4, fontFamily: "monospace" }}>
                                  <span style={{ color: C.green }}>O {c.open.toFixed(2)}</span>
                                  <span style={{ color: "rgba(255,255,255,0.5)" }}>H {c.high.toFixed(2)}</span>
                                  <span style={{ color: "rgba(255,255,255,0.5)" }}>L {c.low.toFixed(2)}</span>
                                  <span style={{ color: c.close >= c.open ? C.green : C.red }}>C {c.close.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Bottom toolbar: chart type icons + period pills */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 2 }}>
                      {[{ key: "line", icon: "📈" }, { key: "candle", icon: "📊" }].map(m => (
                        <button key={m.key} onClick={() => setPortChartMode(m.key)} style={{
                          width: 32, height: 28, borderRadius: 6, border: "none",
                          background: portChartMode === m.key ? "#fff" : "transparent",
                          boxShadow: portChartMode === m.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                          fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>{m.icon}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 2 }}>
                      {["Year", "Month", "Week", "Day"].map(p => (
                        <button key={p} onClick={() => setPortfolioPeriod(p)} style={{
                          padding: "5px 14px", borderRadius: 6, border: "none",
                          background: portfolioPeriod === p ? C.text : "transparent",
                          color: portfolioPeriod === p ? "#fff" : C.textSec,
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>

                  {/* Stats row under chart (like reference right side) */}
                  <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                    {[
                      { label: "Gain to pain ratio", value: "1.8" },
                      { label: "Reward to risk ratio", value: "2.4" },
                      { label: "Total invested", value: `$${totalCost.toFixed(0)}` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── RIGHT: Market Insights Card ── */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "22px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Market Insights</div>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✨</div>
                  </div>

                  {/* Chat-like UI */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      background: `${C.primary}08`, borderRadius: "14px 14px 14px 4px",
                      padding: "12px 14px", fontSize: 12, color: C.textSec, lineHeight: 1.5,
                    }}>
                      Where should I focus my investments this week?
                    </div>
                    <div style={{
                      background: "rgba(0,0,0,0.02)", borderRadius: "14px 14px 4px 14px",
                      padding: "14px 16px", fontSize: 12, color: C.text, lineHeight: 1.6,
                    }}>
                      Based on current market trends:<br />
                      <span style={{ fontWeight: 600 }}>• {sorted[0]?.name}</span> — strong momentum, +{sorted[0]?.change}% this week<br />
                      <span style={{ fontWeight: 600 }}>• {sorted[1]?.name}</span> — undervalued, good entry point<br />
                      <span style={{ fontWeight: 600 }}>• Consider rebalancing</span> your {sorted[sorted.length - 1]?.name} position
                    </div>
                  </div>

                  {/* Model pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {["Trend AI", "Volume AI", "Sentiment", "Candle Analysis"].map(tag => (
                      <div key={tag} style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: "rgba(0,0,0,0.04)", color: C.textSec,
                      }}>{tag}</div>
                    ))}
                  </div>

                  {/* Input */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "8px 12px",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}>
                    <span style={{ fontSize: 14, color: C.textMuted }}>+</span>
                    <div style={{ flex: 1, fontSize: 12, color: C.textMuted }}>Ask about your portfolio...</div>
                    <span style={{ fontSize: 14, color: C.textMuted }}>🎤</span>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 12 }}>↑</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ ROW 4: Transfers + Spending Overview ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* Transfers */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "22px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Transfers</div>
                    <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, cursor: "pointer" }}>View all</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {transfers.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 12,
                          background: t.type === "sell" ? `${C.red}10` : t.type === "buy" ? `${C.green}10` : `${C.primary}08`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>{t.type === "sell" ? "↗" : t.type === "buy" ? "↙" : "💰"}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.label}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{t.addr}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                            color: t.type === "sell" ? C.red : C.green,
                          }}>{t.type === "sell" ? "-" : "+"}${t.amount.toFixed(2)}</div>
                          <div style={{ fontSize: 10, color: C.textMuted }}>{t.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending Overview */}
                <div style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 20, padding: "22px",
                  border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Spending Overview</div>
                    <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, cursor: "pointer" }}>Details</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 2 }}>${totalValue.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 600, fontFamily: "monospace", marginBottom: 16 }}>-$30.00 This week</div>

                  {/* Segmented bar */}
                  <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 16, gap: 2 }}>
                    {allocations.map((a, i) => (
                      <div key={i} style={{
                        flex: a.value, background: a.color,
                        borderRadius: i === 0 ? "6px 0 0 6px" : i === allocations.length - 1 ? "0 6px 6px 0" : 0,
                      }} />
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {allocations.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text }}>{a.emoji} {a.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: C.textSec }}>{a.pct}%</div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: C.text }}>${a.value.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── NEWS PAGE ─── */}
        {!showProfile && tab === "News" && (
          <div style={fadeIn(0.1)}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>News</h1>
              <p style={{ fontSize: 14, color: C.textSec }}>Stay updated with the latest in music investing</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {news.map((n, i) => (
                <Card key={i} style={{ padding: 20 }} hover>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                      background: n.up ? C.green : C.red,
                      boxShadow: `0 0 8px ${n.up ? C.green : C.red}50`,
                    }} />
                    <div>
                      <div style={{ fontSize: 14, lineHeight: 1.3, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: C.primary }}>{n.artist}</span>
                        <span style={{ color: C.textSec }}> — {n.text}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{n.time} ago</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── DASHBOARD PAGE (original content) ─── */}
        {!showProfile && tab === "Dashboard" && (<>

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
                val1={Math.round(totalValue)} val2={2500}
              />
            </Card>
            <Card style={{ padding: 24 }}>
              <ProgressBar
                value={totalReturn} max={500}
                color1={C.accentDark} color2={C.accent}
                label1="Total Returns" label2="Earned|Target"
                val1={Math.round(totalReturn)} val2={500}
              />
            </Card>
          </div>

          {/* Main Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Expenses-style: Portfolio Breakdown */}
            <Card style={{ padding: 24, gridRow: "span 2" }} hover>
              <div style={fadeIn(0.2)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Holdings</h2>
                  <TabPill options={["Value", "%"]} active="Value" onChange={() => { }} />
                </div>

                {/* Blob visualization mimicking the expense chart */}
                <div style={{
                  position: "relative", width: "100%", height: 220,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                }}>
                  {/* Decorative grid */}
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
                    {[0.25, 0.5, 0.75, 1].map((r, i) => (
                      <ellipse key={i} cx="50%" cy="55%" rx={`${r * 45}%`} ry={`${r * 40}%`} fill="none" stroke={C.textMuted} strokeWidth="0.5" />
                    ))}
                  </svg>
                  {/* Colored blobs for each holding */}
                  <div style={{
                    position: "absolute", width: 130, height: 130, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(80,227,194,0.45) 0%, rgba(80,227,194,0.1) 60%, transparent 80%)",
                    top: 25, left: "20%", filter: "blur(8px)",
                  }} />
                  <div style={{
                    position: "absolute", width: 100, height: 100, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(91,106,232,0.45) 0%, rgba(91,106,232,0.1) 60%, transparent 80%)",
                    top: 50, right: "18%", filter: "blur(8px)",
                  }} />
                  <div style={{
                    position: "absolute", width: 80, height: 80, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(67,56,202,0.4) 0%, rgba(67,56,202,0.1) 60%, transparent 80%)",
                    bottom: 30, left: "35%", filter: "blur(6px)",
                  }} />
                  <div style={{
                    position: "absolute", width: 60, height: 60, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(54,215,183,0.4) 0%, transparent 70%)",
                    bottom: 50, right: "30%", filter: "blur(5px)",
                  }} />
                  {/* Center labels */}
                  {portfolioHoldings.map((a, i) => {
                    const positions = [
                      { left: "12%", bottom: 10 },
                      { right: "12%", bottom: 10 },
                      { left: "12%", top: 0 },
                      { right: "12%", top: 0 },
                    ];
                    const colors = [C.accent, "#5B6AE8", C.primary, C.green];
                    return (
                      <div key={a.id} onClick={() => guardedClick(() => setSelectedArtist(a))} style={{ position: "absolute", ...positions[i], textAlign: "center", cursor: "pointer" }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: colors[i], margin: "0 auto 4px",
                          boxShadow: `0 0 8px ${colors[i]}60`,
                        }} />
                        <div style={{ fontSize: 11, color: C.textMuted }}>{a.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>${(a.shares * a.price).toFixed(0)}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 16,
                  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
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
                    fontSize: 13, fontWeight: 600,
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
                      fontSize: 13, cursor: "pointer", border: "1px solid rgba(0,0,0,0.05)",
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
                      borderBottom: idx === 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
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
                        {[C.accent, "#5B6AE8", C.primary].map((c, i) => (
                          <div key={i} style={{
                            width: 28 - i * 4, height: 28 - i * 4, borderRadius: "50%",
                            background: `radial-gradient(circle, ${c}90 0%, ${c}30 70%)`,
                            filter: "blur(0.5px)",
                          }} />
                        ))}
                        <div style={{
                          marginLeft: "auto",
                          fontSize: 22, fontWeight: 700, color: C.text,
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
                <MiniChart data={graphWeek} color={C.primary} h={80} interactive />

                {/* Tips-style card at bottom */}
                <div style={{
                  marginTop: 16, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.primary}14, ${C.accent}20)`,
                  padding: 16, position: "relative", overflow: "hidden",
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
                    boxShadow: `0 0 12px ${C.accent}80`,
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
                    fontSize: 14, cursor: "pointer",
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
                  letterSpacing: "0.08em", fontFamily: "monospace",
                }}>
                  <span>Artist</span><span>Price</span><span>Change</span><span>Volume</span><span></span>
                </div>

                {artists.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume)).map((a, i) => (
                  <div key={a.id} onClick={() => guardedClick(() => setSelectedArtist(a))} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 70px",
                    alignItems: "center", padding: "12px 0",
                    borderBottom: i < artists.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    cursor: "pointer", transition: "background 0.15s", borderRadius: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(0,0,0,0.03)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, border: "1px solid rgba(0,0,0,0.04)",
                      }}>{a.emoji}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{a.genre}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${a.price.toFixed(2)}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: a.change >= 0 ? C.green : C.red,
                    }}>{a.change >= 0 ? "+" : ""}{a.change}%</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{a.volume}</div>
                    <SparkLine positive={a.change >= 0} />
                  </div>
                ))}
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
                        color: C.primary, border: `1px solid ${C.primary}18`,
                      }}>
                        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.accent, animation: "pulse 2s infinite" }} /> LIVE
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSec }}>Songs gaining traction on TikTok & Reels — early signals for price movement</p>
                  </div>
                  <TabPill options={["All", "TikTok", "Reels"]} active="All" onChange={() => { }} />
                </div>
              </div>

              {/* Scrollable cards row */}
              <div style={{
                display: "flex", gap: 14, padding: "16px 24px 24px 24px",
                overflowX: "auto", scrollSnapType: "x mandatory",
              }}>
                {trendingSounds.map((sound, i) => {
                  const isExplosive = sound.growthNum >= 500;
                  const isNew = sound.daysAgo === 0;
                  const matchedArtist = artists.find(a => a.name === sound.artist);
                  const waveMax = Math.max(...sound.wave);

                  return (
                    <div key={sound.id} style={{
                      minWidth: 260, maxWidth: 260, scrollSnapAlign: "start",
                      borderRadius: 16, padding: 18, position: "relative", overflow: "hidden",
                      background: doubleTapAnim === sound.id ? `rgba(67,56,202,0.08)` : "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      border: doubleTapAnim === sound.id ? `1px solid ${C.primary}30` : "1px solid rgba(255,255,255,0.8)",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.03)",
                      transition: "transform 0.25s, box-shadow 0.25s, background 0.3s, border 0.3s",
                      cursor: "pointer",
                      flex: "0 0 auto",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.03)"; }}
                      onDoubleClick={() => {
                        if (matchedArtist) {
                          setWatchlist(prev => prev.includes(matchedArtist.id) ? prev : [...prev, matchedArtist.id]);
                          setDoubleTapAnim(sound.id);
                          showToast(`${matchedArtist.name} added to watchlist`);
                          setTimeout(() => setDoubleTapAnim(null), 600);
                        }
                      }}
                    >
                      {/* Double-tap heart overlay */}
                      {doubleTapAnim === sound.id && (
                        <div style={{
                          position: "absolute", inset: 0, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          zIndex: 5, pointerEvents: "none",
                          animation: "heartPop 0.6s cubic-bezier(0.22,1,0.36,1)",
                        }}>
                          <style>{`@keyframes heartPop { 0% { transform:scale(0); opacity:0; } 30% { transform:scale(1.3); opacity:1; } 100% { transform:scale(1); opacity:0; } }`}</style>
                          <span style={{ fontSize: 40, filter: `drop-shadow(0 2px 8px ${C.primary}50)` }}>★</span>
                        </div>
                      )}
                      {/* Decorative blob */}
                      <div style={{
                        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                        background: isExplosive
                          ? "radial-gradient(circle, rgba(67,56,202,0.25) 0%, transparent 70%)"
                          : "radial-gradient(circle, rgba(80,227,194,0.25) 0%, transparent 70%)",
                        filter: "blur(10px)", pointerEvents: "none",
                      }} />

                      {/* Platform + Tags */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: sound.platform === "TikTok" ? "#00000010" : "linear-gradient(135deg, rgba(67,56,202,0.08), rgba(80,227,194,0.08))",
                          color: sound.platform === "TikTok" ? C.text : C.primary,
                          border: `1px solid ${sound.platform === "TikTok" ? "rgba(0,0,0,0.06)" : C.primary + "18"}`,
                        }}>
                          {sound.platform === "TikTok" ? "♪ TikTok" : "◎ Reels"}
                        </span>
                        {isNew && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: `${C.accent}30`, color: C.accentDark, border: `1px solid ${C.accent}40`,
                          }}>NEW TODAY</span>
                        )}
                        {isExplosive && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: `${C.primary}12`, color: C.primary, border: `1px solid ${C.primary}18`,
                          }}>🚀 EXPLOSIVE
                          </span>)}
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
                        {sound.wave.map((v, wi) => (
                          <div key={wi} style={{
                            flex: 1, borderRadius: 2,
                            height: `${(v / waveMax) * 100}%`,
                            background: v === waveMax
                              ? (isExplosive ? C.primary : C.accent)
                              : `linear-gradient(180deg, ${isExplosive ? C.primary + "40" : C.accent + "40"}, ${isExplosive ? C.primary + "15" : C.accent + "15"})`,
                            transition: "height 0.3s",
                          }} />
                        ))}
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
                            color: isExplosive ? C.primary : C.green,
                          }}>{sound.growth}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Price Impact</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>+{sound.priceImpact}%</div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {sound.tags.map(tag => (
                          <span key={tag} style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 10,
                            background: "rgba(0,0,0,0.03)", color: C.textMuted,
                            fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)",
                          }}>#{tag}</span>
                        ))}
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 10,
                          background: "rgba(0,0,0,0.03)", color: C.textMuted,
                          fontWeight: 500, border: "1px solid rgba(0,0,0,0.04)",
                        }}>{sound.duration}</span>
                      </div>

                      {/* Invest CTA */}
                      {matchedArtist && (
                        <div style={{
                          marginTop: 12, padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.04)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span style={{ fontSize: 12, color: C.textSec }}>
                            Share price: <span style={{ fontWeight: 700, color: C.text }}>${matchedArtist.price.toFixed(2)}</span>
                          </span>
                          <span style={{
                            padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: C.primary, color: "#fff", cursor: "pointer",
                          }}
                            onClick={(e) => { e.stopPropagation(); guardedClick(() => setSelectedArtist(matchedArtist)); }}
                          >Invest →</span>
                        </div>
                      )}
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
              {news.map((n, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "12px 14px",
                  borderRadius: 12, background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0,0,0,0.03)",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: n.up ? C.green : C.red,
                    boxShadow: `0 0 6px ${n.up ? C.green : C.red}50`,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.3 }}>
                      <span style={{ fontWeight: 600, color: C.primary }}>{n.artist}</span>
                      <span style={{ color: C.textSec }}> — {n.text}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{n.time} ago</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>)}
      </main>
      {/* Floating sign-up banner for non-authenticated users */}
      {
        showAuthBanner && (
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
            fontFamily: "'Inter', sans-serif",
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
                boxShadow: `0 4px 16px ${C.primary}40`,
              }}
            >Sign Up Free</button>
          </div>
        )
      }

      {/* Persistent bottom CTA bar for non-authenticated users */}
      {
        !isLoggedIn && !showAuthBanner && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            zIndex: 199,
            background: "linear-gradient(0deg, rgba(234,240,250,1) 0%, rgba(234,240,250,0.95) 60%, rgba(234,240,250,0) 100%)",
            padding: "60px 32px 24px",
            display: "flex", justifyContent: "center",
          }}>
            <div style={{
              background: "rgba(17,24,39,0.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 16, padding: "14px 28px",
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)",
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
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
                  whiteSpace: "nowrap",
                }}
              >Create Account</button>
              <button
                onClick={() => openAuth('login')}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  background: "transparent", color: "rgba(255,255,255,0.7)",
                  whiteSpace: "nowrap",
                }}
              >Log In</button>
            </div>
          </div>
        )
      }

      {/* Artist Detail Modal */}
      <ArtistDetailModal
        artist={selectedArtist}
        onClose={() => setSelectedArtist(null)}
        allNews={news}
        trendingSounds={trendingSounds}
        allArtists={artists}
      />
    </div >
  );
}
