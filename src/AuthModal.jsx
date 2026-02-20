import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import * as api from "./api";

const C = {
  primary: "#4338CA",
  blue: "#5B6AE8",
  accent: "#50E3C2",
  accentDark: "#2CB59E",
  green: "#36D7B7",
  text: "#0F172A",
  textSec: "#64748B",
  textMuted: "#94A3B8",
  bg: "#0D1117",
};

export default function AuthModal({ isOpen, onClose, onAuth, initialMode = "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [visible, setVisible] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [textAnim, setTextAnim] = useState(0);
  const gradientRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(false);
      setSuccess(false);
      setErrors({});
      setShowPw(false);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setTextAnim(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      // Stagger text animations
      const t1 = setTimeout(() => setTextAnim(1), 400);
      const t2 = setTimeout(() => setTextAnim(2), 800);
      const t3 = setTimeout(() => setTextAnim(3), 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  if (!isOpen) return null;

  const handleClose = () => { setVisible(false); setTimeout(onClose, 350); };

  const validate = () => {
    const errs = {};
    if (mode === "signup" && !formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = "Enter a valid email";
    if (!formData.password) errs.password = "Password is required";
    else if (formData.password.length < 6) errs.password = "Min 6 characters";
    if (mode === "signup" && formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Passwords don't match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      let userData;
      if (mode === "signup") {
        userData = await api.register(formData.email, formData.password, formData.name);
      } else {
        userData = await api.login(formData.email, formData.password);
      }
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onAuth({
          name: userData.displayName || formData.name || formData.email.split("@")[0],
          email: userData.email || formData.email,
          initials: (userData.displayName || formData.name || formData.email).slice(0, 2).toUpperCase(),
        });
      }, 1200);
    } catch (err) {
      setLoading(false);
      setErrors({ form: err.message || "Authentication failed. Please try again." });
    }
  };

  const textAnimStyle = (step) => ({
    opacity: textAnim >= step ? 1 : 0,
    transform: textAnim >= step ? "translateY(0)" : "translateY(20px)",
    transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        data-auth-backdrop
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Modal */}
      <div data-auth-modal style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: visible
          ? "translate(-50%, -50%) scale(1)"
          : "translate(-50%, -45%) scale(0.96)",
        zIndex: 301,
        width: "min(880px, 94vw)",
        maxHeight: "92vh",
        display: "flex",
        borderRadius: 28,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "all 0.45s cubic-bezier(0.22,1,0.36,1)",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 32px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>

        {/* ─── Left Panel: Animated Gradient ─── */}
        <div ref={gradientRef} style={{
          width: "46%",
          minHeight: 540,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "40px 36px",
          flexShrink: 0,
        }}>
          {/* Animated gradient background */}
          <div className="auth-gradient-bg" style={{
            position: "absolute", inset: "-40%",
            background: `
              conic-gradient(from 180deg at 50% 50%,
                ${C.primary} 0deg,
                #7C3AED 50deg,
                ${C.accent} 100deg,
                #A855F7 150deg,
                ${C.blue} 200deg,
                ${C.accent}CC 250deg,
                #7C3AED 300deg,
                ${C.primary} 360deg
              )`,
            zIndex: 0,
            filter: "blur(60px)",
          }} />

          {/* Sharp blob shapes */}
          <div className="auth-blob auth-blob-1" style={{
            position: "absolute", width: 220, height: 220,
            borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
            background: `linear-gradient(135deg, ${C.accent}50 0%, rgba(255,255,255,0.15) 100%)`,
            top: "5%", left: "10%",
            filter: "blur(2px)",
            zIndex: 1,
          }} />
          <div className="auth-blob auth-blob-2" style={{
            position: "absolute", width: 180, height: 180,
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            background: `linear-gradient(180deg, ${C.accent}70 0%, transparent 100%)`,
            bottom: "20%", right: "-5%",
            filter: "blur(4px)",
            zIndex: 1,
          }} />
          <div className="auth-blob auth-blob-3" style={{
            position: "absolute", width: 160, height: 160,
            borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
            background: `linear-gradient(225deg, ${C.accent}45 0%, #A855F740 50%, transparent 80%)`,
            top: "40%", left: "-8%",
            filter: "blur(3px)",
            zIndex: 1,
          }} />
          <div className="auth-blob auth-blob-4" style={{
            position: "absolute", width: 120, height: 120,
            borderRadius: "50% 50% 30% 70% / 50% 70% 30% 50%",
            background: `radial-gradient(circle, ${C.accent}35 0%, transparent 70%)`,
            top: "15%", right: "10%",
            zIndex: 1,
          }} />

          {/* Decorative asterisk */}
          <div style={{
            position: "absolute", top: 36, left: 36, zIndex: 2,
            fontSize: 36, fontWeight: 300, color: "rgba(255,255,255,0.9)",
            lineHeight: 1,
            ...textAnimStyle(1),
          }}>✦</div>

          {/* Text content */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 14,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              ...textAnimStyle(1),
            }}>
              You can easily
            </div>
            <h2 style={{
              fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 900, color: "#fff",
              lineHeight: 1.05, letterSpacing: "-0.04em",
              textTransform: "uppercase",
              margin: 0,
              ...textAnimStyle(2),
            }}>
              Invest in<br />
              the artists<br />
              you put your<br />
              faith in
            </h2>
            <p style={{
              fontSize: 11, color: "rgba(255,255,255,0.5)",
              marginTop: 16, lineHeight: 1.6,
              letterSpacing: "0.08em",
              fontFamily: "monospace",
              textTransform: "uppercase",
              ...textAnimStyle(3),
            }}>
              Trade · Earn · Grow
            </p>
          </div>
        </div>

        {/* ─── Right Panel: Form ─── */}
        <div style={{
          flex: 1,
          background: "#fff",
          padding: "40px 40px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflowY: "auto",
          position: "relative",
          color: C.text,
        }}>
          {/* Close button */}
          <button onClick={handleClose} style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: C.textMuted, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>✕</button>

          {/* Label */}
          <div style={{
            fontSize: 11, fontFamily: "monospace", fontWeight: 600,
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: C.primary, marginBottom: 16,
          }}>
            {mode === "signup" ? "[ CREATE ACCOUNT ]" : "[ SIGN IN ]"}
          </div>

          <h2 style={{
            fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-0.04em",
            marginBottom: 8, color: C.text, textTransform: "uppercase",
            lineHeight: 1.05,
          }}>
            {mode === "signup" ? "Join\nCrescendo" : "Welcome\nBack"}
          </h2>
          <p style={{
            fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 28,
            fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {mode === "signup"
              ? "Portfolio · Royalties · Trading"
              : "Continue managing your investments"}
          </p>

          {/* Success State */}
          {success ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: `linear-gradient(135deg, ${C.accent}25, ${C.green}18)`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, marginBottom: 16,
                border: `1px solid ${C.accent}30`, color: C.green,
              }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: C.text }}>
                {mode === "signup" ? "Account Created!" : "Signed In!"}
              </div>
              <div style={{ fontSize: 13, color: C.textMuted }}>
                Redirecting to your dashboard...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* API error */}
              {errors.form && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#EF4444", fontSize: 12, fontWeight: 600
                }}>{errors.form}</div>
              )}
              {/* Name field (signup only) */}
              {mode === "signup" && (
              <FieldGroup label="FULL NAME" error={errors.name} mono>
                  <input
                    type="text" placeholder="Your name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle(errors.name)}
                  />
                </FieldGroup>
              )}

              <FieldGroup label="YOUR EMAIL" error={errors.email} mono>
                <input
                  type="email" placeholder="you@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle(errors.email)}
                />
              </FieldGroup>

              <FieldGroup label="PASSWORD" error={errors.password} mono>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"} placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={inputStyle(errors.password)}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: C.textMuted, padding: 4, display: "flex",
                  }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FieldGroup>

              {mode === "signup" && (
                <FieldGroup label="CONFIRM PASSWORD" error={errors.confirmPassword} mono>
                  <input
                    type="password" placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    style={inputStyle(errors.confirmPassword)}
                  />
                </FieldGroup>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="auth-submit-btn" style={{
                width: "100%", padding: "14px 0",
                borderRadius: 0, border: "none",
                fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: C.primary, color: "#fff",
                boxShadow: `0 4px 16px ${C.primary}30`,
                transition: "all 0.25s",
                marginTop: 4,
              }}>
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }} />
                    PROCESSING...
                  </span>
                ) : mode === "signup" ? "GET STARTED" : "SIGN IN"}
              </button>

              {/* Divider */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14, margin: "20px 0",
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
                <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Or continue with</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
              </div>

              {/* Social */}
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Google", icon: "G" },
                  { label: "Apple", icon: "" },
                ].map(s => (
                  <button key={s.label} type="button" style={{
                    flex: 1, padding: "12px 0",
                    borderRadius: 0, border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(0,0,0,0.02)",
                    color: C.text, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.02)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
                  >
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Switch mode */}
              <div style={{ textAlign: "center", fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button type="button"
                  onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErrors({}); }}
                  style={{
                    background: "none", border: "none",
                    color: C.primary, fontWeight: 700,
                    cursor: "pointer", fontSize: 11,
                    fontFamily: "monospace",
                    letterSpacing: "0.04em",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {mode === "signup" ? "Sign in" : "Sign up"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        @keyframes gradientSpin {
          0% { transform: rotate(0deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1.1); }
        }

        @keyframes blobMorph1 {
          0%, 100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; transform: translate(0, 0) rotate(0deg); }
          25% { border-radius: 58% 42% 40% 60% / 48% 62% 38% 52%; transform: translate(15px, -20px) rotate(15deg); }
          50% { border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%; transform: translate(-10px, 10px) rotate(-10deg); }
          75% { border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%; transform: translate(20px, 5px) rotate(8deg); }
        }

        @keyframes blobMorph2 {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { border-radius: 40% 60% 50% 50% / 40% 60% 40% 60%; transform: translate(-20px, 15px) rotate(-20deg) scale(1.1); }
          66% { border-radius: 50% 50% 40% 60% / 50% 40% 60% 50%; transform: translate(15px, -10px) rotate(12deg) scale(0.9); }
        }

        @keyframes blobMorph3 {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0, 0) scale(1); }
          50% { border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%; transform: translate(25px, -15px) scale(1.2); }
        }

        @keyframes blobMorph4 {
          0%, 100% { border-radius: 50% 50% 30% 70% / 50% 70% 30% 50%; transform: translate(0, 0) rotate(0deg); }
          50% { border-radius: 30% 70% 50% 50% / 70% 30% 50% 50%; transform: translate(-15px, 20px) rotate(25deg); }
        }

        .auth-gradient-bg {
          animation: gradientSpin 20s linear infinite;
        }

        .auth-blob-1 { animation: blobMorph1 8s ease-in-out infinite; }
        .auth-blob-2 { animation: blobMorph2 10s ease-in-out infinite; }
        .auth-blob-3 { animation: blobMorph3 7s ease-in-out infinite; }
        .auth-blob-4 { animation: blobMorph4 9s ease-in-out infinite; }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px ${C.primary}40 !important;
        }

        [data-auth-modal] input:focus {
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 3px ${C.primary}12;
          outline: none;
        }

        [data-auth-modal] input::placeholder { color: #94A3B8; }
        [data-auth-modal], [data-auth-modal] * { cursor: auto !important; }
        [data-auth-modal] button, [data-auth-modal] a { cursor: pointer !important; }
        [data-auth-modal] input { cursor: text !important; }
        [data-auth-backdrop] { cursor: auto !important; }

        @media (max-width: 680px) {
          [data-auth-modal] > div:first-child {
            display: none !important;
          }
          [data-auth-modal] {
            width: min(420px, 94vw) !important;
          }
        }
      `}</style>
    </>
  );
}

function FieldGroup({ label, error, children, mono }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        fontSize: 10, fontWeight: 600, color: "#94A3B8",
        display: "block", marginBottom: 6,
        fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${hasError ? "#EF4444" : "rgba(0,0,0,0.1)"}`,
    background: "#fff",
    color: "#0F172A",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
  };
}
