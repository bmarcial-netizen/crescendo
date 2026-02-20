import { createContext, useContext, useState, useEffect } from "react";

// ── Theme definitions ────────────────────────────────────────────────────

const lightTheme = {
  name: "light",
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
  blob3: "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)",
  gridLine: "rgba(0,0,0,0.04)",
  tooltipBg: "rgba(17,24,39,0.92)",
  tooltipText: "#fff",
  tooltipMuted: "rgba(255,255,255,0.5)",
  inputBg: "rgba(0,0,0,0.04)",
};

const darkTheme = {
  name: "dark",
  bg: "#0B1120",
  card: "rgba(30,41,59,0.72)",
  cardSolid: "#1E293B",
  border: "rgba(51,65,85,0.5)",
  shadow: "0 2px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(51,65,85,0.4)",
  shadowHover: "0 4px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(51,65,85,0.6)",
  primary: "#60A5FA",
  primarySoft: "rgba(96,165,250,0.12)",
  accent: "#38BDF8",
  accentDark: "#0EA5E9",
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.12)",
  red: "#F87171",
  redSoft: "rgba(248,113,113,0.12)",
  text: "#F1F5F9",
  textSec: "#94A3B8",
  textMuted: "#64748B",
  blob1: "radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 70%)",
  blob2: "radial-gradient(circle, rgba(30,64,175,0.15) 0%, transparent 70%)",
  blob3: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
  gridLine: "rgba(255,255,255,0.06)",
  tooltipBg: "rgba(15,23,42,0.95)",
  tooltipText: "#F1F5F9",
  tooltipMuted: "rgba(148,163,184,0.7)",
  inputBg: "rgba(255,255,255,0.06)",
};

// ── Chart preference defaults ────────────────────────────────────────────

const defaultChartPrefs = {
  defaultView: "line",       // "line" | "candlestick" | "scatter"
  showVolume: false,
  showGrid: true,
  candleUpColor: null,       // null = use theme default
  candleDownColor: null,
};

// ── Context ──────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    try {
      return localStorage.getItem("crescendo_theme") || "light";
    } catch {
      return "light";
    }
  });

  const [chartPrefs, setChartPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem("crescendo_chart_prefs");
      return stored ? { ...defaultChartPrefs, ...JSON.parse(stored) } : defaultChartPrefs;
    } catch {
      return defaultChartPrefs;
    }
  });

  const theme = themeName === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    localStorage.setItem("crescendo_theme", themeName);
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
  }, [themeName, theme]);

  useEffect(() => {
    localStorage.setItem("crescendo_chart_prefs", JSON.stringify(chartPrefs));
  }, [chartPrefs]);

  const toggleTheme = () => setThemeName(t => t === "light" ? "dark" : "light");

  const updateChartPrefs = (updates) =>
    setChartPrefs(prev => ({ ...prev, ...updates }));

  return (
    <ThemeContext.Provider value={{
      theme,
      themeName,
      toggleTheme,
      setThemeName,
      chartPrefs,
      updateChartPrefs,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

// ── Settings Panel Component ─────────────────────────────────────────────

export function SettingsPanel({ onClose }) {
  const { theme, themeName, toggleTheme, chartPrefs, updateChartPrefs } = useTheme();

  const sectionStyle = {
    marginBottom: 20,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 8,
    display: "block",
  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: `1px solid ${theme.gridLine}`,
  };

  const btnStyle = (active) => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: `1px solid ${active ? theme.primary : theme.border}`,
    background: active ? theme.primarySoft : "transparent",
    color: active ? theme.primary : theme.textSec,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: 340,
      background: theme.cardSolid,
      borderLeft: `1px solid ${theme.border}`,
      boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
      zIndex: 1000,
      padding: 24,
      overflowY: "auto",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>Settings</h3>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: theme.textMuted, padding: 4,
          }}
        >
          &times;
        </button>
      </div>

      {/* Theme */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Appearance</span>
        <div style={rowStyle}>
          <span style={{ fontSize: 13, color: theme.text }}>Theme</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btnStyle(themeName === "light")} onClick={() => toggleTheme()}>
              Light
            </button>
            <button style={btnStyle(themeName === "dark")} onClick={() => toggleTheme()}>
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Chart Defaults */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Default Chart View</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { key: "line", label: "Line" },
            { key: "candlestick", label: "Candles" },
            { key: "scatter", label: "Dots" },
          ].map(v => (
            <button
              key={v.key}
              style={btnStyle(chartPrefs.defaultView === v.key)}
              onClick={() => updateChartPrefs({ defaultView: v.key })}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Options */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Chart Options</span>
        <div style={rowStyle}>
          <span style={{ fontSize: 13, color: theme.text }}>Show Grid Lines</span>
          <input
            type="checkbox"
            checked={chartPrefs.showGrid}
            onChange={(e) => updateChartPrefs({ showGrid: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: theme.primary }}
          />
        </div>
        <div style={rowStyle}>
          <span style={{ fontSize: 13, color: theme.text }}>Show Volume Bars</span>
          <input
            type="checkbox"
            checked={chartPrefs.showVolume}
            onChange={(e) => updateChartPrefs({ showVolume: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: theme.primary }}
          />
        </div>
      </div>

      {/* Candle Colors */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Custom Candle Colors</span>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: theme.textMuted, display: "block", marginBottom: 4 }}>Up</span>
            <input
              type="color"
              value={chartPrefs.candleUpColor || theme.green}
              onChange={(e) => updateChartPrefs({ candleUpColor: e.target.value })}
              style={{ width: 40, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }}
            />
          </div>
          <div>
            <span style={{ fontSize: 11, color: theme.textMuted, display: "block", marginBottom: 4 }}>Down</span>
            <input
              type="color"
              value={chartPrefs.candleDownColor || theme.red}
              onChange={(e) => updateChartPrefs({ candleDownColor: e.target.value })}
              style={{ width: 40, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }}
            />
          </div>
          <button
            onClick={() => updateChartPrefs({ candleUpColor: null, candleDownColor: null })}
            style={{
              ...btnStyle(false),
              alignSelf: "flex-end",
              fontSize: 11,
              padding: "4px 10px",
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
