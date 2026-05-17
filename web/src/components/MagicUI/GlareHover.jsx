import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function GlareHover({
  children,
  width,
  height,
  background = 'transparent',
  borderRadius = 16,
  glareColor = 'rgba(255,255,255,0.15)',
  glareSize = 300,
  style,
  className,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        position: 'relative',
        width, height,
        borderRadius,
        overflow: 'hidden',
        background,
        ...style,
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          background: `radial-gradient(${glareSize}px circle at ${pos.x}% ${pos.y}%, ${glareColor}, transparent)`,
          opacity: isHovering ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </motion.div>
  );
}
