import { useState, useEffect, useRef, useCallback } from "react";

// ─── Crescendo Homepage ─── Studio Dialect-inspired dark landing ───
// Performance: all scroll/mouse animations use refs + rAF (zero React re-renders)
// Cursor: full-viewport crosshair lines like Studio Dialect

const COLORS = {
  bg: "#060B18",
  bgLight: "#E2E8F0",
  accent: "#38BDF8",
  accentDark: "#0EA5E9",
  primary: "#1E40AF",
  blue: "#3B82F6",
  text: "#F0F2F5",
  textMuted: "rgba(240,242,245,0.45)",
  textDark: "#0F172A",
  textDarkMuted: "rgba(15,23,42,0.5)"
};

const FEATURES = [
{ title: "Artist Share Trading", num: "01" },
{ title: "Real-Time Market Data", num: "02" },
{ title: "Trending Sound Analytics", num: "03" },
{ title: "Portfolio Management", num: "04" },
{ title: "Social Signal Intelligence", num: "05" }];


const NAV_LINKS = ["Home", "Markets", "Dashboard", "About", "Contact"];

export default function HomePage({ navigate, scrollTo, isLoggedIn, openAuth, user, onLogout }) {
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [darkHeader, setDarkHeader] = useState(false);
  const darkHeaderRef = useRef(false);

  // Refs for scroll-to-section (About / Contact)
  const aboutRef = useRef(null);
  const contactRef = useRef(null);

  useEffect(() => {
    if (scrollTo === 'about' && aboutRef.current) {
      setTimeout(() => aboutRef.current.scrollIntoView({ behavior: 'smooth' }), 300);
    } else if (scrollTo === 'contact' && contactRef.current) {
      setTimeout(() => contactRef.current.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [scrollTo]);

  // ─── Refs for rAF-driven animation (no re-renders) ───
  const mouseTarget = useRef({ x: -100, y: -100 });
  const mouseSmooth = useRef({ x: -100, y: -100 });
  const scrollRef = useRef(0);
  const cursorVisible = useRef(false);
  const winH = useRef(typeof window !== "undefined" ? window.innerHeight : 900);

  // DOM refs for direct manipulation
  const cursorLineH = useRef(null);
  const cursorLineV = useRef(null);
  const cursorCross = useRef(null);
  const cursorCrossH = useRef(null);
  const cursorCrossV = useRef(null);
  const heroRef = useRef(null);
  const bgTextRef = useRef(null);
  const heroTextRef = useRef(null);
  const heroSubRef = useRef(null);
  const cylinderRef = useRef(null);
  const coordRef = useRef(null);
  const headerRef = useRef(null);
  const headerTextRef = useRef(null);
  const headerBtnRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  // ─── Single rAF loop for ALL animations ───
  const animate = useCallback(() => {
    const lerp = 0.12;
    // Smooth cursor
    mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * lerp;
    mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * lerp;
    const mx = mouseSmooth.current.x;
    const my = mouseSmooth.current.y;
    const vis = cursorVisible.current;

    // Scroll-driven hero animations
    const sy = scrollRef.current;
    const h = winH.current;
    const progress = Math.min(Math.max(sy / h, 0), 1);
    const pastHero = sy > h * 0.85;

    // Toggle header colors when crossing into/out of light section
    if (pastHero !== darkHeaderRef.current) {
      darkHeaderRef.current = pastHero;
      setDarkHeader(pastHero);
    }

    // Crosshair color: light on dark, dark on light
    const lnColor = pastHero ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.08)";
    const crColor = pastHero ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.35)";

    // Update crosshair lines
    if (cursorLineH.current) {
      cursorLineH.current.style.top = `${my}px`;
      cursorLineH.current.style.opacity = vis ? "1" : "0";
      cursorLineH.current.style.background = lnColor;
    }
    if (cursorLineV.current) {
      cursorLineV.current.style.left = `${mx}px`;
      cursorLineV.current.style.opacity = vis ? "1" : "0";
      cursorLineV.current.style.background = lnColor;
    }
    if (cursorCross.current) {
      cursorCross.current.style.transform = `translate(${mx}px, ${my}px)`;
      cursorCross.current.style.opacity = vis ? "1" : "0";
    }
    if (cursorCrossH.current) cursorCrossH.current.style.background = crColor;
    if (cursorCrossV.current) cursorCrossV.current.style.background = crColor;

    const fade = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
    const scale = 1 + progress * 1.2;
    const textY = sy * -0.25;
    const bgY = sy * -0.1;

    if (heroRef.current) heroRef.current.style.opacity = fade;
    if (bgTextRef.current) bgTextRef.current.style.transform = `translate(-50%, calc(-50% + ${bgY}px))`;
    if (heroTextRef.current) heroTextRef.current.style.transform = `translateY(${textY}px)`;
    if (heroSubRef.current) heroSubRef.current.style.transform = `translateY(${textY * 0.6}px)`;
    if (cylinderRef.current) cylinderRef.current.style.transform = `scale(${scale})`;

    // Coordinate display
    if (coordRef.current) {
      coordRef.current.textContent = `X : ${Math.round(mouseTarget.current.x)}  Y : ${Math.round(mouseTarget.current.y)}`;
    }

    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [animate]);

  // ─── Event listeners (only update refs, never setState) ───
  useEffect(() => {
    const onScroll = () => {scrollRef.current = window.scrollY;};
    const onMouse = (e) => {
      mouseTarget.current = { x: e.clientX, y: e.clientY };
      cursorVisible.current = true;
    };
    const onLeave = () => {cursorVisible.current = false;};
    const onEnter = () => {cursorVisible.current = true;};
    const onResize = () => {winH.current = window.innerHeight;};

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Initial colors (will be updated by rAF loop)
  const lineColorInit = "rgba(255,255,255,0.08)";
  const crossColorInit = "rgba(255,255,255,0.35)";

  return (
    <div style={{
      letterSpacing: "-0.02em",
      lineHeight: 1.35,
      fontFamily: "'Inter', sans-serif",
      background: COLORS.bg,
      color: COLORS.text,
      position: "relative",
      cursor: "none"
    }}>
            {/* font loaded from index.html */}
            <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; cursor: none !important; }
        ::selection { background: ${COLORS.accent}40; color: #fff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.accent}30; border-radius: 2px; }
        @keyframes spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
      `}</style>

            {/* ─── FULL-VIEWPORT CROSSHAIR CURSOR ─── */}
            {/* Horizontal line — spans full width */}
            <div ref={cursorLineH} style={{
        position: "fixed", left: 0, width: "100vw", height: 1,
        background: lineColorInit,
        pointerEvents: "none", zIndex: 9998,
        opacity: 0, willChange: "top"
      }} />
            {/* Vertical line — spans full height */}
            <div ref={cursorLineV} style={{
        position: "fixed", top: 0, height: "100vh", width: 1,
        background: lineColorInit,
        pointerEvents: "none", zIndex: 9998,
        opacity: 0, willChange: "left"
      }} />
            {/* Small cross at intersection */}
            <div ref={cursorCross} style={{
        position: "fixed", top: 0, left: 0,
        pointerEvents: "none", zIndex: 9999,
        opacity: 0, willChange: "transform"
      }}>
                {/* Horizontal bar of cross */}
                <div ref={cursorCrossH} style={{
          position: "absolute", top: -0.5, left: -10,
          width: 20, height: 1, background: crossColorInit
        }} />
                {/* Vertical bar of cross */}
                <div ref={cursorCrossV} style={{
          position: "absolute", top: -10, left: -0.5,
          width: 1, height: 20, background: crossColorInit
        }} />
            </div>

            {/* Blue vignette border glow — static, no animation */}
            <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
        boxShadow: `inset 0 0 80px ${COLORS.primary}15, inset 0 0 160px ${COLORS.primary}08`
      }} />

            {/* ─── FIXED HEADER ─── */}
            <header ref={headerRef} style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.8s 0.2s, color 0.4s"
      }}>
                <div
          onClick={() => {navigate('home');window.scrollTo({ top: 0, behavior: 'smooth' });}}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>

                    <span ref={headerTextRef} style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "0.12em",
            textTransform: "uppercase", color: darkHeader ? "#0F172A" : COLORS.text,
            transition: "color 0.4s"
          }}>CRESCENDO</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
                    {isLoggedIn ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                                onClick={() => navigate('dashboard')}
                                style={{
                                    padding: "8px 20px",
                                    background: "transparent",
                                    color: darkHeader ? "#0F172A" : COLORS.text,
                                    border: `1px solid ${darkHeader ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.15)"}`,
                                    borderRadius: 0, cursor: "pointer",
                                    fontFamily: "monospace", fontSize: 13, fontWeight: 600,
                                    letterSpacing: "0.1em",
                                    transition: "all 0.4s",
                                }}
                                onMouseEnter={(e) => { e.target.style.background = COLORS.accent; e.target.style.color = COLORS.bg; e.target.style.borderColor = COLORS.accent; }}
                                onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = darkHeader ? "#0F172A" : COLORS.text; e.target.style.borderColor = darkHeader ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.15)"; }}
                            >
                                DASHBOARD
                            </button>
                            <div
                                onClick={() => navigate('profile')}
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: `linear-gradient(135deg, ${COLORS.accent}90, ${COLORS.primary}50)`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 700, color: "#fff",
                                    cursor: "pointer", transition: "all 0.3s",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                }}
                            >{user?.initials || '?'}</div>
                            <button
                                onClick={onLogout}
                                style={{
                                    padding: "8px 14px",
                                    background: "transparent",
                                    color: darkHeader ? "rgba(15,23,42,0.5)" : COLORS.textMuted,
                                    border: `1px solid ${darkHeader ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)"}`,
                                    borderRadius: 0, cursor: "pointer",
                                    fontFamily: "monospace", fontSize: 11, fontWeight: 600,
                                    letterSpacing: "0.1em",
                                    transition: "all 0.4s",
                                }}
                                onMouseEnter={(e) => { e.target.style.color = "#EF4444"; e.target.style.borderColor = "rgba(239,68,68,0.3)"; }}
                                onMouseLeave={(e) => { e.target.style.color = darkHeader ? "rgba(15,23,42,0.5)" : COLORS.textMuted; e.target.style.borderColor = darkHeader ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)"; }}
                            >
                                SIGN OUT
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={() => openAuth('login')}
                                style={{
                                    padding: "8px 18px",
                                    background: "transparent",
                                    color: darkHeader ? "#0F172A" : COLORS.text,
                                    border: `1px solid ${darkHeader ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.15)"}`,
                                    borderRadius: 0, cursor: "pointer",
                                    fontFamily: "monospace", fontSize: 12, fontWeight: 600,
                                    letterSpacing: "0.1em",
                                    transition: "all 0.4s",
                                }}
                                onMouseEnter={(e) => { e.target.style.background = darkHeader ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)"; e.target.style.borderColor = darkHeader ? "rgba(15,23,42,0.4)" : "rgba(255,255,255,0.3)"; }}
                                onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = darkHeader ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.15)"; }}
                            >
                                LOG IN
                            </button>
                            <button
                                onClick={() => openAuth('signup')}
                                style={{
                                    padding: "8px 20px",
                                    background: COLORS.accent,
                                    color: COLORS.bg,
                                    border: `1px solid ${COLORS.accent}`,
                                    borderRadius: 0, cursor: "pointer",
                                    fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    transition: "all 0.4s",
                                }}
                                onMouseEnter={(e) => { e.target.style.background = "#60A5FA"; e.target.style.borderColor = "#60A5FA"; }}
                                onMouseLeave={(e) => { e.target.style.background = COLORS.accent; e.target.style.borderColor = COLORS.accent; }}
                            >
                                SIGN UP
                            </button>
                        </div>
                    )}
                    <span ref={coordRef} style={{
            fontFamily: "monospace", fontSize: 12,
            color: darkHeader ? "rgba(15,23,42,0.4)" : COLORS.textMuted,
            letterSpacing: "0.15em",
            minWidth: 180,
            transition: "color 0.4s"
          }}>
                        X : 0  Y : 0
                    </span>

                    <button
            ref={headerBtnRef}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: "8px 20px",
              background: menuOpen ? COLORS.accent : "transparent",
              color: menuOpen ? COLORS.bg : (darkHeader ? "#0F172A" : COLORS.text),
              border: `1px solid ${menuOpen ? COLORS.accent : (darkHeader ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.15)")}`,
              borderRadius: 0, cursor: "pointer",
              fontFamily: "monospace", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.1em",
              transition: "all 0.4s"
            }}>

                        [ {menuOpen ? "CLOSE" : "MENU"} ]
                    </button>
                </div>
            </header>

            {/* ─── FULL-SCREEN MENU OVERLAY ─── */}
            <div style={{
        position: "fixed", inset: 0, zIndex: 90,
        background: COLORS.bg,
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? "auto" : "none",
        transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-end",
        padding: "80px 60px"
      }}>
                {NAV_LINKS.map((link, i) => {
                    const label = (link === "Dashboard" && !isLoggedIn) ? "Sign In" : link;
                    const handleClick = () => {
                        setMenuOpen(false);
                        if (link === "Dashboard" && !isLoggedIn) {
                            openAuth('login');
                        } else {
                            navigate(link.toLowerCase());
                        }
                    };
                    return (
                        <button
                            key={link}
                            onClick={handleClick}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "clamp(48px, 8vw, 100px)",
                                fontWeight: 900,
                                color: COLORS.text,
                                textTransform: "uppercase",
                                letterSpacing: "-0.03em",
                                lineHeight: 1.1,
                                textAlign: "right",
                                opacity: menuOpen ? 1 : 0,
                                transform: menuOpen ? "translateX(0)" : "translateX(80px)",
                                transition: `all 0.6s ${0.1 + i * 0.08}s cubic-bezier(0.22,1,0.36,1)`,
                            }}
                            onMouseEnter={(e) => e.target.style.color = COLORS.accent}
                            onMouseLeave={(e) => e.target.style.color = COLORS.text}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ════════════════════════════════════════
           HERO SECTION — position: fixed
          ════════════════════════════════════════ */}
            <div ref={heroRef} style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: "100vh",
        paddingTop: 140,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        overflow: "hidden",
        padding: "0 40px",
        zIndex: 1
      }}>
                {/* Giant background text — parallax */}
                <div ref={bgTextRef} style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          whiteSpace: "nowrap",
          zIndex: 1,
          opacity: loaded ? 1 : 0,
          transition: "opacity 1.5s 0.3s"
        }}>
                    <div style={{
            fontSize: "clamp(80px, 14vw, 200px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.07)",
            textAlign: "center",
            userSelect: "none"
          }}>
                        <div>INVEST IN</div>
                        <div>MUSIC</div>
                    </div>
                </div>

                {/* Main hero text — parallax */}
                <div ref={heroTextRef} style={{
          position: "relative", zIndex: 3,
          marginTop: 60,
          textAlign: "center",
          opacity: loaded ? 1 : 0,
          transition: loaded ? "none" : "all 1s 0.5s cubic-bezier(0.22,1,0.36,1)"
        }}>
                    <h1 style={{
            fontSize: "clamp(60px, 12vw, 180px)",
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            textTransform: "uppercase",
            marginBottom: 30,
            background: `linear-gradient(180deg, #fff 40%, ${COLORS.accent}90)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
                        THE FUTURE<br />OF MUSIC
                    </h1>
                </div>

                {/* Subtitle + descriptor — parallax */}
                <div ref={heroSubRef} style={{
          position: "relative", zIndex: 3,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", maxWidth: 900,
          marginTop: 10,
          opacity: loaded ? 1 : 0,
          transition: loaded ? "none" : "all 1s 0.8s cubic-bezier(0.22,1,0.36,1)"
        }}>
                    <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "0.12em",
            color: COLORS.accent
          }}>CRESCENDO</span>
                    <p style={{
            maxWidth: 380, textAlign: "center",
            fontSize: 14, lineHeight: 1.35,
            color: "rgba(255,255,255,0.55)"
          }}>
                        The first platform where you invest in artists like stocks.
                        Trade shares, track trends, and ride the wave before anyone else.
                        {!isLoggedIn && <><br /><span style={{ color: COLORS.accent, fontWeight: 700 }}>Join free and start investing today.</span></>}
                    </p>
                    <span style={{
            fontFamily: "monospace", fontSize: 11,
            color: COLORS.textMuted, letterSpacing: "0.1em"
          }}>[ EST. 2026 ]</span>
                </div>

                {/* 3D Rotating cylinder — SCALES on scroll */}
                <div ref={cylinderRef} style={{
          position: "relative", zIndex: 2,
          marginTop: 50,
          perspective: 1200,
          height: 280,
          width: "100%", maxWidth: 700,
          opacity: loaded ? 1 : 0,
          transition: loaded ? "none" : "opacity 1.2s 1s"
        }}>
                    <div style={{
            position: "absolute", top: -10, left: -10,
            fontSize: 20, color: "rgba(255,255,255,0.15)",
            fontFamily: "monospace", userSelect: "none"
          }}>+</div>
                    <div style={{
            position: "absolute", top: -10, right: -10,
            fontSize: 20, color: "rgba(255,255,255,0.15)",
            fontFamily: "monospace", userSelect: "none"
          }}>+</div>

                    <div style={{
            width: "100%", height: "100%",
            transformStyle: "preserve-3d",
            animation: "spin 30s linear infinite"
          }}>
                        {Array.from({ length: 12 }).map((_, i) => {
              const angle = 360 / 12 * i;
              const artistNames = ["2hollis", "Snow Strippers", "Esdeekid", "Doechii", "Ian", "Feng", "King Krule", "The Tulips", "Malcom Todd", "JPEGMAFIA", "Men I Trust", "Matt Maltese"];
              const tickers = ["HLLS", "SNWS", "ESDK", "DCHI", "IANN", "FENG", "KRKL", "TULP", "MTOD", "JPEG", "MNIT", "MMLT"];
              const prices = ["$2.47", "$5.12", "$3.88", "$0.74", "$1.03", "$1.95", "$2.47", "$5.12", "$3.88", "$0.74", "$1.03", "$1.95"];
              const changes = ["+18.3%", "+7.2%", "+31.5%", "+4.8%", "-2.1%", "-5.4%", "+18.3%", "+7.2%", "+31.5%", "+4.8%", "-2.1%", "-5.4%"];
              const isUp = !changes[i].startsWith("-");
              return (
                <div key={i} style={{
                  position: "absolute",
                  width: 160, height: 100,
                  left: "50%", top: "50%",
                  marginLeft: -80, marginTop: -50,
                  transform: `rotateY(${angle}deg) translateZ(300px)`,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 16px",
                  display: "flex", flexDirection: "column",
                  justifyContent: "space-between",
                  backfaceVisibility: "hidden"
                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: isUp ? "#38BDF8" : "#EF4444", fontFamily: "monospace", letterSpacing: "0.05em" }}>{tickers[i]}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{artistNames[i]}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{prices[i]}</span>
                                        <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: isUp ? COLORS.accent : "#EF4444"
                    }}>{changes[i]}</span>
                                    </div>
                                </div>);

            })}
                    </div>
                </div>
            </div>

            {/* HERO SPACER */}
            <div style={{ height: "100vh", position: "relative", zIndex: 0 }} />

            {/* ════════════════════════════════════════
           LIGHT CONTENT — wipes over fixed hero
          ════════════════════════════════════════ */}
            <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{
          position: "relative",
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.3)"
        }}>

                    {/* ─── ABOUT ─── */}
                    <section ref={aboutRef} style={{
            position: "relative",
            padding: "120px 60px 100px",
            background: COLORS.bgLight,
            color: COLORS.textDark
          }}>
                        <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 120,
              background: "linear-gradient(180deg, rgba(0,0,0,0.04), transparent)",
              pointerEvents: "none", borderRadius: "24px 24px 0 0"
            }} />

                        <div style={{ maxWidth: 1000, position: "relative" }}>
                            <p style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 700, lineHeight: 1.2,
                letterSpacing: "-0.02em", marginBottom: 30
              }}>
                                We believe music is more than entertainment — it's culture, community, and
                                an untapped asset class. Crescendo helps you make sense of emerging artists
                                and turn them into clear, purposeful investments that grow with you.
                            </p>
                            <p style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 700, lineHeight: 1.2,
                letterSpacing: "-0.02em"
              }}>
                                Everything we build is designed for music lovers and investors alike,
                                connecting real-time social signals with market opportunity.
                            </p>

                            {/* Big CTA Button */}
                            <button
                onClick={() => isLoggedIn ? navigate('dashboard') : openAuth('signup')}
                style={{
                  marginTop: 50,
                  padding: "18px 48px",
                  background: COLORS.accent,
                  color: "#0F172A",
                  border: "none",
                  borderRadius: 0,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                  boxShadow: `0 4px 24px ${COLORS.accent}40`
                }}
                onMouseEnter={(e) => {e.target.style.transform = "translateY(-2px)";e.target.style.boxShadow = `0 8px 32px ${COLORS.accent}60`;}}
                onMouseLeave={(e) => {e.target.style.transform = "translateY(0)";e.target.style.boxShadow = `0 4px 24px ${COLORS.accent}40`;}}>
                                {isLoggedIn ? 'Launch Dashboard' : 'Create Free Account'}
                            </button>
                        </div>
                    </section>

                    {/* ─── FEATURES / CAPABILITIES ─── */}
                    <section style={{
            position: "relative",
            padding: "80px 60px 120px",
            background: COLORS.bgLight,
            color: COLORS.textDark
          }}>
                        <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.8fr",
              gap: 60, maxWidth: 1200
            }}>
                            <div>
                                <div style={{
                  position: "sticky", top: 120,
                  overflow: "hidden",
                  background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}15)`,
                  border: `1px solid ${COLORS.primary}15`,
                  aspectRatio: "3/4",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                                    <div style={{ width: "80%", padding: 20 }}>
                                        <div style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.1em", color: COLORS.primary,
                      marginBottom: 16
                    }}>LIVE MARKET PREVIEW</div>
                                        {["Solène", "KODA", "Mira Voss"].map((name, i) => {
                      const previewTickers = ["SOLN", "KODA", "MRVS"];
                      const prices = ["$3.88", "$5.12", "$2.47"];
                      const pcts = ["+31.5%", "+7.2%", "+18.3%"];
                      return (
                        <div key={name} style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", padding: "14px 0",
                          borderBottom: i < 2 ? `1px solid ${COLORS.primary}12` : "none"
                        }}>
                                                    <div>
                                                        <div style={{ fontSize: 15, fontWeight: 700 }}><span style={{ fontSize: 10, fontWeight: 700, color: COLORS.accentDark, fontFamily: "monospace", marginRight: 6 }}>{previewTickers[i]}</span>{name}</div>
                                                        <div style={{ fontSize: 12, color: COLORS.textDarkMuted }}>
                                                            {["R&B / Soul", "Electronic", "Indie Pop"][i]}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{prices[i]}</div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accentDark }}>{pcts[i]}</div>
                                                    </div>
                                                </div>);

                    })}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{
                  fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                  marginBottom: 40, color: COLORS.textDarkMuted
                }}>CAPABILITIES</div>

                                {FEATURES.map((f, i) =>
                <div
                  key={f.num}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "28px 0",
                    borderTop: "1px solid rgba(15,23,42,0.1)",
                    borderBottom: i === FEATURES.length - 1 ? "1px solid rgba(15,23,42,0.1)" : "none",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    transform: hoveredFeature === i ? "translateX(8px)" : "none"
                  }}>

                                        <span style={{
                    fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 600,
                    color: hoveredFeature === i ? COLORS.primary : COLORS.textDark,
                    transition: "color 0.3s"
                  }}>{f.title}</span>
                                        <span style={{
                    fontFamily: "monospace", fontSize: 13,
                    color: COLORS.textDarkMuted, letterSpacing: "0.1em"
                  }}>[ {f.num} ]</span>
                                    </div>
                )}

                                <div style={{ marginTop: 40 }}>
                                    <button
                    onClick={() => isLoggedIn ? navigate('dashboard') : openAuth('signup')}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: "monospace", fontSize: 14, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.15em",
                      color: COLORS.textDark,
                      display: "flex", alignItems: "center", gap: 8,
                      padding: 0, transition: "color 0.3s"
                    }}
                    onMouseEnter={(e) => e.target.style.color = COLORS.primary}
                    onMouseLeave={(e) => e.target.style.color = COLORS.textDark}>

                                        {isLoggedIn ? 'ENTER DASHBOARD' : 'GET STARTED FREE'}
                                        <span style={{ fontSize: 20, lineHeight: 1 }}>→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ─── FOOTER ─── */}
                    <section ref={contactRef} style={{
            position: "relative",
            padding: "100px 60px 40px",
            background: COLORS.bgLight,
            color: COLORS.textDark,
            overflow: "hidden"
          }}>
                        <h2 style={{
              fontSize: "clamp(36px, 7vw, 100px)",
              fontWeight: 900, letterSpacing: "-0.04em",
              lineHeight: 1, textTransform: "uppercase", marginBottom: 8
            }}>
                            TONICA@<br />CRESCENDO.IO
                        </h2>
                        <p style={{
              fontFamily: "monospace", fontSize: 13,
              fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 80, color: COLORS.textDarkMuted
            }}>LET'S SHAPE THE FUTURE OF MUSIC INVESTING</p>

                        <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 60, maxWidth: 900, paddingBottom: 60
            }}>
                            {[
              {
                label: "PLATFORM", items: [
                { name: "Markets", page: "markets" },
                { name: "Dashboard", page: "dashboard" },
                { name: "Portfolio", page: "portfolio" }]

              },
              {
                label: "COMPANY", items: [
                { name: "About", page: "about" },
                { name: "Careers", page: null },
                
                { name: "Legal", page: null }]

              },
              {
                label: "EXTERNAL", items: [
                { name: "Twitter / X", page: null },
                { name: "Instagram", page: null },
                
                { name: "LinkedIn", page: null }]

              }].
              map((col) =>
              <div key={col.label}>
                                    <div style={{
                  fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                  marginBottom: 16, color: COLORS.textDarkMuted
                }}>{col.label}</div>
                                    {col.items.map((l) =>
                <div key={l.name}
                onClick={() => l.page && navigate(l.page)}
                style={{
                  fontFamily: "monospace", fontSize: 13,
                  marginBottom: 8, cursor: l.page ? "pointer" : "default",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  color: COLORS.textDark, transition: "color 0.2s",
                  opacity: l.page ? 1 : 0.5
                }}
                onMouseEnter={(e) => l.page && (e.target.style.color = COLORS.primary)}
                onMouseLeave={(e) => l.page && (e.target.style.color = COLORS.textDark)}>
                  {l.name}</div>
                )}
                                </div>
              )}
                        </div>

                        <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 200,
              background: `linear-gradient(180deg, transparent, ${COLORS.accent}30)`,
              pointerEvents: "none"
            }} />

                        <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 20, borderTop: "1px solid rgba(15,23,42,0.1)",
              position: "relative", zIndex: 2
            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                





                                <span style={{
                  fontSize: 13, fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase"
                }}>CRESCENDO</span>
                            </div>
                            <span style={{
                fontFamily: "monospace", fontSize: 11,
                color: COLORS.textDarkMuted
              }}>© Crescendo 2026 all rights reserved</span>
                        </div>
                    </section>

                </div>
            </div>
        </div>);

}