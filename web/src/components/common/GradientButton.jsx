import React from 'react';
import Spinner from './Spinner';

/**
 * 炫酷渐变按钮 - 带扫光动画
 * @param {Object} props
 * @param {Function} props.onClick - 点击事件
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 加载状态
 * @param {React.ReactNode} props.children - 按钮文字
 * @param {string} props.variant - 'primary' | 'secondary' | 'danger'
 */
const GradientButton = ({
  onClick,
  disabled = false,
  loading = false,
  children,
  variant = 'primary',
  className = ''
}) => {
  const variants = {
    primary: 'from-neon-cyan to-neon-blue',
    secondary: 'from-neon-purple to-neon-pink',
    danger: 'from-red-500 to-pink-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative group w-full py-3 px-6 rounded-xl font-bold text-white tracking-wide
        overflow-hidden transition-all duration-300 transform
        ${disabled
          ? 'bg-space-700 text-gray-500 cursor-not-allowed'
          : `bg-gradient-to-r ${variants[variant]} hover:scale-[1.02] active:scale-95`
        }
        ${!disabled && 'hover:shadow-neon-cyan'}
        ${className}
      `}
    >
      {/* 背景扫光动画 */}
      {!disabled && (
        <>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan" />
        </>
      )}

      {/* 按钮边框发光 */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${!disabled && 'shadow-[0_0_15px_rgba(0,229,255,0.5)]'}
      `} />

      {/* 内容 */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? <Spinner /> : children}
      </span>

      {/* 角落装饰点 */}
      <div className="absolute top-1 left-1 w-1 h-1 bg-white/30 rounded-full" />
      <div className="absolute bottom-1 right-1 w-1 h-1 bg-white/30 rounded-full" />
    </button>
  );
};

export default GradientButton;