import React from 'react';

export default function Meteors({ number = 20, style, className }) {
  const meteors = Array.from({ length: number }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 1 + Math.random() * 3,
    size: 1 + Math.random() * 2,
    opacity: 0.2 + Math.random() * 0.4,
  }));

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
        <div
          key={m.id}
          style={{
            position: 'absolute',
            left: `${m.left}%`,
            top: '-5%',
            width: m.size,
            height: m.size * 40,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)',
            borderRadius: 999,
            opacity: m.opacity,
            transform: 'rotate(-45deg)',
            animation: `meteorFall ${m.duration}s linear ${m.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes meteorFall {
          0% { transform: translateY(0) rotate(-45deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(-45deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
