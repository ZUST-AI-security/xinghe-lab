import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function MagneticButton({ children, strength = 0.4, maxDistance = 60, className, style }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    let x = (e.clientX - (left + width / 2)) * strength;
    let y = (e.clientY - (top + height / 2)) * strength;
    const distance = Math.hypot(x, y);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      x *= scale;
      y *= scale;
    }
    setPosition({ x, y });
  };

  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });
  const hasMoved = position.x !== 0 || position.y !== 0;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        cursor: 'pointer',
        borderRadius: 12,
        border: '1px dashed transparent',
        transition: 'border-color 0.15s, background-color 0.15s',
        borderColor: hasMoved ? 'var(--xh-primary)' : 'transparent',
        backgroundColor: hasMoved ? 'var(--xh-primary-soft)' : 'transparent',
        display: 'inline-block',
        ...style,
      }}
    >
      <motion.div
        ref={ref}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
