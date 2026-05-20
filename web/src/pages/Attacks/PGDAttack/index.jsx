import React, { useState } from 'react';
import { Button, Space, Switch, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ImageUploader from '../CWAttack/components/ImageUploader';
import ParameterSlider from '../CWAttack/components/ParameterSlider';
import ResultDisplay from '../CWAttack/components/ResultDisplay';
import AttackLayout from '../shared/AttackLayout';
import { ATTACK_MODEL } from '../shared/constants';
import { createImageHandler } from '../shared/utils';
import usePGDAttack from './hooks/usePGDAttack';
import { useAttackStore } from '../../../store/attackStore';

const { Text } = Typography;

const DEFAULT_PARAMS = { epsilon: 0.03, alpha: 0.01, num_iter: 40, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' };

const paramSpecs = {
  epsilon: { label: '扰动上限 epsilon', description: '每个像素允许修改的最大幅度。', tips: 'ImageNet 演示常用 0.01 - 0.05，值越大攻击越强但图片变化越明显。', range: { min: 0.001, max: 0.5 }, step: 0.001, unit: '' },
  alpha: { label: '步长 alpha', description: '每次迭代的修改幅度。', tips: '一般取扰动上限的 1/5 到 1/10，例如 epsilon=0.03 时取 0.005。', range: { min: 0.0001, max: 0.1 }, step: 0.0001, unit: '' },
  num_iter: { label: '迭代次数', description: '重复修改图片的轮数。', tips: '轮数越多攻击越精细，但耗时也更长。演示用 20 - 50 轮即可。', range: { min: 5, max: 200 }, step: 1, unit: '次' },
};

const presets = [
  { name: '默认参数', params: DEFAULT_PARAMS },
  { name: '高成功率', params: { epsilon: 0.05, alpha: 0.01, num_iter: 60, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' } },
  { name: '低扰动', params: { epsilon: 0.015, alpha: 0.005, num_iter: 30, targeted: false, random_start: true, loss_type: 'dlr', norm: 'l2' } },
];

const PGDAttack = () => {
  const storeSlice = useAttackStore((s) => s.pgd);
  const updateSlice = useAttackStore((s) => s.updateSlice);
  const resetSlice = useAttackStore((s) => s.resetSlice);

  const [imageUrl, setImageUrl] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(storeSlice.useAsync);
  const [params, setParams] = useState(storeSlice.params);

  const {
    loading, progress, result, error, setError, status,
    runAttack, runSyncAttack, cancel, reset, saveResult, exportData,
    isRunning, canCancel,
  } = usePGDAttack();

  const handleImageChange = createImageHandler(setImageUrl);

  const handleParamsChange = (newParams) => {
    setParams(newParams);
    updateSlice('pgd', { params: newParams });
  };

  const handleRun = () => {
    if (!imageUrl) return;
    const data = { image: imageUrl, model_name: ATTACK_MODEL, params };
    (useAsync ? runAttack : runSyncAttack)(data);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(presets[0].params);
    resetSlice('pgd');
    reset();
  };

  return (
    <AttackLayout
      name="PGD 攻击算法"
      tooltip="Projected Gradient Descent：多步迭代攻击，每步将扰动投影回允许范围内，是目前最常用的攻击基准"
      description="多步迭代攻击算法，每步更新后自动裁剪到扰动上限内，攻击效果稳定，常作为基准对比。"
      status={status}
      useAsync={useAsync}
      onAsyncChange={(v) => { setUseAsync(v); updateSlice('pgd', { useAsync: v }); }}
      extraControls={<Switch checkedChildren="高级" unCheckedChildren="基础" checked={advancedMode} onChange={setAdvancedMode} size="small" />}
      cardExtra={<Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isRunning} size="small" />}
      isRunning={isRunning}
      loading={loading}
      progress={progress}
      error={error}
      onClearError={() => setError(null)}
      canCancel={canCancel}
      onCancel={cancel}
      imageUrl={imageUrl}
      onRun={handleRun}
      resultPanel={<ResultDisplay result={result} originalImageUrl={imageUrl} onSaveResult={() => saveResult('PGD')} onExportData={exportData} loading={loading} />}
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>目标图片</Text>
        <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>快速预设</Text>
        <Space wrap>
          {presets.map((preset) => (
            <Tag key={preset.name} style={{ cursor: 'pointer' }} onClick={() => handleParamsChange(preset.params)} color={JSON.stringify(params) === JSON.stringify(preset.params) ? 'blue' : 'default'}>
              {preset.name}
            </Tag>
          ))}
        </Space>
      </div>

      {Object.entries(paramSpecs).map(([key, spec]) => (
        <ParameterSlider
          key={key}
          label={spec.label}
          description={spec.description}
          tips={spec.tips}
          value={params[key]}
          onChange={(v) => handleParamsChange({ ...params, [key]: v })}
          range={spec.range}
          step={spec.step}
          unit={spec.unit}
          disabled={isRunning}
        />
      ))}

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>攻击模式</Text>
        <Space wrap>
          <Tag color={params.targeted ? 'purple' : 'blue'} onClick={() => handleParamsChange({ ...params, targeted: !params.targeted })} style={{ cursor: 'pointer' }}>
            {params.targeted ? '定向攻击' : '非定向攻击'}
          </Tag>
          <Tag color={params.random_start ? 'green' : 'default'} onClick={() => handleParamsChange({ ...params, random_start: !params.random_start })} style={{ cursor: 'pointer' }}>
            {params.random_start ? '随机初始化开启' : '随机初始化关闭'}
          </Tag>
          {advancedMode && (
            <>
              <Tag color={params.norm === 'linf' ? 'geekblue' : 'default'} onClick={() => handleParamsChange({ ...params, norm: 'linf' })} style={{ cursor: 'pointer' }}>Linf</Tag>
              <Tag color={params.norm === 'l2' ? 'geekblue' : 'default'} onClick={() => handleParamsChange({ ...params, norm: 'l2' })} style={{ cursor: 'pointer' }}>L2</Tag>
              <Tag color={params.loss_type === 'ce' ? 'gold' : 'default'} onClick={() => handleParamsChange({ ...params, loss_type: 'ce' })} style={{ cursor: 'pointer' }}>CE Loss</Tag>
              <Tag color={params.loss_type === 'dlr' ? 'gold' : 'default'} onClick={() => handleParamsChange({ ...params, loss_type: 'dlr' })} style={{ cursor: 'pointer' }}>DLR Loss</Tag>
            </>
          )}
        </Space>
      </div>
    </AttackLayout>
  );
};

export default PGDAttack;
