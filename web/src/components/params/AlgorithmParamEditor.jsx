/**
 * AlgorithmParamEditor — 可视化参数控件组件
 *
 * 为每种对抗攻击算法渲染对应的 Ant Design 5 Slider + InputNumber 控件。
 * 参数越界时截断至边界值并通过 message.warning 提示用户。
 * onChange 回调实时同步父组件状态。
 *
 * 关联需求：Requirement 4
 */

import React, { useCallback } from 'react';
import { Col, InputNumber, Row, Select, Slider, Space, Typography, message } from 'antd';

const { Text } = Typography;

// ─── 各算法的参数规格定义 ────────────────────────────────────────────────────

const PARAM_SPECS = {
  fgsm: [
    {
      key: 'epsilon',
      label: 'epsilon（扰动上限）',
      min: 0.001,
      max: 0.3,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
  ],
  ifgsm: [
    {
      key: 'epsilon',
      label: 'epsilon（扰动上限）',
      min: 0.001,
      max: 0.3,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'alpha',
      label: 'alpha（单步步长）',
      min: 0.001,
      max: 0.05,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'num_iter',
      label: 'num_iter（迭代次数）',
      min: 1,
      max: 100,
      step: 1,
      precision: 0,
      type: 'int',
    },
  ],
  pgd: [
    {
      key: 'epsilon',
      label: 'epsilon（扰动上限）',
      min: 0.001,
      max: 0.3,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'alpha',
      label: 'alpha（单步步长）',
      min: 0.001,
      max: 0.05,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'num_iter',
      label: 'num_iter（迭代次数）',
      min: 1,
      max: 200,
      step: 1,
      precision: 0,
      type: 'int',
    },
    {
      key: 'norm',
      label: 'norm（范数类型）',
      type: 'select',
      options: [
        { value: 'linf', label: 'L∞ (linf)' },
        { value: 'l2', label: 'L2 (l2)' },
      ],
    },
  ],
  cw: [
    {
      key: 'c',
      label: 'c（权衡系数）',
      min: 0.001,
      max: 10,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'lr',
      label: 'lr（学习率）',
      min: 0.0001,
      max: 0.1,
      step: 0.0001,
      precision: 4,
      type: 'float',
    },
    {
      key: 'max_iter',
      label: 'max_iter（最大迭代次数）',
      min: 10,
      max: 1000,
      step: 1,
      precision: 0,
      type: 'int',
    },
    {
      key: 'binary_search_steps',
      label: 'binary_search_steps（二分搜索步数）',
      min: 1,
      max: 20,
      step: 1,
      precision: 0,
      type: 'int',
    },
  ],
  deepfool: [
    {
      key: 'overshoot',
      label: 'overshoot（过冲系数）',
      min: 0.001,
      max: 0.1,
      step: 0.001,
      precision: 3,
      type: 'float',
    },
    {
      key: 'max_iter',
      label: 'max_iter（最大迭代次数）',
      min: 10,
      max: 200,
      step: 1,
      precision: 0,
      type: 'int',
    },
    {
      key: 'num_classes',
      label: 'num_classes（候选类别数）',
      min: 2,
      max: 100,
      step: 1,
      precision: 0,
      type: 'int',
    },
  ],
};

// ─── 默认参数值 ──────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS = {
  fgsm: { epsilon: 0.03 },
  ifgsm: { epsilon: 0.03, alpha: 0.007, num_iter: 10 },
  pgd: { epsilon: 0.03, alpha: 0.01, num_iter: 40, norm: 'linf' },
  cw: { c: 0.1, lr: 0.01, max_iter: 500, binary_search_steps: 5 },
  deepfool: { overshoot: 0.02, max_iter: 50, num_classes: 10 },
};

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 将值截断至 [min, max] 范围，超界时触发 message.warning。
 */
const clampWithWarning = (key, value, min, max) => {
  if (value < min) {
    message.warning(`参数 ${key} 的值 ${value} 低于最小值 ${min}，已自动修正为 ${min}`);
    return min;
  }
  if (value > max) {
    message.warning(`参数 ${key} 的值 ${value} 超过最大值 ${max}，已自动修正为 ${max}`);
    return max;
  }
  return value;
};

// ─── 单个数值参数行（Slider + InputNumber） ──────────────────────────────────

const ParamRow = ({ spec, value, onChange, disabled }) => {
  const { key, label, min, max, step, precision, type } = spec;

  const handleChange = useCallback(
    (newValue) => {
      if (newValue === null || newValue === undefined || Number.isNaN(newValue)) return;
      const clamped = clampWithWarning(key, newValue, min, max);
      const final = type === 'int' ? Math.round(clamped) : clamped;
      onChange(key, final);
    },
    [key, min, max, type, onChange],
  );

  const safeValue = typeof value === 'number' ? value : min;

  return (
    <div style={{ marginBottom: 20 }}>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>
        {label}
      </Text>
      <Row gutter={12} align="middle">
        <Col flex="auto">
          <Slider
            min={min}
            max={max}
            step={step}
            value={safeValue}
            onChange={handleChange}
            disabled={disabled}
            tooltip={{ formatter: (v) => (type === 'int' ? String(v) : v.toFixed(precision)) }}
          />
        </Col>
        <Col>
          <InputNumber
            min={min}
            max={max}
            step={step}
            value={safeValue}
            precision={precision}
            onChange={handleChange}
            disabled={disabled}
            style={{ width: type === 'int' ? 90 : 110 }}
          />
        </Col>
      </Row>
    </div>
  );
};

// ─── 主组件 ──────────────────────────────────────────────────────────────────

/**
 * AlgorithmParamEditor
 *
 * @param {object}   props
 * @param {string}   props.algorithm  - 算法标识：fgsm | ifgsm | pgd | cw | deepfool
 * @param {object}   props.params     - 当前参数对象
 * @param {function} props.onChange   - (newParams: object) => void，实时回调
 * @param {boolean}  [props.disabled] - 是否禁用所有控件
 */
const AlgorithmParamEditor = ({ algorithm, params, onChange, disabled = false }) => {
  const specs = PARAM_SPECS[algorithm];

  const handleParamChange = useCallback(
    (key, value) => {
      onChange({ ...params, [key]: value });
    },
    [params, onChange],
  );

  if (!specs) {
    return (
      <Text type="secondary">未知算法：{algorithm}</Text>
    );
  }

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      {specs.map((spec) => {
        if (spec.type === 'select') {
          return (
            <div key={spec.key} style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                {spec.label}
              </Text>
              <Select
                value={params[spec.key]}
                options={spec.options}
                onChange={(value) => handleParamChange(spec.key, value)}
                disabled={disabled}
                style={{ width: '100%' }}
              />
            </div>
          );
        }

        return (
          <ParamRow
            key={spec.key}
            spec={spec}
            value={params[spec.key]}
            onChange={handleParamChange}
            disabled={disabled}
          />
        );
      })}
    </Space>
  );
};

export default AlgorithmParamEditor;
