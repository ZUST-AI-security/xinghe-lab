import React from 'react';
import { motion } from 'framer-motion';

export default function FloatUp({ children, delay = 0, duration = 0.5, y = 20, className, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
