import { useState, useEffect } from "react";
import * as api from "./api";

const C = {
  primary: "#4338CA",
  accent: "#50E3C2",
  green: "#36D7B7",
  red: "#EF4444",
  text: "#0F172A",
  textSec: "#64748B",
  textMuted: "#94A3B8",
};

export default function OrderHistory({ artistMap }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getTradeHistory().then(data => {
      if (!cancelled) { setOrders(data); setLoading(false); }
    }).catch(err => {
      if (!cancelled) { setError(err.message); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
           d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 20, padding: 24,
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 16 }}>
        Trade History
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.textMuted, fontSize: 13 }}>Loading trades...</div>
      )}
      {error && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.red, fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.textMuted, fontSize: 13 }}>No trades yet</div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
          {orders.map(order => {
            const isBuy = order.side === "buy";
            const artistName = artistMap?.[order.artistId] || order.artistId?.slice(0, 8) + "...";
            return (
              <div key={order.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 12,
                background: isBuy ? C.green + "06" : C.red + "06",
                border: `1px solid ${isBuy ? C.green : C.red}15`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isBuy ? C.green + "15" : C.red + "15",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    color: isBuy ? C.green : C.red,
                  }}>{isBuy ? "B" : "S"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{artistName}</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>{formatDate(order.createdAt)}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>
                    {order.quantity} @ ${order.pricePerShare.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isBuy ? C.green : C.red, fontFamily: "monospace" }}>
                    {isBuy ? "-" : "+"}${order.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
