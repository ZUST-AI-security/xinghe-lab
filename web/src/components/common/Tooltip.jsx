import React, { useState } from 'react';

/**
 * 科技感工具提示组件 - 悬浮显示详细信息
 */
const Tooltip = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      
      {visible && (
        <div 
          className={`
            absolute z-[100] px-3 py-2 text-xs font-medium text-white
            bg-space-800 border border-white/10 rounded-lg shadow-glass
            whitespace-nowrap animate-float
            ${positionClasses[position]}
          `}
        >
          <div className="relative">
            {content}
            {/* 小箭头装饰 */}
            <div className={`
              absolute w-2 h-2 bg-space-800 border-r border-b border-white/10 rotate-45
              ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
              ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
            `} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
