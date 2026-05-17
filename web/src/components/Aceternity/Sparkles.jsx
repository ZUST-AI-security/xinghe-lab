import React, { useRef, useEffect, useCallback } from 'react';

const PARTICLE_COUNT = 80;
const PARTICLE_COLOR = 'rgba(22, 119, 255, 0.6)';

function createParticle(w, h) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2.5 + 0.5,
    speedX: (Math.random() - 0.5) * 0.4,
    speedY: (Math.random() - 0.5) * 0.4,
    opacity: Math.random() * 0.6 + 0.2,
    pulse: Math.random() * Math.PI * 2,
  };
}

export default function Sparkles({ className, style, color = PARTICLE_COLOR, count = PARTICLE_COUNT }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    particles.current.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += 0.02;
      const alpha = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.fill();
    });

    animRef.current = requestAnimationFrame(draw);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      particles.current = Array.from({ length: count }, () => createParticle(canvas.width, canvas.height));
    };

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [count, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
    />
  );
}
