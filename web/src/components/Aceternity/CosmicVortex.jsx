import React, { useRef, useEffect } from 'react';

export default function CosmicVortex({ style, className }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, cx, cy;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cx = w / 2;
      cy = h / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      mouseRef.current.x = e.clientX / w;
      mouseRef.current.y = e.clientY / h;
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });

    // Stars - distant background layer
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      size: Math.random() * 1.2 + 0.3,
      brightness: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // Vortex particles - spiral around center
    const particles = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.4 + 0.05;
      return {
        angle,
        dist,
        speed: (0.002 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2 + 0.5,
        hue: 200 + Math.random() * 80,
        brightness: 0.4 + Math.random() * 0.4,
        drift: Math.random() * 0.0003 - 0.00015,
      };
    });

    // Dust clouds - large soft particles
    const dust = Array.from({ length: 8 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      size: Math.random() * 300 + 150,
      hue: 220 + Math.random() * 40,
      opacity: Math.random() * 0.04 + 0.01,
      speedX: (Math.random() - 0.5) * 0.0002,
      speedY: (Math.random() - 0.5) * 0.0002,
    }));

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, w, h);

      // Deep space background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#0a0a1a');
      bgGrad.addColorStop(0.3, '#050510');
      bgGrad.addColorStop(1, '#000005');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Parallax offset from mouse
      const mx = (mouseRef.current.x - 0.5) * 30;
      const my = (mouseRef.current.y - 0.5) * 30;

      // Dust clouds
      dust.forEach((d) => {
        d.x += d.speedX;
        d.y += d.speedY;
        if (d.x > 1.5) d.x = -1.5;
        if (d.x < -1.5) d.x = 1.5;
        if (d.y > 1.5) d.y = -1.5;
        if (d.y < -1.5) d.y = 1.5;
        const px = (d.x + 1) * 0.5 * w + mx * 0.3;
        const py = (d.y + 1) * 0.5 * h + my * 0.3;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, d.size);
        grad.addColorStop(0, `hsla(${d.hue}, 60%, 30%, ${d.opacity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(px - d.size, py - d.size, d.size * 2, d.size * 2);
      });

      // Stars with parallax
      stars.forEach((s) => {
        const px = (s.x + 1) * 0.5 * w + mx * 0.15;
        const py = (s.y + 1) * 0.5 * h + my * 0.15;
        const twinkle = Math.sin(tick * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7;
        const alpha = s.brightness * twinkle;
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx.fill();
      });

      // Vortex particles - spiral orbits
      particles.forEach((p) => {
        p.angle += p.speed;
        p.dist += p.drift;
        if (p.dist > 0.5) p.drift = -Math.abs(p.drift);
        if (p.dist < 0.03) p.drift = Math.abs(p.drift);

        const r = Math.min(w, h) * p.dist;
        const px = cx + Math.cos(p.angle) * r + mx * (0.5 - p.dist);
        const py = cy + Math.sin(p.angle) * r * 0.6 + my * (0.5 - p.dist);

        // Particle trail
        const tailLen = 8;
        for (let t = 0; t < tailLen; t++) {
          const ta = p.angle - p.speed * t * 2;
          const tr = r - t * 0.5;
          const tx = cx + Math.cos(ta) * tr + mx * (0.5 - p.dist);
          const ty = cy + Math.sin(ta) * tr * 0.6 + my * (0.5 - p.dist);
          const alpha = p.brightness * (1 - t / tailLen) * 0.4;
          ctx.beginPath();
          ctx.arc(tx, ty, p.size * (1 - t / tailLen * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`;
          ctx.fill();
        }

        // Main particle
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.brightness})`;
        ctx.fill();
      });

      // Central black hole - event horizon
      const holeR = Math.min(w, h) * 0.06;
      const holeGrad = ctx.createRadialGradient(cx + mx * 0.1, cy + my * 0.1, 0, cx + mx * 0.1, cy + my * 0.1, holeR * 4);
      holeGrad.addColorStop(0, 'rgba(0,0,0,0.95)');
      holeGrad.addColorStop(0.3, 'rgba(10,10,30,0.8)');
      holeGrad.addColorStop(0.6, 'rgba(20,20,60,0.3)');
      holeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(cx + mx * 0.1, cy + my * 0.1, holeR * 4, 0, Math.PI * 2);
      ctx.fill();

      // Accretion disk glow
      const diskPulse = Math.sin(tick * 0.015) * 0.15 + 0.85;
      const diskGrad = ctx.createRadialGradient(cx + mx * 0.1, cy + my * 0.1, holeR * 0.8, cx + mx * 0.1, cy + my * 0.1, holeR * 3);
      diskGrad.addColorStop(0, 'transparent');
      diskGrad.addColorStop(0.4, `rgba(100, 140, 255, ${0.08 * diskPulse})`);
      diskGrad.addColorStop(0.6, `rgba(140, 100, 255, ${0.05 * diskPulse})`);
      diskGrad.addColorStop(0.8, `rgba(80, 160, 255, ${0.03 * diskPulse})`);
      diskGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.arc(cx + mx * 0.1, cy + my * 0.1, holeR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright ring
      ctx.save();
      ctx.globalAlpha = 0.15 * diskPulse;
      ctx.strokeStyle = 'rgba(160, 180, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx + mx * 0.1, cy + my * 0.1, holeR * 1.8, holeR * 1.1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Outer faint ring
      ctx.save();
      ctx.globalAlpha = 0.06 * diskPulse;
      ctx.strokeStyle = 'rgba(120, 140, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx + mx * 0.1, cy + my * 0.1, holeR * 2.8, holeR * 1.6, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Vignette
      const vigGrad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.7);
      vigGrad.addColorStop(0, 'transparent');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
