import React from 'react';
import { motion } from 'framer-motion';

export default function BlurFade({
  children,
  className,
  style,
  variant = { hidden: { y: 20, opacity: 0, filter: 'blur(8px)' }, visible: { y: 0, opacity: 1, filter: 'blur(0px)' } },
  duration = 0.6,
  delay = 0,
  offset = 20,
  once = true,
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: `-${offset}px` }}
      variants={variant}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
