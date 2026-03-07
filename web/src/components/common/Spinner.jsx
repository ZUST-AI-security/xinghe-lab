import React from 'react';

/**
 * 科技感加载动画组件 - 霓虹环
 */
const Spinner = ({ size = 'medium', color = 'cyan' }) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    cyan: 'border-neon-cyan',
    blue: 'border-neon-blue',
    purple: 'border-neon-purple',
    white: 'border-white/30',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses[color]}
          rounded-full border-t-transparent
          animate-spin shadow-neon-cyan-sm
        `}
      />
    </div>
  );
};

export default Spinner;
