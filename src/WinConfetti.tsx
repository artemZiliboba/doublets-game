import { useEffect, useRef } from "react";

type Particle = {
  x: number; y: number; vx: number; vy: number; gravity: number;
  size: number; rotation: number; spin: number; color: string; wobble: number; phase: number;
};

const COLORS = ["#D4E59A", "#A4D6B5", "#F2D28C", "#E8F1E6", "#89B7A6", "#E7A98E"];

export default function WinConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frame = 0;
    let animationId = 0;
    let previous = 0;
    let elapsed = 0;
    const duration = 2800;
    const particles: Particle[] = [];
    const random = (min: number, max: number) => min + Math.random() * (max - min);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(window.innerWidth * dpr);
      canvas!.height = Math.round(window.innerHeight * dpr);
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Two celebratory bursts from opposite sides, spreading across the viewport.
    for (let i = 0; i < 145; i++) {
      const left = i % 2 === 0;
      const angle = left ? random(-1.2, 0.15) : random(Math.PI - 0.15, Math.PI + 1.2);
      const speed = random(4.5, 12);
      particles.push({
        x: left ? -10 : width + 10,
        y: height * random(0.28, 0.68),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - random(2, 5),
        gravity: random(0.09, 0.18),
        size: random(4, 9),
        rotation: random(0, Math.PI * 2),
        spin: random(-0.15, 0.15),
        color: COLORS[i % COLORS.length],
        wobble: random(0.3, 1.4),
        phase: random(0, Math.PI * 2),
      });
    }

    function animate(timestamp: number) {
      if (!previous) previous = timestamp;
      const dt = Math.min((timestamp - previous) / 16.67, 2);
      previous = timestamp;
      elapsed += timestamp - (frame === 0 ? timestamp : timestamp - dt * 16.67);
      frame++;
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade = Math.min(1, Math.max(0, (duration - elapsed) / 650));
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(0.995, dt);
        p.rotation += p.spin * dt;
        ctx!.save();
        ctx!.translate(p.x + Math.sin(frame * 0.045 + p.phase) * p.wobble * 3, p.y);
        ctx!.rotate(p.rotation);
        ctx!.globalAlpha = fade;
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx!.restore();
      }
      if (elapsed < duration && !document.hidden) animationId = requestAnimationFrame(animate);
      else ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="win-confetti" aria-hidden="true" />;
}
