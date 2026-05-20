import React from 'react';
import { motion } from 'framer-motion';

export function BentoGrid({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'minmax(180px, auto)',
        gap: 16,
        maxWidth: 1200,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  title,
  description,
  icon,
  header,
  className,
  style,
  colSpan = 1,
  rowSpan = 1,
  onClick,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        background: '#fff',
        border: '1px solid #e2e8f0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(22,119,255,0.08)';
        e.currentTarget.style.borderColor = 'rgba(22,119,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {/* header area (image/gradient/illustration) */}
      {header && (
        <div style={{ padding: 0, overflow: 'hidden' }}>
          {header}
        </div>
      )}

      {/* content */}
      <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {icon && (
          <div style={{ marginBottom: 12 }}>{icon}</div>
        )}
        <h3 style={{
          fontSize: 17, fontWeight: 700, color: '#0f172a',
          margin: '0 0 6px', lineHeight: 1.3,
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 13, lineHeight: 1.6, color: '#64748b',
          margin: 0, flex: 1,
        }}>
          {description}
        </p>
      </div>

      {/* hover gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(22,119,255,0.02) 0%, rgba(124,58,237,0.02) 100%)',
        pointerEvents: 'none', opacity: 0,
        transition: 'opacity 0.3s ease',
      }} />
    </motion.div>
  );
}
