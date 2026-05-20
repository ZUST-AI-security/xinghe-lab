import React, { useRef, useEffect } from 'react';

const KEYFRAMES = `
@keyframes bga-move1 {
  0%,100% { transform: translate(0,0) scale(1); }
  25% { transform: translate(50px,-30px) scale(1.1); }
  50% { transform: translate(-20px,40px) scale(0.95); }
  75% { transform: translate(30px,20px) scale(1.05); }
}
@keyframes bga-move2 {
  0%,100% { transform: translate(0,0) scale(1); }
  25% { transform: translate(-40px,50px) scale(1.08); }
  50% { transform: translate(60px,-20px) scale(0.92); }
  75% { transform: translate(-30px,-40px) scale(1.12); }
}
@keyframes bga-move3 {
  0%,100% { transform: translate(0,0) scale(1); }
  25% { transform: translate(30px,60px) scale(0.9); }
  50% { transform: translate(-50px,-30px) scale(1.15); }
  75% { transform: translate(40px,-50px) scale(0.95); }
}
@keyframes bga-move4 {
  0%,100% { transform: translate(0,0) scale(1); }
  25% { transform: translate(-60px,-40px) scale(1.1); }
  50% { transform: translate(40px,50px) scale(0.88); }
  75% { transform: translate(-20px,30px) scale(1.05); }
}
@keyframes bga-move5 {
  0%,100% { transform: translate(0,0) scale(1); }
  25% { transform: translate(40px,-60px) scale(1.12); }
  50% { transform: translate(-30px,20px) scale(0.9); }
  75% { transform: translate(50px,40px) scale(1.08); }
}
`;

const ANIMS = [
  { name: 'bga-move1', dur: '20s' },
  { name: 'bga-move2', dur: '24s' },
  { name: 'bga-move3', dur: '18s' },
  { name: 'bga-move4', dur: '22s' },
  { name: 'bga-move5', dur: '26s' },
];

export default function BackgroundGradientAnimation({
  gradientBackgroundStart = 'rgb(108, 0, 162)',
  gradientBackgroundEnd = 'rgb(0, 17, 82)',
  firstColor = '18, 113, 255',
  secondColor = '221, 74, 255',
  thirdColor = '100, 220, 255',
  fourthColor = '200, 50, 50',
  fifthColor = '180, 180, 50',
  pointerColor = '140, 100, 255',
  size = '80%',
  blendingValue = 'hard-light',
  interactive = true,
  children,
  className,
  style,
}) {
  const interactiveRef = useRef(null);
  const pos = useRef({ curX: 0, curY: 0, tgX: 0, tgY: 0 });
  const rafId = useRef(null);

  useEffect(() => {
    if (!interactive) return;
    const animate = () => {
      const p = pos.current;
      p.curX += (p.tgX - p.curX) / 20;
      p.curY += (p.tgY - p.curY) / 20;
      if (interactiveRef.current) {
        interactiveRef.current.style.transform = `translate(${Math.round(p.curX)}px, ${Math.round(p.curY)}px)`;
      }
      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [interactive]);

  const handleMouseMove = (e) => {
    if (!interactiveRef.current) return;
    const rect = interactiveRef.current.getBoundingClientRect();
    pos.current.tgX = e.clientX - rect.left;
    pos.current.tgY = e.clientY - rect.top;
  };

  const blobStyle = (color, anim, opacity = 1) => ({
    position: 'absolute',
    background: `radial-gradient(circle at center, rgba(${color}, 0.8) 0, rgba(${color}, 0) 50%) no-repeat`,
    mixBlendMode: blendingValue,
    width: size,
    height: size,
    top: `calc(50% - ${size} / 2)`,
    left: `calc(50% - ${size} / 2)`,
    opacity,
    animation: `${anim.name} ${anim.dur} ease-in-out infinite`,
    transformOrigin: 'center center',
    willChange: 'transform',
  });

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(40deg, ${gradientBackgroundStart}, ${gradientBackgroundEnd})`,
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'blur(40px)',
          zIndex: 1,
        }}
      >
        <div style={blobStyle(firstColor, ANIMS[0])} />
        <div style={{ ...blobStyle(secondColor, ANIMS[1]), transformOrigin: 'calc(50% - 400px) center' }} />
        <div style={{ ...blobStyle(thirdColor, ANIMS[2]), transformOrigin: 'calc(50% + 400px) center' }} />
        <div style={{ ...blobStyle(fourthColor, ANIMS[3], 0.7), transformOrigin: 'calc(50% - 200px) center' }} />
        <div style={{ ...blobStyle(fifthColor, ANIMS[4]), transformOrigin: 'calc(50% - 800px) calc(50% + 800px)' }} />
        {interactive && (
          <div
            ref={interactiveRef}
            onMouseMove={handleMouseMove}
            style={{
              position: 'absolute',
              background: `radial-gradient(circle at center, rgba(${pointerColor}, 0.8) 0, rgba(${pointerColor}, 0) 50%) no-repeat`,
              mixBlendMode: blendingValue,
              width: '100%',
              height: '100%',
              top: '-50%',
              left: '-50%',
              opacity: 0.7,
            }}
          />
        )}
      </div>
    </div>
  );
}
