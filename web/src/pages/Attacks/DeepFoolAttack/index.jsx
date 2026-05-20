import React, { useState } from 'react';
import { Button, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ImageUploader from '../CWAttack/components/ImageUploader';
import ParameterSlider from '../CWAttack/components/ParameterSlider';
import ResultDisplay from '../CWAttack/components/ResultDisplay';
import AttackLayout from '../shared/AttackLayout';
import { ATTACK_MODEL } from '../shared/constants';
import { createImageHandler } from '../shared/utils';
import useDeepFoolAttack from './hooks/useDeepFoolAttack';
import { useAttackStore } from '../../../store/attackStore';

const { Text } = Typography;

const DEFAULT_PARAMS = { max_iter: 50, overshoot: 0.02, num_classes: 10 };

const DeepFoolAttack = () => {
  const storeSlice = useAttackStore((s) => s.deepfool);
  const updateSlice = useAttackStore((s) => s.updateSlice);
  const resetSlice = useAttackStore((s) => s.resetSlice);

  const [imageUrl, setImageUrl] = useState(null);
  const [useAsync, setUseAsync] = useState(storeSlice.useAsync);
  const [params, setParams] = useState(storeSlice.params);

  const {
    loading, progress, result, error, setError, status,
    runAttack, runSyncAttack, cancel, reset, saveResult, exportData,
    isRunning, canCancel,
  } = useDeepFoolAttack();

  const handleImageChange = createImageHandler(setImageUrl);

  const handleParamsChange = (newParams) => {
    setParams(newParams);
    updateSlice('deepfool', { params: newParams });
  };

  const handleRun = () => {
    if (!imageUrl) return;
    const data = { image: imageUrl, model_name: ATTACK_MODEL, params };
    (useAsync ? runAttack : runSyncAttack)(data);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(DEFAULT_PARAMS);
    resetSlice('deepfool');
    reset();
  };

  return (
    <AttackLayout
      name="DeepFool 攻击算法"
      tooltip="DeepFool：自动寻找离原始图片最近的分类边界，以最小改动翻转预测结果"
      description="以最小改动欺骗模型：自动找到最近的分类边界并越过它，生成的对抗样本几乎看不出变化。"
      status={status}
      useAsync={useAsync}
      onAsyncChange={(v) => { setUseAsync(v); updateSlice('deepfool', { useAsync: v }); }}
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
      resultPanel={<ResultDisplay result={result} originalImageUrl={imageUrl} onSaveResult={() => saveResult('DeepFool')} onExportData={exportData} loading={loading} />}
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>目标图片</Text>
        <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
      </div>

      <ParameterSlider
        label="最大迭代次数"
        description="寻找分类边界的最大尝试次数。"
        tips="一般 50 次已足够找到边界，增大可能略微减小扰动量但耗时更长。"
        value={params.max_iter}
        onChange={(v) => handleParamsChange({ ...params, max_iter: v })}
        range={{ min: 1, max: 200 }}
        step={1}
        disabled={isRunning}
      />

      <ParameterSlider
        label="过冲系数 overshoot"
        description="越过分类边界后多走一步的比例。"
        tips="越小扰动越精确，越大攻击成功率越高。默认 0.02 通常够用。"
        value={params.overshoot}
        onChange={(v) => handleParamsChange({ ...params, overshoot: v })}
        range={{ min: 0.001, max: 0.1 }}
        step={0.001}
        disabled={isRunning}
      />

      <ParameterSlider
        label="候选类别数"
        description="同时考虑多少个可能的分类结果。"
        tips="考虑更多类别可能找到更小的扰动，但计算量会增大。"
        value={params.num_classes}
        onChange={(v) => handleParamsChange({ ...params, num_classes: v })}
        range={{ min: 2, max: 20 }}
        step={1}
        disabled={isRunning}
      />
    </AttackLayout>
  );
};

export default DeepFoolAttack;
