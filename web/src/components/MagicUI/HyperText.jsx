import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export default function HyperText({
  text,
  duration = 800,
  className,
  style,
  animateOnView = true,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayText, setDisplayText] = useState(animateOnView ? text.replace(/./g, ' ') : text);
  const [started, setStarted] = useState(!animateOnView);

  useEffect(() => {
    if (isInView && animateOnView) setStarted(true);
  }, [isInView, animateOnView]);

  useEffect(() => {
    if (!started) return;
    let iteration = 0;
    const totalIterations = text.length * 3;
    const interval = duration / totalIterations;

    const timer = setInterval(() => {
      setDisplayText(
        text.split('').map((char, i) => {
          if (char === ' ') return ' ';
          if (i < iteration / 3) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );
      iteration++;
      if (iteration > totalIterations) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [started, text, duration]);

  return (
    <span ref={ref} className={className} style={{ fontFamily: 'monospace', ...style }}>
      {displayText}
    </span>
  );
}
