import React from 'react';
import { Slider, Space, Typography, Tooltip as AntTooltip, Flex } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 科技感滑块组件 - 已重构为 Ant Design
 */
const NeonSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.001,
  description = '',
  logarithmic = false
}) => {
  // 对数尺度转换
  const toLog = (val) => Math.log10(val);
  const fromLog = (val) => Math.pow(10, val);

  const sliderValue = logarithmic ? toLog(value) : value;
  const sliderMin = logarithmic ? toLog(min) : min;
  const sliderMax = logarithmic ? toLog(max) : max;

  const handleChange = (val) => {
    let newVal = val;
    if (logarithmic) {
      newVal = fromLog(val);
    }
    onChange(newVal);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Flex justify="space-between" align="center">
          <Space size={4}>
            {label && <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>}
            {description && (
              <AntTooltip title={description}>
                <InfoCircleOutlined style={{ color: 'rgba(0,0,0,0.3)', cursor: 'help' }} />
              </AntTooltip>
            )}
          </Space>
          <Text 
            strong 
            style={{ 
              fontFamily: 'monospace', 
              color: '#1890ff',
              background: 'rgba(24,144,255,0.1)',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 12
            }}
          >
            {typeof value === 'number' ? value.toFixed(logarithmic ? 4 : 3) : value}
          </Text>
        </Flex>

        <Slider
          min={sliderMin}
          max={sliderMax}
          step={logarithmic ? (sliderMax - sliderMin) / 1000 : step}
          value={sliderValue}
          onChange={handleChange}
          tooltip={{ open: false }}
          style={{ margin: '8px 0' }}
        />
        
        <Flex justify="space-between">
          <Text style={{ fontSize: 10, opacity: 0.3 }}>{min}</Text>
          <Text style={{ fontSize: 10, opacity: 0.3 }}>{max}</Text>
        </Flex>
      </Space>
    </div>
  );
};

export default NeonSlider;
