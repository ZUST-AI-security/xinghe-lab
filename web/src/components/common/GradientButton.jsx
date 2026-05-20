import React from 'react';
import { Button } from 'antd';

/**
 * 炫酷渐变按钮 - 已重构为 Ant Design
 */
const GradientButton = ({
  onClick,
  disabled = false,
  loading = false,
  children,
  variant = 'primary',
  style = {}
}) => {
  const gradients = {
    primary: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
    secondary: 'linear-gradient(135deg, #722ed1 0%, #2f54eb 100%)',
    danger: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
  };

  return (
    <Button
      type="primary"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 12,
        fontWeight: 'bold',
        background: gradients[variant] || gradients.primary,
        border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        ...style
      }}
    >
      {children}
    </Button>
  );
};

export default GradientButton;
