/**
 * C&W攻击参数滑块组件
 * 支持线性/对数刻度，带参数说明
 */

import React from 'react';
import { Slider, InputNumber, Row, Col, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * @typedef {Object} ParameterSliderProps
 * @property {string} label - 参数标签
 * @property {string} description - 参数描述
 * @property {string} tips - 使用技巧
 * @property {number} value - 当前值
 * @property {function} onChange - 值变化回调
 * @property {Object} range - 取值范围 {min, max}
 * @property {number} step - 步长
 * @property {boolean} isLogScale - 是否使用对数刻度
 * @property {string} unit - 单位
 * @property {boolean} disabled - 是否禁用
 */

/**
 * 参数滑块组件
 * @param {ParameterSliderProps} props
 */
const ParameterSlider = ({
  label,
  description,
  tips,
  value,
  onChange,
  range,
  step = 0.01,
  isLogScale = false,
  unit = '',
  disabled = false
}) => {
  // 对数转换：线性值 -> 对数显示值
  const toLogValue = (linearValue) => {
    if (!isLogScale) return linearValue;
    return Math.log10(linearValue);
  };

  // 对数转换：对数显示值 -> 线性值
  const toLinearValue = (logValue) => {
    if (!isLogScale) return logValue;
    return Math.pow(10, logValue);
  };

  // 处理滑块变化
  const handleSliderChange = (newValue) => {
    if (isLogScale) {
      onChange(toLinearValue(newValue));
    } else {
      onChange(newValue);
    }
  };

  // 滑块的值和范围
  const sliderValue = isLogScale ? toLogValue(value) : value;
  const sliderMin = isLogScale ? toLogValue(range.min) : range.min;
  const sliderMax = isLogScale ? toLogValue(range.max) : range.max;

  return (
    <div style={{ marginBottom: 24 }}>
      <Row align="middle" gutter={8}>
        <Col flex="auto">
          <Text strong>
            {label}
            <Tooltip title={description}>
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Text>
        </Col>
        <Col>
          <InputNumber
            value={value}
            onChange={onChange}
            min={range.min}
            max={range.max}
            step={step}
            disabled={disabled}
            style={{ width: 120 }}
            addonAfter={unit}
          />
        </Col>
      </Row>
      
      <Row>
        <Col span={24}>
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            min={sliderMin}
            max={sliderMax}
            step={isLogScale ? 0.01 : step}
            disabled={disabled}
            tooltip={{ formatter: null }}
          />
        </Col>
      </Row>
      
      {tips && (
        <Row>
          <Col span={24}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 {tips}
            </Text>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ParameterSlider;
