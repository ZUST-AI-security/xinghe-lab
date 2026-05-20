import React, { useState, useRef } from 'react';

export default function NeonGradientCard({
  children,
  style,
  className,
  borderRadius = 20,
  neonColors = { firstColor: '#1677ff', secondColor: '#7c3aed' },
  size = 300,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        borderRadius,
        padding: 2,
        background: `radial-gradient(${size}px circle at ${pos.x}% ${pos.y}%, ${neonColors.firstColor}, ${neonColors.secondColor}, transparent)`,
        transition: 'background 0.15s ease',
        ...style,
      }}
    >
      <div style={{
        borderRadius: borderRadius - 1,
        background: '#fff',
        width: '100%',
        height: '100%',
      }}>
        {children}
      </div>
    </div>
  );
}
