import React, { useMemo } from 'react';

export default function Meteors({ number = 20, style, className }) {
  const meteors = useMemo(() => Array.from({ length: number }, (_, i) => ({
    id: i,
    // Random horizontal start position across a wide range
    left: Math.random() * 140 - 20,
    delay: Math.random() * 6 + 0.2,
    duration: Math.floor(Math.random() * 5) + 3,
    // Tail length varies 40-80px
    tailLen: 40 + Math.random() * 40,
  })), [number]);

  return (
    <div
      className={className}
      style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden', pointerEvents: 'none',
        ...style,
      }}
    >
      {meteors.map((m) => (
        <span
          key={m.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${m.left}px`,
            width: 2,
            height: 2,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.8)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 0 6px 1px rgba(180,210,255,0.4)',
            transform: 'rotate(215deg)',
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            animationName: 'meteorFall',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            opacity: 0,
          }}
        >
          {/* Tail via pseudo-element — thin gradient line */}
          <span style={{
            content: '""',
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            width: m.tailLen,
            height: 1,
            background: 'linear-gradient(to right, rgba(148,163,184,0), rgba(148,163,184,0.5) 20%, rgba(200,220,255,0.7))',
            borderRadius: 999,
            pointerEvents: 'none',
          }} />
        </span>
      ))}
      <style>{`
        @keyframes meteorFall {
          0% {
            transform: rotate(215deg) translateX(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: rotate(215deg) translateX(-600px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
