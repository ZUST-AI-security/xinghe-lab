import React from 'react';

export default function AuroraBackground({ children, className, style, showRadialGradient = true }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          '--aurora': 'repeating-linear-gradient(100deg,#1677ff 10%,#93c5fd 15%,#a5b4fc 20%,#ddd6fe 25%,#60a5fa 30%)',
          '--white-gradient': 'repeating-linear-gradient(100deg,#fff 0%,#fff 7%,transparent 10%,transparent 12%,#fff 16%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            backgroundImage: 'var(--white-gradient), var(--aurora)',
            backgroundSize: '300% 200%, 200% 100%',
            backgroundPosition: '50% 50%, 50% 50%',
            opacity: 0.5,
            filter: 'blur(10px) invert(1)',
            willChange: 'transform',
            pointerEvents: 'none',
            animation: 'aurora-shift 60s linear infinite',
            ...(showRadialGradient ? {
              maskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
            } : {}),
          }}
        />
      </div>
      <style>{`
        @keyframes aurora-shift {
          from { background-position: 50% 50%, 50% 50%; }
          to { background-position: 350% 50%, 350% 50%; }
        }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>{children}</div>
    </div>
  );
}
