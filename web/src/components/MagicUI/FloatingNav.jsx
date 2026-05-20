import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion';

export default function FloatingNav({
  navItems = [],
  logo,
  rightContent,
  scrollThreshold = 40,
  className,
  style,
  onNavClick,
  activeColor = '#60a5fa',
}) {
  const [scrolled, setScrolled] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const linksRef = useRef([]);
  const navRef = useRef(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > scrollThreshold);
  });

  // Scroll spy: detect which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = navItems.findIndex((item) => item.href === `#${entry.target.id}`);
            if (idx !== -1) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    navItems.forEach((item) => {
      if (item.href?.startsWith('#')) {
        const el = document.getElementById(item.href.slice(1));
        if (el) observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [navItems]);

  // Update pill position when activeIdx changes
  useEffect(() => {
    const el = linksRef.current[activeIdx];
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = el.getBoundingClientRect();
      setPillStyle({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
      });
    }
  }, [activeIdx]);

  const handleClick = (item, idx) => {
    setActiveIdx(idx);
    setMobileOpen(false);
    if (onNavClick) {
      onNavClick(item, idx);
    } else if (item.href?.startsWith('#')) {
      document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <motion.nav
          ref={navRef}
          className={className}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', height: 56,
            borderRadius: 9999,
            background: scrolled ? 'rgba(10,10,26,0.85)' : 'rgba(10,10,26,0.45)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: `1px solid ${scrolled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: scrolled
              ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 4px 24px rgba(0,0,0,0.15)',
            transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
            maxWidth: 'calc(100vw - 32px)',
            width: 'auto',
            ...style,
          }}
        >
        {/* Logo */}
        {logo && (
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', cursor: 'pointer', flexShrink: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {logo}
          </motion.div>
        )}

        {/* Nav links with pill indicator — desktop */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: '0 4px' }} className="nav-desktop">
          {/* Floating pill */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: pillStyle.left,
              width: pillStyle.width,
              height: '100%',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }}
          />

          {navItems.map((item, i) => (
            <motion.button
              key={item.label}
              ref={(el) => (linksRef.current[i] = el)}
              onClick={() => handleClick(item, i)}
              style={{
                position: 'relative',
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                background: 'transparent',
                fontSize: 14,
                fontWeight: activeIdx === i ? 600 : 500,
                color: activeIdx === i ? activeColor : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'color 0.25s ease',
                whiteSpace: 'nowrap',
              }}
              whileHover={{ color: '#fff' }}
              whileTap={{ scale: 0.95 }}
            >
              {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }} className="nav-desktop">
          {rightContent}
        </div>

        {/* Mobile hamburger */}
        <motion.button
          className="nav-mobile-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none', /* shown via CSS media query */
            padding: 10, borderRadius: 9999,
            border: 'none', background: 'transparent',
            cursor: 'pointer', color: '#fff',
          }}
          whileTap={{ scale: 0.9 }}
        >
          <div style={{ width: 20, height: 14, position: 'relative' }}>
            <motion.div animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, borderRadius: 1, background: '#fff' }} />
            <motion.div animate={mobileOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }} transition={{ duration: 0.2 }} style={{ position: 'absolute', top: 6, left: 0, width: '100%', height: 2, borderRadius: 1, background: '#fff' }} />
            <motion.div animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2, borderRadius: 1, background: '#fff' }} />
          </div>
        </motion.button>
      </motion.nav>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="nav-mobile-menu"
            style={{
              position: 'fixed', top: 80, left: 16, right: 16,
              zIndex: 999,
              borderRadius: 20,
              background: 'rgba(10,10,26,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 8px',
              display: 'none', /* shown via CSS media query */
            }}
          >
            {navItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleClick(item, i)}
                style={{
                  display: 'block', width: '100%',
                  padding: '12px 16px', borderRadius: 10,
                  border: 'none',
                  background: activeIdx === i ? 'rgba(96,165,250,0.1)' : 'transparent',
                  color: activeIdx === i ? activeColor : 'rgba(255,255,255,0.6)',
                  fontSize: 14, fontWeight: activeIdx === i ? 600 : 500,
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                {item.icon && <span style={{ marginRight: 8 }}>{item.icon}</span>}
                {item.label}
              </motion.button>
            ))}
            {rightContent && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, display: 'flex', gap: 8 }}>
                {rightContent}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive CSS */}
      <style>{`
        .nav-desktop { display: flex !important; }
        .nav-mobile-btn { display: none !important; }
        .nav-mobile-menu { display: none !important; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .nav-mobile-menu { display: block !important; }
        }
      `}</style>
    </>
  );
}
