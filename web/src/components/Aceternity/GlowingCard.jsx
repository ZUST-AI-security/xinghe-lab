import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function GlowingCard({ children, className, style, glowColor = 'rgba(22,119,255,0.15)', borderColor = 'rgba(22,119,255,0.2)' }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        ...style,
      }}
    >
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: pos.y - 150,
            left: pos.x - 150,
            width: 300,
            height: 300,
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.3s',
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            border: `1px solid ${borderColor}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}
