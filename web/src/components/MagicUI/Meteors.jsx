import React from 'react';

export default function Meteors({ number = 20, style, className }) {
  const meteors = Array.from({ length: number }, (_, i) => {
    const headSize = 2 + Math.random() * 3;
    const tailLen = 60 + Math.random() * 100;
    const angle = -35 - Math.random() * 20; // -35 to -55 deg
    return {
      id: i,
      left: Math.random() * 120 - 10, // -10% to 110%
      delay: Math.random() * 8,
      duration: 1.5 + Math.random() * 2.5,
      headSize,
      tailLen,
      angle,
      opacity: 0.5 + Math.random() * 0.5,
    };
  });

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
            animation: `meteorFall ${m.duration}s linear ${m.delay}s infinite`,
            opacity: 0,
          }}
        >
          {/* Tail */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transformOrigin: 'top center',
            transform: `translateX(-50%) rotate(${m.angle + 90}deg)`,
            width: m.tailLen,
            height: 1.5,
            background: `linear-gradient(to left, rgba(180,210,255,${m.opacity * 0.7}), rgba(120,170,255,${m.opacity * 0.3}) 30%, transparent)`,
            borderRadius: 999,
            filter: 'blur(0.5px)',
          }} />
          {/* Head glow */}
          <div style={{
            position: 'absolute',
            top: -m.headSize * 1.5,
            left: '50%',
            transform: 'translate(-50%, 0)',
            width: m.headSize * 4,
            height: m.headSize * 4,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(180,220,255,${m.opacity * 0.3}) 0%, transparent 70%)`,
            filter: 'blur(2px)',
          }} />
          {/* Head core */}
          <div style={{
            position: 'absolute',
            top: -m.headSize / 2,
            left: '50%',
            transform: 'translate(-50%, 0)',
            width: m.headSize,
            height: m.headSize,
            borderRadius: '50%',
            background: `radial-gradient(circle, #fff 0%, rgba(180,220,255,${m.opacity}) 60%, transparent 100%)`,
            boxShadow: `0 0 ${m.headSize * 2}px rgba(160,200,255,${m.opacity * 0.8}), 0 0 ${m.headSize * 4}px rgba(120,170,255,${m.opacity * 0.4})`,
          }} />
        </div>
      ))}
      <style>{`
        @keyframes meteorFall {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          5% { opacity: 1; }
          85% { opacity: 0.8; }
          100% { transform: translateY(110vh) translateX(-20vw); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
