import { useState, useEffect } from "react";
import * as api from "./api";

const C = {
  primary: "#1E40AF",
  accent: "#38BDF8",
  green: "#36D7B7",
  red: "#EF4444",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
};

export default function EarningsBand({ artistId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;
    setLoading(true);
    api.getEarningsBand(artistId).then(d => {
      if (!cancelled) { setData(d); setLoading(false); }
    }).catch(err => {
      if (!cancelled) { setError(err.message); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [artistId]);

  if (loading) return <div style={{ fontSize: 12, color: C.textMuted, padding: 16 }}>Loading earnings data...</div>;
  if (error) return <div style={{ fontSize: 12, color: C.red, padding: 16 }}>{error}</div>;
  if (!data) return null;

  const bands = [
    { label: "Low", key: "low", color: C.red },
    { label: "Base", key: "base", color: C.primary },
    { label: "High", key: "high", color: C.green },
  ];

  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 20, padding: 20,
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 4 }}>
        Earnings Estimate
      </div>
      <div style={{ fontSize: 12, color: C.textSec, marginBottom: 16 }}>
        {data.stageName} · {(data.revenueSharePct * 100).toFixed(0)}% revenue share · {data.sharesOutstanding?.toLocaleString()} shares
      </div>

      {/* Earnings per share bands */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Monthly EPS</div>
        <div style={{ display: "flex", gap: 8 }}>
          {bands.map(b => (
            <div key={b.key} style={{
              flex: 1, textAlign: "center", padding: "10px 8px",
              background: b.color + "08", borderRadius: 10,
              border: `1px solid ${b.color}15`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: b.color, marginBottom: 4 }}>{b.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>
                ${data.earningsPerShare?.[b.key]?.toFixed(6) ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Implied yield */}
      {data.impliedYield && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Annualized Yield</div>
          <div style={{ display: "flex", gap: 8 }}>
            {bands.map(b => (
              <div key={b.key} style={{
                flex: 1, textAlign: "center", padding: "8px",
                background: "rgba(0,0,0,0.02)", borderRadius: 8,
              }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: b.color, fontFamily: "monospace" }}>
                  {(data.impliedYield[b.key] * 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gross monthly royalty */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Est. Gross Monthly Royalty</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>
          ${data.grossMonthlyRoyalty?.low?.toFixed(2) ?? "—"} — ${data.grossMonthlyRoyalty?.high?.toFixed(2) ?? "—"}
        </div>
      </div>

      {/* Adjustments */}
      {data.adjustments && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.textMuted }}>
            Popularity adj: <span style={{ fontWeight: 600, color: C.text }}>{data.adjustments.popularityMultiplier?.toFixed(4)}x</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted }}>
            Fan conv adj: <span style={{ fontWeight: 600, color: C.text }}>{data.adjustments.fanConversionMultiplier?.toFixed(4)}x</span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {data.disclaimer && (
        <div style={{
          fontSize: 10, color: C.textMuted, lineHeight: 1.4,
          padding: "8px 10px", background: "rgba(0,0,0,0.02)", borderRadius: 8,
          borderLeft: `2px solid ${C.textMuted}30`,
        }}>
          {data.disclaimer}
        </div>
      )}
    </div>
  );
}
