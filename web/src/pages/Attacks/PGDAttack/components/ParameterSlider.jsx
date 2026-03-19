import React from 'react';
import { Slider, InputNumber, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ParameterSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
  formatValue = (v) => v,
  unit = '',
  disabled = false
}) => {
  const displayLabel = label.replace('_', ' ').toUpperCase();
  
  return (
    <div style={{ marginBottom: 24 }}>
      <Space style={{ marginBottom: 8 }}>
        <Text strong>{displayLabel}</Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        )}
      </Space>
      <Space style={{ width: '100%' }}>
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{ flex: 1 }}
          tipFormatter={(v) => `${formatValue(v)}${unit}`}
        />
        <InputNumber
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{ width: 80 }}
          formatter={(v) => `${formatValue(v)}${unit}`}
          parser={(v) => parseFloat(v.replace(unit, '')) / (unit === '/255' ? 1 : 1)}
        />
      </Space>
    </div>
  );
};

export default ParameterSlider;