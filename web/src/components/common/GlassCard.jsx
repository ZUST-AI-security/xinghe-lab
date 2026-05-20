import React from 'react';

/**
 * 玻璃态卡片组件 - 所有面板的基础
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子元素
 * @param {string} props.className - 额外的类名
 * @param {string} props.title - 卡片标题
 * @param {boolean} props.hoverEffect - 是否启用悬停发光效果
 */
const GlassCard = ({
  children,
  className = '',
  title,
  hoverEffect = true,
  glowColor = 'cyan' // cyan, blue, purple
}) => {
  const glowClasses = {
    cyan: 'hover:shadow-neon-cyan/10',
    blue: 'hover:shadow-neon-blue/10',
    purple: 'hover:shadow-neon-purple/10'
  };

  return (
    <div
      className={`
        glass
        rounded-2xl p-6
        shadow-glass
        transition-all duration-500
        ${hoverEffect ? glowClasses[glowColor] : ''}
        hover:border-space-600
        ${className}
      `}
    >
      {/* 顶部装饰光条 */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {title && (
        <h3 className="text-lg font-bold mb-6 neon-text flex items-center gap-2">
          <span className="w-1 h-5 bg-neon-cyan rounded-full animate-pulse" />
          {title}
        </h3>
      )}

      {children}

      {/* 底部微光 */}
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-neon-cyan/5 to-transparent pointer-events-none" />
    </div>
  );
};

export default GlassCard;