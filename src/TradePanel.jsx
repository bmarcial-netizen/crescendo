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

export default function TradePanel({ artist, onTradeComplete, balance }) {
  const [side, setSide] = useState("buy"); // buy | sell
  const [quantity, setQuantity] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch quote when artist changes or side changes
  useEffect(() => {
    if (!artist?.id) return;
    let cancelled = false;
    setQuoteLoading(true);
    api.getQuote(artist.id).then(q => {
      if (!cancelled) {
        setQuote(q);
        setQuoteLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setQuoteLoading(false);
    });
    return () => { cancelled = true; };
  }, [artist?.id]);

  const qty = parseInt(quantity) || 0;
  const price = quote ? (side === "buy" ? quote.ask : quote.bid) : (artist?.currentPrice || 0);
  const total = qty * price;
  const spread = quote ? (quote.spreadBps / 100).toFixed(2) : "—";

  const handleTrade = async () => {
    if (qty <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (side === "buy") {
        await api.buyShares(artist.id, qty);
      } else {
        await api.sellShares(artist.id, qty);
      }
      setSuccess(`${side === "buy" ? "Bought" : "Sold"} ${qty} shares of ${artist.stageName || artist.name} @ $${price.toFixed(4)}`);
      setQuantity("");
      if (onTradeComplete) onTradeComplete();
    } catch (err) {
      setError(err.message || "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  const quickQty = [10, 25, 50, 100, 250];

  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 20, padding: 24,
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
    }}>
      {/* Artist header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{artist?.stageName || artist?.name || "Select Artist"}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          {quote ? `Bid: $${quote.bid.toFixed(4)} · Ask: $${quote.ask.toFixed(4)} · Spread: ${spread}%` : quoteLoading ? "Loading quote..." : ""}
        </div>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 2, marginBottom: 16 }}>
        {["buy", "sell"].map(s => (
          <button key={s} onClick={() => { setSide(s); setError(null); setSuccess(null); }} style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
            letterSpacing: "0.05em", fontFamily: "'Inter', sans-serif",
            background: side === s
              ? (s === "buy" ? C.green + "20" : C.red + "20")
              : "transparent",
            color: side === s
              ? (s === "buy" ? C.green : C.red)
              : C.textMuted,
          }}>{s}</button>
        ))}
      </div>

      {/* Quantity input */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Quantity (shares)</span>
          <span>@ ${price.toFixed(4)} {side === "buy" ? "(ask)" : "(bid)"}</span>
        </div>
        <input
          type="number"
          placeholder="0"
          min="1"
          step="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12, boxSizing: "border-box",
            border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.03)",
            fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif",
            outline: "none", textAlign: "center",
          }}
        />
      </div>

      {/* Quick quantities */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {quickQty.map(q => (
          <button key={q} onClick={() => setQuantity(q.toString())} style={{
            flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)",
            background: quantity === q.toString() ? C.primary + "10" : "rgba(0,0,0,0.02)",
            color: quantity === q.toString() ? C.primary : C.textSec,
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
          }}>{q}</button>
        ))}
      </div>

      {/* Order summary */}
      <div style={{
        background: "rgba(0,0,0,0.02)", borderRadius: 12, padding: "12px 14px",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSec }}>Execution Price</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>${price.toFixed(4)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSec }}>Spread</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{spread}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSec }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>${total.toFixed(4)}</span>
        </div>
        {balance !== null && balance !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Available Balance</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: balance >= total ? C.green : C.red, fontFamily: "monospace" }}>
              ${balance.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <div style={{ fontSize: 12, color: C.red, marginBottom: 10, padding: "8px 12px", background: C.red + "10", borderRadius: 8 }}>{error}</div>
      )}
      {success && (
        <div style={{ fontSize: 12, color: C.green, marginBottom: 10, padding: "8px 12px", background: C.green + "10", borderRadius: 8 }}>{success}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleTrade}
        disabled={loading || qty <= 0}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
          background: side === "buy"
            ? `linear-gradient(135deg, ${C.green}, ${C.accent})`
            : `linear-gradient(135deg, ${C.red}, #F87171)`,
          color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer",
          fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
          boxShadow: `0 4px 16px ${side === "buy" ? C.green : C.red}30`,
          opacity: qty <= 0 ? 0.5 : 1,
        }}
      >
        {loading ? "Executing..." : `Place ${side === "buy" ? "Buy" : "Sell"} Order`}
      </button>

      {/* Circuit breaker warning */}
      {artist?.circuitBreakerStatus === "tripped" && (
        <div style={{
          marginTop: 10, fontSize: 11, color: C.red, padding: "8px 12px",
          background: C.red + "10", borderRadius: 8, textAlign: "center",
        }}>
          Trading halted — circuit breaker tripped for this artist
        </div>
      )}
    </div>
  );
}
