import React from 'react';

export default function AnimatedGradientText({
  children,
  className,
  style,
  colors = ['#1677ff', '#7c3aed', '#06b6d4', '#1677ff'],
  speed = 3,
}) {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        background: gradient,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `gradientShift ${speed}s ease infinite`,
        ...style,
      }}
    >
      {children}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </span>
  );
}
