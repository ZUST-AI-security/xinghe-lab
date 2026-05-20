import React from 'react';
import { motion } from 'framer-motion';

export default function PulseDot({ color = 'var(--xh-primary)', size = 8, className, style }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        position: 'relative',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: color,
          opacity: 0.4,
          animation: 'pulse-ring 1.8s ease-out infinite',
        }}
      />
      <span
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: color,
          position: 'relative',
        }}
      />
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
