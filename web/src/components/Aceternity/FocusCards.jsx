import React, { useState } from 'react';

export default function FocusCards({ cards, renderItem, className, style }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className={className} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, ...style }}>
      {cards.map((card, index) => (
        <div
          key={card.key || index}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            transition: 'all 0.3s ease-out',
            filter: hovered !== null && hovered !== index ? 'blur(4px) scale(0.98)' : 'none',
            opacity: hovered !== null && hovered !== index ? 0.7 : 1,
          }}
        >
          {renderItem ? renderItem(card, index, hovered === index) : card}
        </div>
      ))}
    </div>
  );
}
