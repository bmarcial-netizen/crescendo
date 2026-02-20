import { useState, useEffect } from "react";
import * as api from "./api";

// ─── Auth Modal ─── Sign Up / Login ───

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
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(false);
            setSuccess(false);
            setErrors({});
            setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    if (!isOpen) return null;

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 350);
    };

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
            let data;
            if (mode === "signup") {
                data = await api.register(formData.email, formData.password, formData.name);
            } else {
                data = await api.login(formData.email, formData.password);
            }
            setLoading(false);
            setSuccess(true);
            setTimeout(() => {
                const user = data.user || {};
                onAuth({
                    ...user,
                    name: user.displayName || formData.name || formData.email.split("@")[0],
                    email: user.email || formData.email,
                    initials: (user.displayName || formData.name || formData.email).slice(0, 2).toUpperCase(),
                });
            }, 1200);
        } catch (err) {
            setLoading(false);
            setErrors({ form: err.message || "Authentication failed" });
        }
    };

    const inputStyle = (field) => ({
        width: "100%",
        padding: "13px 16px",
        borderRadius: 12,
        border: `1.5px solid ${errors[field] ? "#EF4444" : "rgba(255,255,255,0.12)"}`,
        background: "rgba(255,255,255,0.06)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        outline: "none",
        transition: "all 0.2s",
        boxSizing: "border-box",
    });

    return (
        <>
            {/* Backdrop */}
            <div
                data-auth-backdrop
                onClick={handleClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 300,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
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
                    : "translate(-50%, -45%) scale(0.95)",
                zIndex: 301,
                width: "min(460px, 92vw)",
                background: "linear-gradient(145deg, #111827 0%, #0D1117 100%)",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
                opacity: visible ? 1 : 0,
                transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                overflow: "hidden",
                fontFamily: "'Inter', sans-serif",
                color: "#fff",
            }}>
                {/* font loaded from index.html */}

                {/* Decorative gradient blobs */}
                <div style={{
                    position: "absolute", top: -60, right: -60, width: 200, height: 200,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${C.primary}30 0%, transparent 70%)`,
                    filter: "blur(30px)", pointerEvents: "none",
                }} />
                <div style={{
                    position: "absolute", bottom: -40, left: -40, width: 160, height: 160,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${C.accent}20 0%, transparent 70%)`,
                    filter: "blur(25px)", pointerEvents: "none",
                }} />

                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: "absolute", top: 16, right: 16, zIndex: 10,
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 16, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                    }}
                >✕</button>

                <div style={{ padding: "36px 36px 32px", position: "relative" }}>

                    {/* Logo + Title */}
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                        <h2 style={{
                            fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em",
                            marginBottom: 6,
                            background: `linear-gradient(135deg, #fff 30%, ${C.accent}90)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}>
                            {mode === "signup" ? "Join Crescendo" : "Welcome Back"}
                        </h2>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                            {mode === "signup"
                                ? "Start investing in the artists you believe in"
                                : "Sign in to your account"}
                        </p>
                    </div>

                    {/* Success State */}
                    {success ? (
                        <div style={{
                            textAlign: "center", padding: "24px 0",
                        }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 20,
                                background: `linear-gradient(135deg, ${C.accent}30, ${C.green}20)`,
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                fontSize: 32, marginBottom: 16,
                                border: `1px solid ${C.accent}30`,
                            }}>✓</div>
                            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                                {mode === "signup" ? "Account Created!" : "Signed In!"}
                            </div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                                Redirecting to your dashboard...
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Name field (signup only) */}
                            {mode === "signup" && (
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        style={inputStyle("name")}
                                        onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                                        onBlur={e => { e.target.style.borderColor = errors.name ? "#EF4444" : "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    {errors.name && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.name}</div>}
                                </div>
                            )}

                            {/* Email */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    style={inputStyle("email")}
                                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                                    onBlur={e => { e.target.style.borderColor = errors.email ? "#EF4444" : "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                />
                                {errors.email && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.email}</div>}
                            </div>

                            {/* Password */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                                    Password
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    style={inputStyle("password")}
                                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                                    onBlur={e => { e.target.style.borderColor = errors.password ? "#EF4444" : "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                />
                                {errors.password && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.password}</div>}
                            </div>

                            {/* Confirm Password (signup only) */}
                            {mode === "signup" && (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        style={inputStyle("confirmPassword")}
                                        onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.background = "rgba(255,255,255,0.08)"; }}
                                        onBlur={e => { e.target.style.borderColor = errors.confirmPassword ? "#EF4444" : "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                                    />
                                    {errors.confirmPassword && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.confirmPassword}</div>}
                                </div>
                            )}

                            {/* API Error */}
                            {errors.form && (
                                <div style={{
                                    padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                    fontSize: 13, color: "#EF4444", textAlign: "center",
                                }}>{errors.form}</div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%", padding: "14px 0",
                                    borderRadius: 14, border: "none",
                                    fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                    background: `linear-gradient(135deg, ${C.primary}, ${C.blue})`,
                                    color: "#fff",
                                    boxShadow: `0 4px 20px ${C.primary}40`,
                                    transition: "all 0.3s",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                        <span style={{
                                            width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                                            borderTopColor: "#fff", borderRadius: "50%",
                                            animation: "spin 0.6s linear infinite",
                                        }} />
                                        Processing...
                                    </span>
                                ) : mode === "signup" ? "Create Account" : "Sign In"}
                            </button>

                            {/* Divider */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 14,
                                margin: "20px 0",
                            }}>
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>or</span>
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                            </div>

                            {/* Social Buttons */}
                            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                                {[
                                    { label: "Google", icon: "G" },
                                    { label: "Apple", icon: "" },
                                ].map(s => (
                                    <button key={s.label} type="button" style={{
                                        flex: 1, padding: "12px 0",
                                        borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                                        background: "rgba(255,255,255,0.04)",
                                        color: "rgba(255,255,255,0.7)",
                                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                                        fontFamily: "'Inter', sans-serif",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                        transition: "all 0.2s",
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                                    >
                                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Switch mode */}
                            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                                <button
                                    type="button"
                                    onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErrors({}); }}
                                    style={{
                                        background: "none", border: "none",
                                        color: C.accent, fontWeight: 700,
                                        cursor: "pointer", fontSize: 13,
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                >
                                    {mode === "signup" ? "Sign In" : "Sign Up"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          input::placeholder { color: rgba(255,255,255,0.25); }
          [data-auth-modal], [data-auth-modal] * { cursor: auto !important; }
          [data-auth-modal] button, [data-auth-modal] a { cursor: pointer !important; }
          [data-auth-modal] input { cursor: text !important; }
          [data-auth-backdrop] { cursor: auto !important; }
        `}</style>
            </div>
        </>
    );
}
