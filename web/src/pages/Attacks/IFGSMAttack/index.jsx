import React, { useState } from 'react';
import { Button, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ImageUploader from '../CWAttack/components/ImageUploader';
import ParameterSlider from '../CWAttack/components/ParameterSlider';
import ResultDisplay from '../CWAttack/components/ResultDisplay';
import AttackLayout from '../shared/AttackLayout';
import { ATTACK_MODEL } from '../shared/constants';
import { createImageHandler } from '../shared/utils';
import useIFGSMAttack from './hooks/useIFGSMAttack';
import { useAttackStore } from '../../../store/attackStore';

const { Text } = Typography;

const DEFAULT_PARAMS = { epsilon: 0.03, alpha: 0.01, num_iterations: 10, targeted: false };

const IFGSMAttack = () => {
  const storeSlice = useAttackStore((s) => s.ifgsm);
  const updateSlice = useAttackStore((s) => s.updateSlice);
  const resetSlice = useAttackStore((s) => s.resetSlice);

  const [imageUrl, setImageUrl] = useState(null);
  const [useAsync, setUseAsync] = useState(storeSlice.useAsync);
  const [params, setParams] = useState(storeSlice.params);

  const {
    loading, progress, result, error, setError, status,
    runAttack, runSyncAttack, cancel, reset, saveResult, exportData,
    isRunning, canCancel,
  } = useIFGSMAttack();

  const handleImageChange = createImageHandler(setImageUrl);

  const handleParamsChange = (newParams) => {
    setParams(newParams);
    updateSlice('ifgsm', { params: newParams });
  };

  const handleRun = () => {
    if (!imageUrl) return;
    const data = { image: imageUrl, model_name: ATTACK_MODEL, params };
    (useAsync ? runAttack : runSyncAttack)(data);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(DEFAULT_PARAMS);
    resetSlice('ifgsm');
    reset();
  };

  return (
    <AttackLayout
      name="I-FGSM 攻击算法"
      tooltip="Iterative FGSM：将 FGSM 拆成多步小扰动迭代执行，攻击效果更精细"
      description="FGSM 的迭代升级版：分成多步小幅修改，每步都控制在扰动上限内，攻击更隐蔽。"
      status={status}
      useAsync={useAsync}
      onAsyncChange={(v) => { setUseAsync(v); updateSlice('ifgsm', { useAsync: v }); }}
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
      resultPanel={<ResultDisplay result={result} originalImageUrl={imageUrl} onSaveResult={() => saveResult('I-FGSM')} onExportData={exportData} loading={loading} />}
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>目标图片</Text>
        <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
      </div>

      <ParameterSlider
        label="扰动上限 epsilon"
        description="每次像素修改的最大幅度。"
        tips="值越大攻击越容易成功，但图片变化也越明显。"
        value={params.epsilon}
        onChange={(v) => handleParamsChange({ ...params, epsilon: v })}
        range={{ min: 0, max: 0.2 }}
        step={0.001}
        disabled={isRunning}
      />

      <ParameterSlider
        label="步长 alpha"
        description="每次迭代的修改步幅。"
        tips="一般设为扰动上限除以迭代次数，例如 epsilon=0.03、迭代10次时取 0.003。"
        value={params.alpha}
        onChange={(v) => handleParamsChange({ ...params, alpha: v })}
        range={{ min: 0.001, max: 0.1 }}
        step={0.001}
        disabled={isRunning}
      />

      <ParameterSlider
        label="迭代次数"
        description="I-FGSM 的迭代步数。"
        tips="更多迭代可能获得更强攻击效果，但耗时增加。"
        value={params.num_iterations}
        onChange={(v) => handleParamsChange({ ...params, num_iterations: v })}
        range={{ min: 1, max: 100 }}
        step={1}
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

export default IFGSMAttack;
