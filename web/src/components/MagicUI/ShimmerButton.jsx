import React from 'react';
import { motion } from 'framer-motion';

export default function ShimmerButton({
  children,
  onClick,
  style,
  className,
  shimmerColor = 'rgba(255,255,255,0.3)',
  shimmerSize = '100px',
  borderRadius = 12,
  ...props
}) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius,
        padding: '14px 36px',
        border: 'none',
        background: 'linear-gradient(135deg, #1677ff, #7c3aed)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(22,119,255,0.3)',
        ...style,
      }}
      {...props}
    >
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(110deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`,
        backgroundSize: `${shimmerSize} 100%`,
        animation: 'shimmerSlide 2.5s linear infinite',
        borderRadius,
      }} />
      <style>{`
        @keyframes shimmerSlide {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
      `}</style>
    </motion.button>
  );
}
