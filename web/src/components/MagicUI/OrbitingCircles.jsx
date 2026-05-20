import React from 'react';

export default function OrbitingCircles({
  children,
  duration = 20,
  delay = 0,
  radius = 160,
  reverse = false,
  style,
  className,
}) {
  const items = React.Children.toArray(children);
  const count = items.length;
  const angleStep = 360 / count;

  return (
    <div className={className} style={{ position: 'relative', width: radius * 2, height: radius * 2, ...style }}>
      {/* Center glow ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: radius * 2, height: radius * 2,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: radius * 1.4, height: radius * 1.4,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.04)',
      }} />

      {items.map((child, i) => {
        const startAngle = angleStep * i;
        const animDuration = duration + i * 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 0, height: 0,
              animation: `orbit-${i} ${animDuration}s linear ${delay}s infinite ${reverse ? 'reverse' : 'normal'}`,
            }}
          >
            <div style={{
              display: 'grid', placeItems: 'center',
              width: 40, height: 40, marginLeft: -20, marginTop: -20,
            }}>
              {child}
            </div>
          </div>
        );
      })}
      <style>{items.map((_, i) => {
        const startAngle = angleStep * i;
        return `
          @keyframes orbit-${i} {
            from { transform: rotate(${startAngle}deg) translateX(${radius}px) rotate(-${startAngle}deg); }
            to { transform: rotate(${startAngle + 360}deg) translateX(${radius}px) rotate(-${startAngle + 360}deg); }
          }
        `;
      }).join('')}</style>
    </div>
  );
}
