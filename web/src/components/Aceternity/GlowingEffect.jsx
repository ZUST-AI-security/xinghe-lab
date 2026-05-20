import React, { useCallback, useEffect, useRef } from 'react';

export default function GlowingEffect({ spread = 20, proximity = 100, disabled = false, className, style }) {
  const containerRef = useRef(null);

  const handleMove = useCallback((e) => {
    if (!containerRef.current || disabled) return;
    const el = containerRef.current;
    const { left, top, width, height } = el.getBoundingClientRect();
    const mouseX = e?.x ?? 0;
    const mouseY = e?.y ?? 0;
    const center = [left + width * 0.5, top + height * 0.5];
    const angle = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;
    const isActive = mouseX > left - proximity && mouseX < left + width + proximity && mouseY > top - proximity && mouseY < top + height + proximity;
    el.style.setProperty('--start', String(angle));
    el.style.setProperty('--active', isActive ? '1' : '0');
  }, [disabled, proximity]);

  useEffect(() => {
    if (disabled) return;
    const onMove = (e) => requestAnimationFrame(() => handleMove(e));
    document.body.addEventListener('pointermove', onMove, { passive: true });
    return () => document.body.removeEventListener('pointermove', onMove);
  }, [handleMove, disabled]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        '--spread': spread,
        '--start': '0',
        '--active': '0',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          opacity: 'var(--active)',
          transition: 'opacity 0.3s',
          background: `conic-gradient(from calc((var(--start) - var(--spread)) * 1deg), transparent 0deg, var(--xh-primary) calc(var(--spread) * 1deg), transparent calc(var(--spread) * 2deg))`,
          maskImage: 'linear-gradient(#0000, #0000), conic-gradient(from calc((var(--start) - var(--spread)) * 1deg), #00000000 0deg, #fff, #00000000 calc(var(--spread) * 2deg))',
          maskClip: 'padding-box, border-box',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          padding: 1,
        }}
      />
    </div>
  );
}
