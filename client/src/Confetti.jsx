import { useEffect, useRef } from "react";

// ─── Confetti ─── canvas-based particle burst for portfolio ATH ───

const COLORS = [
  "#50E3C2", "#36D7B7", "#4338CA", "#5B6AE8",
  "#FFD700", "#FFA500", "#FF6B6B", "#A78BFA",
];

export default function Confetti({ active = false, duration = 3500 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Spawn particles
    const particles = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: W * 0.3 + Math.random() * W * 0.4,
        y: H * 0.2 + Math.random() * H * 0.1,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 8 - 2,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.12 + Math.random() * 0.08,
        opacity: 1,
        decay: 0.003 + Math.random() * 0.004,
      });
    }
    particlesRef.current = particles;

    const start = Date.now();

    function animate() {
      const elapsed = Date.now() - start;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, p.opacity - p.decay);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
