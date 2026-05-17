import React from 'react';
import { motion } from 'framer-motion';

export default function EvervingCard({ children, style, className, delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay, duration: 0.7, ease: 'easeOut' }}
      animate={{
        y: [0, -8, 0, 6, 0],
        rotateZ: [0, -0.5, 0, 0.5, 0],
        rotateX: [0, 2, 0, -2, 0],
      }}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
