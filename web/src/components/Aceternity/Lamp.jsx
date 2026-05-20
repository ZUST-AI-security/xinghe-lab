import React from 'react';
import { motion } from 'framer-motion';

export default function LampContainer({ children, className, style, bgColor }) {
  const bg = bgColor || 'var(--xh-bg)';
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        minHeight: 400,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        borderRadius: 16,
        '--lamp-bg': bg,
        ...style,
      }}
    >
      <div style={{ position: 'relative', display: 'flex', flex: 1, transform: 'scaleY(1.25)', alignItems: 'center', justifyContent: 'center', isolation: 'isolate' }}>
        {/* Left cone */}
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
          style={{
            position: 'absolute', inset: 'auto', right: '50%', height: 224, overflow: 'visible',
            backgroundImage: 'conic-gradient(from 70deg at center top, var(--xh-primary), transparent, transparent)',
            borderRadius: 0,
          }}
        >
          <div style={{ position: 'absolute', width: '100%', left: 0, background: 'var(--lamp-bg, var(--xh-bg))', height: 160, bottom: 0, zIndex: 20, maskImage: 'linear-gradient(to top, white, transparent)', WebkitMaskImage: 'linear-gradient(to top, white, transparent)' }} />
          <div style={{ position: 'absolute', width: 160, height: '100%', left: 0, background: 'var(--lamp-bg, var(--xh-bg))', bottom: 0, zIndex: 20, maskImage: 'linear-gradient(to right, white, transparent)', WebkitMaskImage: 'linear-gradient(to right, white, transparent)' }} />
        </motion.div>

        {/* Right cone */}
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
          style={{
            position: 'absolute', inset: 'auto', left: '50%', height: 224,
            backgroundImage: 'conic-gradient(from 290deg at center top, transparent, transparent, var(--xh-primary))',
          }}
        >
          <div style={{ position: 'absolute', width: 160, height: '100%', right: 0, background: 'var(--lamp-bg, var(--xh-bg))', bottom: 0, zIndex: 20, maskImage: 'linear-gradient(to left, white, transparent)', WebkitMaskImage: 'linear-gradient(to left, white, transparent)' }} />
          <div style={{ position: 'absolute', width: '100%', right: 0, background: 'var(--lamp-bg, var(--xh-bg))', height: 160, bottom: 0, zIndex: 20, maskImage: 'linear-gradient(to top, white, transparent)', WebkitMaskImage: 'linear-gradient(to top, white, transparent)' }} />
        </motion.div>

        {/* Center blur */}
        <div style={{ position: 'absolute', top: '50%', height: 192, width: '100%', transform: 'translateY(48px)', background: 'var(--lamp-bg, var(--xh-bg))', filter: 'blur(16px)', zIndex: 50 }} />
        <div style={{ position: 'absolute', top: '50%', zIndex: 50, height: 192, width: '100%', background: 'transparent', opacity: 0.1, backdropFilter: 'blur(8px)' }} />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', inset: 'auto', zIndex: 50, height: 144, width: '28rem', transform: 'translateY(-50%)', borderRadius: '50%', background: 'var(--xh-primary)', opacity: 0.3, filter: 'blur(48px)' }} />
        <motion.div
          initial={{ width: '8rem' }}
          whileInView={{ width: '16rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
          style={{ position: 'absolute', inset: 'auto', zIndex: 30, height: 144, width: 256, transform: 'translateY(-96px)', borderRadius: '50%', background: 'var(--xh-primary)', filter: 'blur(32px)', opacity: 0.5 }}
        />
        <motion.div
          initial={{ width: '15rem' }}
          whileInView={{ width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
          style={{ position: 'absolute', inset: 'auto', zIndex: 50, height: 2, width: '30rem', transform: 'translateY(-112px)', background: 'var(--xh-primary)' }}
        />

        {/* Top mask */}
        <div style={{ position: 'absolute', inset: 'auto', zIndex: 40, height: 176, width: '100%', transform: 'translateY(-200px)', background: 'var(--lamp-bg, var(--xh-bg))' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 50, display: 'flex', transform: 'translateY(-320px)', flexDirection: 'column', alignItems: 'center', padding: '0 20px', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
