import React from 'react';
import { motion } from 'framer-motion';

export default function MovingBorder({ children, className, style, duration = 3000, colors = ['#1677ff', '#7c3aed', '#06b6d4', '#1677ff'] }) {
  return (
    <motion.div
      className={className}
      style={{
        position: 'relative',
        padding: '2px',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'inline-flex',
        ...style,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: '-2px',
          borderRadius: 14,
          background: `linear-gradient(90deg, ${colors.join(', ')})`,
          backgroundSize: '300% 100%',
          zIndex: 0,
        }}
        animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
        transition={{ duration: duration / 1000, repeat: Infinity, ease: 'linear' }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: 10,
          background: 'var(--xh-surface)',
          width: '100%',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
