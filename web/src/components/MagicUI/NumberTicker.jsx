import React, { useEffect, useRef, useState } from 'react';
import { useInView, motion } from 'framer-motion';

export default function NumberTicker({
  value = 0,
  duration = 1.5,
  suffix = '',
  prefix = '',
  className,
  style,
  decimalPlaces = 0,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = (now - startTime) / (duration * 1000);
      if (elapsed >= 1) { setDisplay(value); return; }
      const eased = 1 - Math.pow(1 - elapsed, 4);
      setDisplay(value * eased);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  const formatted = decimalPlaces > 0 ? display.toFixed(decimalPlaces) : Math.round(display);

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {prefix}{formatted}{suffix}
    </motion.span>
  );
}
