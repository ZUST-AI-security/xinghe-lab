import React, { useRef, useEffect } from 'react';

export default function FlickeringGrid({
  style,
  className,
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.15,
  color = 'rgb(96, 165, 250)',
  maxOpacity = 0.4,
  width,
  height,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cols, rows;

    const resize = () => {
      const w = width || canvas.parentElement?.offsetWidth || 800;
      const h = height || canvas.parentElement?.offsetHeight || 600;
      canvas.width = w;
      canvas.height = h;
      cols = Math.floor(w / (squareSize + gridGap));
      rows = Math.floor(h / (squareSize + gridGap));
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (Math.random() < flickerChance) {
            const opacity = Math.random() * maxOpacity;
            ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
            ctx.fillRect(
              i * (squareSize + gridGap),
              j * (squareSize + gridGap),
              squareSize,
              squareSize
            );
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [squareSize, gridGap, flickerChance, color, maxOpacity, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
    />
  );
}
