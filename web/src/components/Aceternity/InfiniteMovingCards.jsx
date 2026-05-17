import React, { useEffect, useRef, useState } from 'react';

export default function InfiniteMovingCards({
  items = [],
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  className,
}) {
  const containerRef = useRef(null);
  const scrollerRef = useRef(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        scrollerRef.current.appendChild(duplicatedItem);
      });
      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        '--animation-direction',
        direction === 'left' ? 'forwards' : 'reverse'
      );
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        '--animation-duration',
        speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
    >
      <ul
        ref={scrollerRef}
        style={{
          display: 'flex',
          gap: '1rem',
          padding: 0,
          margin: 0,
          listStyle: 'none',
          width: 'max-content',
          animation: start ? 'scroll var(--animation-duration) linear infinite var(--animation-direction)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (pauseOnHover && e.currentTarget) e.currentTarget.style.animationPlayState = 'paused';
        }}
        onMouseLeave={(e) => {
          if (pauseOnHover && e.currentTarget) e.currentTarget.style.animationPlayState = 'running';
        }}
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            style={{
              borderRadius: 16,
              border: '1px solid var(--xh-border)',
              background: 'var(--xh-surface)',
              padding: '24px 28px',
              minWidth: 280,
              maxWidth: 360,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <blockquote style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text)' }}>
                {item.quote}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                {item.icon && (
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'var(--xh-primary-soft, rgba(22,119,255,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--xh-text)' }}>
                    {item.name}
                  </div>
                  {item.title && (
                    <div style={{ fontSize: 12, color: 'var(--xh-text-secondary, #64748b)' }}>
                      {item.title}
                    </div>
                  )}
                </div>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes scroll {
          to { transform: translateX(calc(-50% - 0.5rem)); }
        }
      `}</style>
    </div>
  );
}
