import React from 'react';
import { Slider, InputNumber, Row, Col, Tooltip, Typography, Space } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;

const S = {
  group: { marginBottom: 24, position: 'relative' },
  icon: { marginLeft: 8, color: 'var(--xh-text-tertiary)' },
  compact: { width: 120 },
  input: { width: 80 },
  unit: { width: 40, textAlign: 'center', borderLeft: 'none', backgroundColor: 'var(--xh-bg)' },
  tips: { fontSize: 12 },
};

const ParameterSlider = ({
  label, description, tips, value, onChange, range, step = 0.01,
  isLogScale = false, unit = '', disabled = false,
}) => {
  const toLogValue = (v) => (isLogScale ? Math.log10(v) : v);
  const toLinearValue = (v) => (isLogScale ? Math.pow(10, v) : v);

  const handleSliderChange = (v) => onChange(isLogScale ? toLinearValue(v) : v);

  const sliderValue = isLogScale ? toLogValue(value) : value;
  const sliderMin = isLogScale ? toLogValue(range.min) : range.min;
  const sliderMax = isLogScale ? toLogValue(range.max) : range.max;

  return (
    <motion.div
      style={S.group}
      role="group"
      aria-labelledby={`param-${label}`}
      whileHover={{ scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        borderRadius: 2, background: 'var(--xh-primary)', opacity: 0.15,
      }} />
      <Row align="middle" gutter={8}>
        <Col flex="auto">
          <Text strong id={`param-${label}`}>
            {label}
            <Tooltip title={description}>
              <QuestionCircleOutlined style={S.icon} aria-hidden="true" />
            </Tooltip>
          </Text>
        </Col>
        <Col>
          <Space.Compact style={S.compact}>
            <InputNumber
              value={value} onChange={onChange} min={range.min} max={range.max}
              step={step} disabled={disabled} style={S.input} aria-label={`${label} 参数值`}
            />
            <InputNumber value={unit} disabled style={S.unit} />
          </Space.Compact>
        </Col>
      </Row>

      <Row>
        <Col span={24}>
          <Slider
            value={sliderValue} onChange={handleSliderChange}
            min={sliderMin} max={sliderMax} step={isLogScale ? 0.01 : step}
            disabled={disabled} tooltip={{ formatter: null }}
            styles={{ track: { background: 'var(--xh-primary)' } }}
          />
        </Col>
      </Row>

      {tips && (
        <Row>
          <Col span={24}>
            <Text type="secondary" style={S.tips}>{tips}</Text>
          </Col>
        </Row>
      )}
    </motion.div>
  );
};

export default ParameterSlider;
