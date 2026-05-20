import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 80,
  duration = 3,
  delay = 0,
  pathColor = 'rgba(22,119,255,0.08)',
  beamColor = '#1677ff',
  beamWidth = 2,
  style,
}) {
  const [path, setPath] = useState('');
  const [pathLength, setPathLength] = useState(0);
  const svgRef = useRef(null);

  useEffect(() => {
    const updatePath = () => {
      const container = containerRef?.current;
      const from = fromRef?.current;
      const to = toRef?.current;
      if (!container || !from || !to) return;

      const cRect = container.getBoundingClientRect();
      const fRect = from.getBoundingClientRect();
      const tRect = to.getBoundingClientRect();

      const startX = fRect.left + fRect.width / 2 - cRect.left;
      const startY = fRect.top + fRect.height / 2 - cRect.top;
      const endX = tRect.left + tRect.width / 2 - cRect.left;
      const endY = tRect.top + tRect.height / 2 - cRect.top;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - curvature;

      const d = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
      setPath(d);

      if (svgRef.current) {
        const pathEl = svgRef.current.querySelector('path');
        if (pathEl) setPathLength(pathEl.getTotalLength());
      }
    };

    updatePath();
    window.addEventListener('resize', updatePath);
    return () => window.removeEventListener('resize', updatePath);
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        ...style,
      }}
    >
      <path d={path} fill="none" stroke={pathColor} strokeWidth={beamWidth} />
      {pathLength > 0 && (
        <motion.path
          d={path}
          fill="none"
          stroke={beamColor}
          strokeWidth={beamWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, pathOffset: 0 }}
          animate={{ pathLength: [0, 0.3, 0], pathOffset: [0, 1, 1] }}
          transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </svg>
  );
}
