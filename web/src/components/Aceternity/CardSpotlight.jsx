import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';

export default function CardSpotlight({
  children,
  radius = 350,
  color = 'rgba(255,255,255,0.06)',
  className,
  style,
  ...props
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      <motion.div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: -1,
          borderRadius: 'inherit',
          opacity: isHovering ? 1 : 0,
          transition: 'opacity 0.3s',
          background: color,
          maskImage: useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, white, transparent 80%)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, white, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
}
