import React from 'react';
import { motion } from 'framer-motion';

const paths = [
  'M-200 800 Q0 400 200 800 T600 800 T1000 800 T1400 800 T1800 800',
  'M-200 600 Q100 200 400 600 T800 600 T1200 600 T1600 600',
  'M-100 900 Q200 500 500 900 T900 900 T1300 900',
];

export default function BackgroundBeams({ className, style, color = 'rgba(22,119,255,0.08)' }) {
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 1400 1000" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="8 12"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -200 }}
            transition={{ duration: 8 + i * 3, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>
    </div>
  );
}
