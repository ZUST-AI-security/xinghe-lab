import React, { useState } from 'react';
import { Button, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ImageUploader from '../CWAttack/components/ImageUploader';
import ParameterSlider from '../CWAttack/components/ParameterSlider';
import ResultDisplay from '../CWAttack/components/ResultDisplay';
import AttackLayout from '../shared/AttackLayout';
import { ATTACK_MODEL } from '../shared/constants';
import { createImageHandler } from '../shared/utils';
import useFGSMAttack from './hooks/useFGSMAttack';
import { useAttackStore } from '../../../store/attackStore';

const { Text } = Typography;

const DEFAULT_PARAMS = { epsilon: 0.03, targeted: false };

const FGSMAttack = () => {
  const storeSlice = useAttackStore((s) => s.fgsm);
  const updateSlice = useAttackStore((s) => s.updateSlice);
  const resetSlice = useAttackStore((s) => s.resetSlice);

  const [imageUrl, setImageUrl] = useState(null);
  const [useAsync, setUseAsync] = useState(storeSlice.useAsync);
  const [params, setParams] = useState(storeSlice.params);

  const {
    loading, progress, result, error, setError, status,
    runAttack, runSyncAttack, cancel, reset, saveResult, exportData,
    isRunning, canCancel,
  } = useFGSMAttack();

  const handleImageChange = createImageHandler(setImageUrl);

  const handleParamsChange = (newParams) => {
    setParams(newParams);
    updateSlice('fgsm', { params: newParams });
  };

  const handleRun = () => {
    if (!imageUrl) return;
    const data = { image: imageUrl, model_name: ATTACK_MODEL, params };
    (useAsync ? runAttack : runSyncAttack)(data);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(DEFAULT_PARAMS);
    resetSlice('fgsm');
    reset();
  };

  return (
    <AttackLayout
      name="FGSM 攻击算法"
      tooltip="Fast Gradient Sign Method：沿着损失函数梯度方向一步添加扰动，快速生成对抗样本"
      description="最基础的对抗攻击算法，只需一步计算即可生成对抗样本，适合入门学习。"
      status={status}
      useAsync={useAsync}
      onAsyncChange={(v) => { setUseAsync(v); updateSlice('fgsm', { useAsync: v }); }}
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
      resultPanel={<ResultDisplay result={result} originalImageUrl={imageUrl} onSaveResult={() => saveResult('FGSM')} onExportData={exportData} loading={loading} />}
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>目标图片</Text>
        <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
      </div>

      <ParameterSlider
        label="扰动上限 epsilon"
        description="每个像素允许修改的最大幅度。"
        tips="值越大攻击越容易成功，但图片变化也越明显。常用范围 0.01 - 0.1。"
        value={params.epsilon}
        onChange={(v) => handleParamsChange({ ...params, epsilon: v })}
        range={{ min: 0, max: 0.2 }}
        step={0.001}
        disabled={isRunning}
      />

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>攻击模式</Text>
        <Tag color={params.targeted ? 'purple' : 'blue'} onClick={() => handleParamsChange({ ...params, targeted: !params.targeted })} style={{ cursor: 'pointer' }}>
          {params.targeted ? '定向攻击' : '非定向攻击'}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          {params.targeted ? '让模型误分类为指定目标类别' : '只要让模型分类出错即可'}
        </Text>
      </div>
    </AttackLayout>
  );
};

export default FGSMAttack;
