import React from 'react';

export default function BorderBeam({
  size = 120,
  duration = 8,
  delay = 0,
  colorFrom = '#1677ff',
  colorTo = '#7c3aed',
  style,
  className,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute', inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid transparent',
        mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        background: `conic-gradient(from ${delay * 36}deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
        animation: `borderBeamSpin ${duration}s linear infinite`,
        backgroundSize: `${size}px ${size}px`,
      }} />
      <style>{`
        @keyframes borderBeamSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
