import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function TracingBeam({ children, className }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const contentRef = useRef(null);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight - 100]), { stiffness: 50, damping: 20 });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 50]), { stiffness: 50, damping: 20 });

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', gap: 40 }}>
      {/* beam column */}
      <div style={{ position: 'relative', width: 40, flexShrink: 0 }}>
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          style={{ position: 'absolute', left: 10, top: 0, overflow: 'visible' }}
        >
          {/* background path */}
          <motion.path
            d={`M 10 0 V ${svgHeight}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          {/* animated gradient path */}
          <motion.path
            d={`M 10 0 V ${svgHeight}`}
            fill="none"
            stroke="url(#beam-gradient)"
            strokeWidth="2.5"
            style={{
              pathLength: scrollYProgress,
            }}
          />
          <defs>
            <linearGradient id="beam-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1677ff" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* glowing dot 1 */}
        <motion.div
          style={{
            position: 'absolute',
            left: 4,
            top: y1,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#1677ff',
            boxShadow: '0 0 12px 4px rgba(22,119,255,0.4)',
          }}
        />
        {/* glowing dot 2 */}
        <motion.div
          style={{
            position: 'absolute',
            left: 6,
            top: y2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#7c3aed',
            boxShadow: '0 0 10px 3px rgba(124,58,237,0.3)',
          }}
        />
      </div>

      {/* content */}
      <div ref={contentRef} style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
