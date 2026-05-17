import React from 'react';

export default function Marquee({
  children,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 2,
  style,
  className,
}) {
  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        maskImage: vertical
          ? 'linear-gradient(to bottom, transparent, white 10%, white 90%, transparent)'
          : 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: vertical
          ? 'linear-gradient(to bottom, transparent, white 10%, white 90%, transparent)'
          : 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          gap: '1rem',
          width: 'max-content',
          animation: `marquee${vertical ? 'Y' : 'X'} ${vertical ? '20s' : '30s'} linear infinite ${reverse ? 'reverse' : 'normal'}`,
        }}
        onMouseEnter={(e) => { if (pauseOnHover) e.currentTarget.style.animationPlayState = 'paused'; }}
        onMouseLeave={(e) => { if (pauseOnHover) e.currentTarget.style.animationPlayState = 'running'; }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '1rem' }}>
            {children}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marqueeX { to { transform: translateX(calc(-50% - 0.5rem)); } }
        @keyframes marqueeY { to { transform: translateY(calc(-50% - 0.5rem)); } }
      `}</style>
    </div>
  );
}
