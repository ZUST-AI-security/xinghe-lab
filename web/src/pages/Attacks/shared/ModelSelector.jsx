/**
 * 攻击页通用 - 目标模型选择器
 * 自动按当前算法支持的任务类型禁用不兼容的模型选项
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { getAvailableModels } from '../../../api/models';

const { Text } = Typography;

const FALLBACK_MODELS = [
  { id: 'resnet100_imagenet', display_name: 'ResNet152 (ImageNet)', model_type: 'classification' },
  { id: 'yolov8', display_name: 'YOLOv8 (COCO)', model_type: 'detection' },
];

const FALLBACK_TYPE_BY_ID = {
  resnet100_imagenet: 'classification',
  yolov8: 'detection',
};

/**
 * @param {object} props
 * @param {string} props.value                当前模型 id
 * @param {(id: string) => void} props.onChange
 * @param {string[]} [props.supportedTaskTypes]  当前算法支持的任务类型（默认 classification）
 * @param {boolean} [props.disabled]
 * @param {(model: object|undefined) => React.ReactNode} [props.renderHint]  自定义命中模型提示
 */
const ModelSelector = ({
  value,
  onChange,
  supportedTaskTypes = ['classification'],
  disabled = false,
  renderHint,
}) => {
  const [models, setModels] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAvailableModels();
        if (cancelled) return;
        const list = (data?.models || []).map((m) => ({
          ...m,
          model_type: m.model_type || FALLBACK_TYPE_BY_ID[m.id] || 'classification',
        }));
        setModels(list.length ? list : FALLBACK_MODELS);
      } catch {
        if (!cancelled) setModels(FALLBACK_MODELS);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentModel = useMemo(
    () => models.find((m) => m.id === value),
    [models, value]
  );

  const isCompatible = (m) => supportedTaskTypes.includes(m.model_type || 'classification');

  const options = models.map((m) => ({
    value: m.id,
    disabled: !isCompatible(m),
    label: (
      <Space>
        <span>{m.display_name || m.id}</span>
        <Tag color={m.model_type === 'detection' ? 'orange' : 'blue'}>
          {m.model_type === 'detection' ? '目标检测' : '图像分类'}
        </Tag>
        {!isCompatible(m) && (
          <Tooltip title="当前算法不支持该任务类型，请选其他模型或切换算法">
            <Tag color="default">算法不兼容</Tag>
          </Tooltip>
        )}
      </Space>
    ),
  }));

  // 如果当前选中模型与算法不兼容，自动切换到第一个兼容模型
  useEffect(() => {
    if (!models.length) return;
    if (currentModel && isCompatible(currentModel)) return;
    const first = models.find(isCompatible);
    if (first && first.id !== value) {
      onChange?.(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, supportedTaskTypes]);

  const isDetectionTask = (currentModel?.model_type || 'classification') === 'detection';

  return (
    <div style={{ marginBottom: 24 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        目标模型
        <Tooltip title="选择被攻击的模型；YOLO 走 vanish 攻击（让目标检测框消失），ImageNet 走标准对抗攻击。算法不支持的模型会被禁用。">
          <InfoCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
        </Tooltip>
      </Text>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        disabled={disabled}
        options={options}
      />

      {renderHint
        ? renderHint(currentModel)
        : isDetectionTask && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="检测攻击模式"
            description="将通过最小化目标置信度让 YOLO 检测框消失或类别变化。"
          />
        )}
    </div>
  );
};

export default ModelSelector;
