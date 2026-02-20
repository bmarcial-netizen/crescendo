import { useState } from "react";

// ─── Ticker Tape ─── auto-scrolling horizontal strip for portfolio holdings ───

const C = {
  green: "#36D7B7",
  red: "#EF4444",
  text: "#0F172A",
  textMuted: "#94A3B8",
};

export default function TickerTape({ holdings = [] }) {
  const [paused, setPaused] = useState(false);

  if (holdings.length === 0) return null;

  const items = holdings.map((a) => ({
    emoji: a.emoji,
    name: a.name,
    price: a.price.toFixed(2),
    change: a.change,
  }));

  // Duplicate for seamless loop
  const allItems = [...items, ...items, ...items];

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.5)",
        padding: "8px 0",
        position: "relative",
        cursor: "default",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          gap: 0,
          animation: `tickerScroll 30s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "fit-content",
        }}
      >
        {allItems.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 20px",
              whiteSpace: "nowrap",
              borderRight: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontSize: 13 }}>{item.emoji}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
                letterSpacing: "-0.01em",
              }}
            >
              {item.name}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.text,
                fontFamily: "monospace",
              }}
            >
              ${item.price}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "monospace",
                color: item.change >= 0 ? C.green : C.red,
                padding: "1px 6px",
                borderRadius: 4,
                background:
                  item.change >= 0
                    ? "rgba(54,215,183,0.1)"
                    : "rgba(239,68,68,0.1)",
              }}
            >
              {item.change >= 0 ? "+" : ""}
              {item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
