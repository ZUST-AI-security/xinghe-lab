import React from 'react';
import { Slider, InputNumber, Row, Col, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

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
      style={{ marginBottom: 20, position: 'relative', paddingLeft: 14 }}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 2, bottom: 2, width: 3,
        borderRadius: 2, background: 'linear-gradient(180deg, #1677ff, #7c3aed)',
        opacity: 0.3,
      }} />

      <Row align="middle" gutter={8} style={{ marginBottom: 6 }}>
        <Col flex="auto">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>
            {label}
            {description && (
              <Tooltip title={description}>
                <QuestionCircleOutlined style={{ marginLeft: 6, color: 'var(--xh-text-tertiary)', fontSize: 12 }} />
              </Tooltip>
            )}
          </span>
        </Col>
        <Col>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <InputNumber
              value={value} onChange={onChange} min={range.min} max={range.max}
              step={step} disabled={disabled}
              style={{ width: 88, borderRadius: '8px 0 0 8px', borderRight: 'none' }}
            />
            {unit && (
              <div style={{
                padding: '0 10px', height: 32, display: 'grid', placeItems: 'center',
                background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
                borderRadius: '0 8px 8px 0', fontSize: 12, color: 'var(--xh-text-tertiary)',
                fontWeight: 600,
              }}>
                {unit}
              </div>
            )}
          </div>
        </Col>
      </Row>

      <Slider
        value={sliderValue} onChange={handleSliderChange}
        min={sliderMin} max={sliderMax} step={isLogScale ? 0.01 : step}
        disabled={disabled} tooltip={{ formatter: null }}
        styles={{ track: { background: 'linear-gradient(90deg, #1677ff, #7c3aed)' } }}
      />

      {tips && (
        <div style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', lineHeight: 1.5, marginTop: 2 }}>
          {tips}
        </div>
      )}
    </motion.div>
  );
};

export default ParameterSlider;
