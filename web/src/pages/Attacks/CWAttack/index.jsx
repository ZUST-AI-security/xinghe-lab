import React, { useState } from 'react';
import { App, Button, Divider, Space, Switch, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ParameterSlider from './components/ParameterSlider';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import AttackLayout from '../shared/AttackLayout';
import { ATTACK_MODEL } from '../shared/constants';
import { createImageHandler } from '../shared/utils';
import useCWAttack from './hooks/useCWAttack';
import { useAttackStore } from '../../../store/attackStore';

const { Text } = Typography;

const DEFAULT_PARAMS = {
  c: 0.1, kappa: 0, lr: 0.01, max_iter: 500,
  binary_search_steps: 5, init_const: 0.01,
  targeted: false, abort_early: true, early_stop_iters: 50,
};

const paramSpecs = {
  c: { label: '权衡系数 c', description: '扰动大小和攻击强度的平衡杠杆：c 越大攻击越强，但扰动也越大。', tips: '建议从 0.1 开始尝试，攻击不成功时逐步调大。', range: { min: 0.001, max: 1000 }, step: 0.1, isLogScale: true, unit: '' },
  kappa: { label: '置信度 kappa', description: '要求模型对错误分类的"确信程度"：值越大，模型越"确信"自己被欺骗了。', tips: '设为 0 表示只要分类改变即可，增大可获得更"确信"的对抗结果。', range: { min: 0, max: 50 }, step: 1, unit: '' },
  lr: { label: '学习率', description: '每次迭代调整图片的幅度：太大会震荡，太小会很慢。', tips: '如果损失忽大忽小，说明学习率太大，试着降低。', range: { min: 1e-5, max: 1e-1 }, step: 0.001, isLogScale: true, unit: '' },
  max_iter: { label: '最大迭代次数', description: '每轮优化最多尝试多少步。', tips: '建议先用 300-500 测试流程，确认可行后再加大。', range: { min: 100, max: 1000 }, step: 50, unit: '次' },
  binary_search_steps: { label: '二分搜索轮数', description: '自动搜索最佳权衡系数 c 的尝试次数。', tips: '轮数越多找到的 c 越优，但耗时成倍增加。', range: { min: 1, max: 20 }, step: 1, unit: '轮' },
  init_const: { label: '初始 c 值', description: '二分搜索的起点。', tips: '一般保持默认值，除非你想手动控制搜索范围。', range: { min: 1e-4, max: 10.0 }, step: 0.001, isLogScale: true, unit: '' },
  early_stop_iters: { label: '早停步数', description: '连续多少步没有改善就提前结束。', tips: '设小可节省时间，但太小可能错过更好的结果。', range: { min: 10, max: 200 }, step: 10, unit: '步' },
};

const presets = [
  { name: '默认参数', icon: 'A', params: DEFAULT_PARAMS },
  { name: '激进攻击', icon: 'B', params: { c: 10, kappa: 10, lr: 0.05, max_iter: 1000, binary_search_steps: 9, init_const: 0.1, targeted: false, abort_early: false, early_stop_iters: 100 } },
  { name: '隐蔽攻击', icon: 'C', params: { c: 0.01, kappa: 0, lr: 0.001, max_iter: 500, binary_search_steps: 5, init_const: 0.001, targeted: false, abort_early: true, early_stop_iters: 25 } },
  { name: '快速测试', icon: 'D', params: { c: 1.0, kappa: 0, lr: 0.02, max_iter: 200, binary_search_steps: 3, init_const: 0.1, targeted: false, abort_early: true, early_stop_iters: 20 } },
];

const CWAttack = () => {
  const { message } = App.useApp();
  const storeSlice = useAttackStore((s) => s.cw);
  const updateSlice = useAttackStore((s) => s.updateSlice);
  const resetSlice = useAttackStore((s) => s.resetSlice);

  const [imageUrl, setImageUrl] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(storeSlice.useAsync);
  const [params, setParams] = useState(storeSlice.params);

  const {
    loading, progress, result, error, setError, status, statusMessage,
    runAttack, runSyncAttack, cancel, reset, saveResult, exportData,
    isRunning, canCancel, hasResult,
  } = useCWAttack();

  const handleImageChange = createImageHandler(setImageUrl);

  const handleParamChange = (key, value) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    updateSlice('cw', { params: newParams });
  };

  const applyPreset = (preset) => {
    setParams(preset.params);
    updateSlice('cw', { params: preset.params });
    message.success(`已应用"${preset.name}"模板`);
  };

  const handleRun = () => {
    if (!imageUrl) { message.warning('请先上传图片'); return; }
    const data = { image: imageUrl, model_name: ATTACK_MODEL, params };
    (useAsync ? runAttack : runSyncAttack)(data);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(DEFAULT_PARAMS);
    resetSlice('cw');
    reset();
  };

  return (
    <AttackLayout
      name="C&W 攻击算法"
      tooltip="Carlini & Wagner：通过优化算法找到扰动最小的对抗样本，攻击质量高但耗时较长"
      description="优化型攻击算法：通过反复迭代找到最小改动方案，生成的对抗样本质量高，适合精细分析。"
      status={status}
      useAsync={useAsync}
      onAsyncChange={(v) => { setUseAsync(v); updateSlice('cw', { useAsync: v }); }}
      extraControls={<Switch checkedChildren="高级" unCheckedChildren="基础" checked={advancedMode} onChange={setAdvancedMode} size="small" />}
      cardExtra={<Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isRunning} size="small" />}
      isRunning={isRunning}
      loading={loading}
      progress={progress}
      progressMessage={statusMessage || (status === 'pending' ? '任务排队中，请稍候...' : '正在执行攻击，请耐心等待...')}
      error={error}
      onClearError={() => setError(null)}
      canCancel={canCancel}
      onCancel={cancel}
      imageUrl={imageUrl}
      onRun={handleRun}
      resultPanel={<ResultDisplay result={result} originalImageUrl={imageUrl} onSaveResult={() => saveResult('CW')} onExportData={() => exportData(result)} loading={loading} />}
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>目标图片</Text>
        <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>快速预设</Text>
        <Space wrap>
          {presets.map((preset) => (
            <Tag key={preset.name} icon={<span>{preset.icon}</span>} onClick={() => applyPreset(preset)} style={{ cursor: 'pointer' }} color={JSON.stringify(params) === JSON.stringify(preset.params) ? 'blue' : 'default'}>
              {preset.name}
            </Tag>
          ))}
        </Space>
      </div>

      <Divider orientation="left">攻击参数</Divider>

      {Object.entries(paramSpecs).map(([key, spec]) => {
        if (!advancedMode && key === 'early_stop_iters') return null;
        return (
          <ParameterSlider
            key={key}
            label={spec.label}
            description={spec.description}
            tips={spec.tips}
            value={params[key]}
            onChange={(v) => handleParamChange(key, v)}
            range={spec.range}
            step={spec.step}
            isLogScale={spec.isLogScale}
            unit={spec.unit}
            disabled={isRunning}
          />
        );
      })}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>定向攻击</Text>
          <Switch checked={params.targeted} onChange={(v) => handleParamChange('targeted', v)} disabled={isRunning} />
        </div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {params.targeted ? '让模型误分类为指定目标类别（当前由算法自动选择目标）' : '只要让模型分类出错即可'}
        </Text>
      </div>
    </AttackLayout>
  );
};

export default CWAttack;
