// ─── Shared Color Constants ─── unified palette for all Crescendo components ───

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
};

export default C;

// Genre map for hardcoded genre assignments by symbol
export const GENRE_MAP = {
  ESDK: "Experimental Hip-Hop",
  BBDB: "Indie Pop",
  JRJR: "Hyperpop / Shoegaze",
  MCTD: "R&B / Soul",
  HLLS: "Experimental Hip-Hop",
  DCHI: "Hip-Hop / Rap",
  LNTH: "R&B / Soul",
  IANN: "Pop-Punk / Hip-Hop",
  MNIT: "Dream Pop / Indie",
  TZTO: "Experimental Hip-Hop",
  SNST: "Electronic / Industrial",
  YVTM: "Art Rock / Experimental",
  JPEG: "Experimental Hip-Hop",
  KGKR: "Art Rock / Jazz Punk",
  PRTX: "Hip-Hop / Rap",
  FENG: "Indie / Neo-Soul",
  DVBL: "R&B / Vocal",
  TWLP: "Indie Rock",
};

// Format large numbers for display
export function formatNumber(n) {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// Format percentage change
export function formatPctChange(current, previous) {
  if (!previous || !current) return null;
  const change = ((current - previous) / previous) * 100;
  return {
    value: change,
    label: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
    isUp: change >= 0,
  };
}
