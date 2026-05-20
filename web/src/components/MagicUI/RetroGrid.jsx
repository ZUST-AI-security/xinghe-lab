import React from 'react';

export default function RetroGrid({ style, className, angle = 65, cellSize = 60, opacity = 0.3 }) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute',
        inset: '-50%',
        transform: `perspective(500px) rotateX(${angle}deg)`,
        transformOrigin: 'center top',
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,${opacity}) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,${opacity}) 1px, transparent 1px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        animation: 'retroGridScroll 15s linear infinite',
        mask: 'linear-gradient(to top, transparent 0%, white 30%, white 70%, transparent 100%)',
        WebkitMask: 'linear-gradient(to top, transparent 0%, white 30%, white 70%, transparent 100%)',
      }} />
      <style>{`
        @keyframes retroGridScroll {
          from { transform: perspective(500px) rotateX(65deg) translateY(0); }
          to { transform: perspective(500px) rotateX(65deg) translateY(60px); }
        }
      `}</style>
    </div>
  );
}
