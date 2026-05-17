import React, { createContext, useContext, useState, useRef } from 'react';

const MouseEnterContext = createContext(undefined);

export function CardContainer({ children, className, style, containerClassName }) {
  const containerRef = useRef(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    containerRef.current.style.transform = `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg)`;
  };

  const handleMouseEnter = () => {
    setIsMouseEntered(true);
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <MouseEnterContext.Provider value={isMouseEntered}>
      <div
        className={containerClassName}
        style={{
          perspective: '1000px',
          ...style,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={containerRef}
          className={className}
          style={{
            transition: isMouseEntered ? 'none' : 'all 0.5s ease',
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
}

export function CardBody({ children, className, style }) {
  return (
    <div
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardItem({
  children,
  className,
  style,
  translateZ = 0,
  as: Component = 'div',
  ...rest
}) {
  const isMouseEntered = useContext(MouseEnterContext);

  return (
    <Component
      className={className}
      style={{
        transform: isMouseEntered ? `translateZ(${translateZ}px)` : 'translateZ(0)',
        transition: isMouseEntered ? 'none' : 'all 0.5s ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
