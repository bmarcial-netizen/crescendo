import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Music, ShoppingCart, Bell, Check, CheckCheck, Filter } from "lucide-react";

const C = {
  bg: "#E8EEF8",
  card: "rgba(255,255,255,0.72)",
  border: "rgba(255,255,255,0.9)",
  shadow: "0 2px 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
  primary: "#1E40AF",
  primarySoft: "rgba(30,64,175,0.08)",
  accent: "#38BDF8",
  green: "#38BDF8",
  red: "#EF4444",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
};

const notifications = [
  // Price alerts
  { id: 1, type: "price", title: "malcolm todd hit $3.88", desc: "Price target of $3.80 reached — up 31.5% this week", time: "12m ago", read: false, icon: "up", artist: "malcolm todd" },
  { id: 2, type: "price", title: "King Krule circuit breaker tripped", desc: "Trading halted after rapid 8% decline in 30 minutes", time: "1h ago", read: false, icon: "down", artist: "King Krule" },
  { id: 3, type: "price", title: "2hollis surged +18.3%", desc: "Biggest single-day gain following EP release", time: "3h ago", read: false, icon: "up", artist: "2hollis" },

  // Trading
  { id: 4, type: "trade", title: "Buy order filled — Men I Trust", desc: "100 shares @ $3.60 — total $360.00", time: "4h ago", read: true, icon: "buy", artist: "Men I Trust" },
  { id: 5, type: "trade", title: "Sell order cancelled — malcolm todd", desc: "10 shares @ $3.80 — order expired", time: "6h ago", read: true, icon: "sell", artist: "malcolm todd" },
  { id: 6, type: "trade", title: "Royalty payout received", desc: "$42.50 streaming royalty from malcolm todd", time: "1d ago", read: true, icon: "royalty", artist: "malcolm todd" },

  // Social / activity
  { id: 7, type: "social", title: "Snow Strippers dropped new content", desc: "4-night Brooklyn Steel residency announced — all dates sold out", time: "5h ago", read: false, icon: "music", artist: "Snow Strippers" },
  { id: 8, type: "social", title: "2hollis 'Phantom Thread' milestone", desc: "EP crossed 2M streams in first week", time: "8h ago", read: true, icon: "music", artist: "2hollis" },
  { id: 9, type: "social", title: "iann dior signed A24 sync deal", desc: "Exclusive synchronization licensing deal reportedly worth 7 figures", time: "1d ago", read: true, icon: "social", artist: "iann dior" },
  { id: 10, type: "social", title: "Men I Trust headlining Pitchfork 2026", desc: "Largest headline slot to date — closing Saturday night", time: "2d ago", read: true, icon: "music", artist: "Men I Trust" },

  // More price
  { id: 11, type: "price", title: "iann dior dropped -5.4%", desc: "Gradual decline over 48h — consider adjusting stop-loss", time: "2d ago", read: true, icon: "down", artist: "iann dior" },
  { id: 12, type: "trade", title: "Royalty payout received", desc: "$18.30 sync license royalty from Snow Strippers", time: "3d ago", read: true, icon: "royalty", artist: "Snow Strippers" },
];

function avatarUrl(name, size = 64) {
  const colors = ["1E40AF", "38BDF8", "0EA5E9", "3B82F6", "60A5FA", "1D4ED8"];
  const idx = name.length % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${colors[idx]}&color=fff&bold=true&format=svg`;
}

function getIcon(icon) {
  const s = { size: 16 };
  switch (icon) {
    case "up": return <TrendingUp {...s} color={C.accent} />;
    case "down": return <TrendingDown {...s} color={C.red} />;
    case "buy": return <ShoppingCart {...s} color={C.accent} />;
    case "sell": return <DollarSign {...s} color={C.red} />;
    case "royalty": return <DollarSign {...s} color="#F59E0B" />;
    case "music": return <Music {...s} color={C.primary} />;
    case "social": return <Users {...s} color={C.primary} />;
    default: return <Bell {...s} color={C.textMuted} />;
  }
}

function getBg(icon) {
  switch (icon) {
    case "up": return "rgba(56,189,248,0.1)";
    case "down": return "rgba(239,68,68,0.08)";
    case "buy": return "rgba(56,189,248,0.1)";
    case "sell": return "rgba(239,68,68,0.08)";
    case "royalty": return "rgba(245,158,11,0.1)";
    case "music": return "rgba(30,64,175,0.08)";
    case "social": return "rgba(30,64,175,0.08)";
    default: return "rgba(0,0,0,0.04)";
  }
}

export default function NotificationsPage({ setSelectedArtist, artists, fadeIn }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState(notifications);

  const filtered = filter === "all" ? items :
    filter === "unread" ? items.filter(n => !n.read) :
    items.filter(n => n.type === filter);

  const unreadCount = items.filter(n => !n.read).length;

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "price", label: "Price" },
    { key: "trade", label: "Trading" },
    { key: "social", label: "Activity" },
  ];

  return (
    <div style={fadeIn(0.1)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, textTransform: "uppercase", lineHeight: 1.05 }}>
            Notifications
          </h1>
          <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.primary}25`,
              background: `${C.primary}08`, color: C.primary,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${C.primary}08`; e.currentTarget.style.color = C.primary; }}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "monospace", letterSpacing: "0.04em", textTransform: "uppercase",
              background: filter === f.key ? C.primary : "rgba(255,255,255,0.7)",
              color: filter === f.key ? "#fff" : C.textSec,
              boxShadow: filter === f.key ? `0 2px 8px ${C.primary}30` : C.shadow,
              transition: "all 0.2s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: "60px 20px", textAlign: "center",
            background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
            boxShadow: C.shadow,
          }}>
            <Bell size={32} color={C.textMuted} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>No notifications</div>
            <div style={{ fontSize: 13, color: C.textSec }}>You're all caught up</div>
          </div>
        )}

        {filtered.map((n, i) => {
          const matchedArtist = artists?.find(a => a.name === n.artist);
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px",
                borderRadius: 14,
                background: n.read ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)",
                border: n.read ? `1px solid rgba(255,255,255,0.8)` : `1px solid ${C.primary}20`,
                boxShadow: n.read ? "0 1px 8px rgba(0,0,0,0.02)" : `0 2px 16px rgba(0,0,0,0.04), inset 0 0 0 1px ${C.primary}08`,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                cursor: "pointer", transition: "all 0.2s",
                opacity: 1,
                animation: `fadeSlideIn 0.3s ${i * 0.03}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = n.read ? "0 1px 8px rgba(0,0,0,0.02)" : `0 2px 16px rgba(0,0,0,0.04)`; }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: getBg(n.icon),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {getIcon(n.icon)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: n.read ? 600 : 700, color: C.text, letterSpacing: "-0.01em" }}>
                    {n.title}
                  </span>
                  {!n.read && (
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: C.primary, boxShadow: `0 0 6px ${C.primary}50`,
                    }} />
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.4, marginBottom: 4 }}>
                  {n.desc}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{n.time}</span>
                  {matchedArtist && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setSelectedArtist(matchedArtist); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, fontWeight: 600, color: C.primary,
                        cursor: "pointer", transition: "opacity 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <img src={avatarUrl(n.artist, 32)} alt="" style={{ width: 14, height: 14, borderRadius: 4 }} />
                      {n.artist}
                    </span>
                  )}
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: n.type === "price" ? "rgba(56,189,248,0.1)" : n.type === "trade" ? "rgba(245,158,11,0.1)" : "rgba(30,64,175,0.08)",
                    color: n.type === "price" ? C.accent : n.type === "trade" ? "#F59E0B" : C.primary,
                    textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.06em",
                  }}>
                    {n.type}
                  </span>
                </div>
              </div>

              {/* Read indicator */}
              {n.read && (
                <Check size={14} color={C.textMuted} style={{ flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
