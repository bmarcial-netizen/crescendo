import { useState, useEffect } from "react";
import * as api from "./api";
import { useAuth } from "./AuthContext";

const C = {
  primary: "#1E40AF",
  primarySoft: "rgba(30,64,175,0.08)",
  accent: "#38BDF8",
  green: "#36D7B7",
  red: "#EF4444",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
};

export default function WalletPanel({ balance: balanceProp, onBalanceUpdate, onClose }) {
  // Use auth context as fallback when props aren't provided
  const auth = useAuth();
  const balance = balanceProp != null ? balanceProp : (auth.balance != null ? parseFloat(auth.balance) : null);
  const [tab, setTab] = useState("deposit"); // deposit | withdraw
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let result;
      if (tab === "deposit") {
        result = await api.deposit(num);
      } else {
        result = await api.withdraw(num);
      }
      const newBal = parseFloat(result.balance);
      setSuccess(`${tab === "deposit" ? "Deposited" : "Withdrew"} $${num.toFixed(2)}. New balance: $${newBal.toFixed(2)}`);
      setAmount("");
      // Update balance everywhere — call both the prop callback and auth context
      if (onBalanceUpdate) onBalanceUpdate(newBal);
      // Refresh balance from server to ensure UI is in sync
      if (auth.refreshBalance) {
        await auth.refreshBalance();
      }
    } catch (err) {
      console.error("[WalletPanel] Transaction failed:", err);
      setError(err.message || "Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [25, 50, 100, 250, 500];

  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 20, padding: 24,
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>Wallet</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", marginTop: 4 }}>
            ${balance !== null ? balance.toFixed(2) : "—"}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.04)", border: "none", borderRadius: 8,
            width: 28, height: 28, cursor: "pointer", fontSize: 14, color: C.textMuted,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        )}
      </div>

      {/* Deposit / Withdraw tabs */}
      <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 2, marginBottom: 16 }}>
        {["deposit", "withdraw"].map(t => (
          <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: tab === t ? "#fff" : "transparent",
            color: tab === t ? C.text : C.textMuted,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            textTransform: "capitalize", fontFamily: "'Inter', sans-serif",
          }}>{t}</button>
        ))}
      </div>

      {/* Amount input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "10px 14px",
        border: "1px solid rgba(0,0,0,0.06)", marginBottom: 10,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>$</span>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif",
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>USD</span>
      </div>

      {/* Quick amounts */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {quickAmounts.map(q => (
          <button key={q} onClick={() => setAmount(q.toString())} style={{
            flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)",
            background: amount === q.toString() ? C.primary + "10" : "rgba(0,0,0,0.02)",
            color: amount === q.toString() ? C.primary : C.textSec,
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
          }}>${q}</button>
        ))}
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
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
          background: tab === "deposit"
            ? `linear-gradient(135deg, ${C.primary}, #5B6AE8)`
            : `linear-gradient(135deg, ${C.red}, #F87171)`,
          color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
          fontFamily: "'Inter', sans-serif",
          boxShadow: `0 4px 16px ${tab === "deposit" ? C.primary : C.red}30`,
        }}
      >
        {loading ? "Processing..." : tab === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
      </button>
    </div>
  );
}
