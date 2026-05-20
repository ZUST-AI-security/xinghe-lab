/**
 * 星河智安 (XingHe ZhiAn) - 加载动画组件
 * 统一的加载状态展示组件
 */

import React from 'react';
import { Spin } from 'antd';

const LoadingSpin = ({ 
  size = 'default', 
  tip = '加载中...', 
  spinning = true, 
  children, 
  className = '',
  style = {},
}) => {
  return (
    <Spin
      size={size}
      tip={tip}
      spinning={spinning}
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        ...style,
      }}
    >
      {children}
    </Spin>
  );
};

// 页面级加载组件
export const PageLoading = ({ tip = '正在加载页面...' }) => (
  <div className="flex-center" style={{ minHeight: '400px' }}>
    <LoadingSpin size="large" tip={tip} />
  </div>
);

// 内容级加载组件
export const ContentLoading = ({ tip = '正在加载内容...', height = '300px' }) => (
  <LoadingSpin 
    size="default" 
    tip={tip} 
    style={{ height, width: '100%' }}
  />
);

// 按钮级加载组件
export const ButtonLoading = ({ tip = '处理中...' }) => (
  <LoadingSpin size="small" tip={tip} />
);

export default LoadingSpin;
