import React from 'react';
import { motion } from 'framer-motion';

export default function ShimmerCard({ children, className, style }) {
  return (
    <motion.div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        ...style,
      }}
      whileHover={{ scale: 1.008 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.25) 45%, transparent 55%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-slide 3s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 2,
          borderRadius: 'inherit',
        }}
      />
      <style>{`
        @keyframes shimmer-slide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}
