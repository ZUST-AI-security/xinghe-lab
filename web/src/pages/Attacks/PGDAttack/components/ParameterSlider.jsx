/**
 * PGD攻击参数滑块组件
 */

import React from 'react';
import { Slider, InputNumber, Row, Col, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ParameterSlider = ({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  unit = '',
  disabled = false
}) => {
  // 处理科学计数法显示
  const formatValue = (val) => {
    if (val < 0.001 && val > 0) {
      return val.toExponential(2);
    }
    return val;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Row align="middle" gutter={8}>
        <Col flex="auto">
          <Text strong>
            {label}
            {description && (
              <Tooltip title={description}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
              </Tooltip>
            )}
          </Text>
        </Col>
        <Col>
          <InputNumber
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            style={{ width: 110 }}
            addonAfter={unit}
            size="small"
          />
        </Col>
      </Row>
      
      <Row>
        <Col span={24}>
          <Slider
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            tooltip={{ formatter: formatValue }}
          />
        </Col>
      </Row>
      
      <Row>
        <Col span={24}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            范围: [{min}, {max}]
          </Text>
        </Col>
      </Row>
    </div>
  );
};

export default ParameterSlider;