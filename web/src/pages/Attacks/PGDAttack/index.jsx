import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import ImageUploader from '../CWAttack/components/ImageUploader';
import ParameterSlider from '../CWAttack/components/ParameterSlider';
import ResultDisplay from '../CWAttack/components/ResultDisplay';
import usePGDAttack from './hooks/usePGDAttack';
import QueueStatus from '../../../components/common/QueueStatus';

const { Title, Paragraph, Text } = Typography;

const PGDAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(true);
  const [params, setParams] = useState({
    epsilon: 0.03,
    alpha: 0.01,
    num_iter: 40,
    targeted: false,
    random_start: true,
    loss_type: 'ce',
    norm: 'linf',
  });

  const {
    loading,
    progress,
    result,
    error,
    setError,
    status,
    runAttack,
    runSyncAttack,
    cancel,
    reset,
    saveResult,
    exportData,
    isRunning,
    canCancel,
  } = usePGDAttack();

  const paramSpecs = {
    epsilon: {
      label: '扰动上限 epsilon',
      description: 'PGD 的最大扰动约束。',
      tips: '常见 ImageNet 演示范围是 0.01 - 0.05。',
      range: { min: 0.001, max: 0.5 },
      step: 0.001,
      unit: '',
    },
    alpha: {
      label: '步长 alpha',
      description: '每次迭代的更新步长。',
      tips: '通常取 epsilon 的 1/2 到 1/10。',
      range: { min: 0.0001, max: 0.1 },
      step: 0.0001,
      unit: '',
    },
    num_iter: {
      label: '迭代次数',
      description: 'PGD 迭代轮数。',
      tips: '同步模式会由后端自动截断到演示上限。',
      range: { min: 5, max: 200 },
      step: 1,
      unit: '次',
    },
  };

  const presets = [
    {
      name: '默认参数',
      params: { epsilon: 0.03, alpha: 0.01, num_iter: 40, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' },
    },
    {
      name: '高成功率',
      params: { epsilon: 0.05, alpha: 0.01, num_iter: 60, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' },
    },
    {
      name: '低扰动',
      params: { epsilon: 0.015, alpha: 0.005, num_iter: 30, targeted: false, random_start: true, loss_type: 'dlr', norm: 'l2' },
    },
  ];

  const handleImageChange = (file) => {
    if (!file) {
      setImageUrl(null);
      return false;
    }
    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleRunAttack = () => {
    if (!imageUrl) {
      return;
    }
    const requestData = {
      image: imageUrl,
      model_name: 'resnet100_imagenet',
      params,
    };

    if (useAsync) {
      runAttack(requestData);
      return;
    }
    runSyncAttack(requestData);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(presets[0].params);
    reset();
  };

  const renderStatusIndicator = () => {
    const statusConfig = {
      idle: { color: 'default', text: '就绪' },
      pending: { color: 'processing', text: '排队中' },
      processing: { color: 'processing', text: '攻击中' },
      running: { color: 'processing', text: '攻击中' },
      completed: { color: 'success', text: '完成' },
      failed: { color: 'error', text: '失败' },
    };
    const config = statusConfig[status] || statusConfig.idle;
    return <Badge status={config.color} text={config.text} />;
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            PGD 攻击算法
            <Tooltip title="Projected Gradient Descent，多步迭代扰动攻击">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            基于 live OpenAPI 的 PGD 活跃链路，复用当前主线上传、轮询和结果展示结构。
          </Paragraph>
        </div>

        <Space>
          <Text type="secondary">状态:</Text>
          {renderStatusIndicator()}
          <Switch checkedChildren="异步" unCheckedChildren="同步" checked={useAsync} onChange={setUseAsync} size="small" />
          <Switch checkedChildren="高级" unCheckedChildren="基础" checked={advancedMode} onChange={setAdvancedMode} size="small" />
        </Space>
      </div>

      <QueueStatus />

      <Row gutter={24}>
        <Col span={10}>
          <Card
            title="参数配置"
            variant="borderless"
            extra={(
              <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isRunning} size="small" />
            )}
          >
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>待攻击图片</Text>
              <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>快速预设</Text>
              <Space wrap>
                {presets.map((preset) => (
                  <Tag key={preset.name} style={{ cursor: 'pointer' }} onClick={() => setParams(preset.params)} color={JSON.stringify(params) === JSON.stringify(preset.params) ? 'blue' : 'default'}>
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
                onChange={(value) => setParams((prev) => ({ ...prev, [key]: value }))}
                range={spec.range}
                step={spec.step}
                unit={spec.unit}
                disabled={isRunning}
              />
            ))}

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>攻击模式</Text>
              <Space wrap>
                <Tag color={params.targeted ? 'purple' : 'blue'} onClick={() => setParams((prev) => ({ ...prev, targeted: !prev.targeted }))} style={{ cursor: 'pointer' }}>
                  {params.targeted ? '定向攻击' : '非定向攻击'}
                </Tag>
                <Tag color={params.random_start ? 'green' : 'default'} onClick={() => setParams((prev) => ({ ...prev, random_start: !prev.random_start }))} style={{ cursor: 'pointer' }}>
                  {params.random_start ? '随机初始化开启' : '随机初始化关闭'}
                </Tag>
                {advancedMode && (
                  <>
                    <Tag color={params.norm === 'linf' ? 'geekblue' : 'default'} onClick={() => setParams((prev) => ({ ...prev, norm: 'linf' }))} style={{ cursor: 'pointer' }}>
                      Linf
                    </Tag>
                    <Tag color={params.norm === 'l2' ? 'geekblue' : 'default'} onClick={() => setParams((prev) => ({ ...prev, norm: 'l2' }))} style={{ cursor: 'pointer' }}>
                      L2
                    </Tag>
                    <Tag color={params.loss_type === 'ce' ? 'gold' : 'default'} onClick={() => setParams((prev) => ({ ...prev, loss_type: 'ce' }))} style={{ cursor: 'pointer' }}>
                      CE Loss
                    </Tag>
                    <Tag color={params.loss_type === 'dlr' ? 'gold' : 'default'} onClick={() => setParams((prev) => ({ ...prev, loss_type: 'dlr' }))} style={{ cursor: 'pointer' }}>
                      DLR Loss
                    </Tag>
                  </>
                )}
              </Space>
            </div>

            <Space size="middle">
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunAttack} loading={loading} disabled={!imageUrl || isRunning} size="large">
                {useAsync ? '提交异步任务' : '同步执行'}
              </Button>
              {canCancel && (
                <Button icon={<StopOutlined />} onClick={cancel} danger>
                  取消
                </Button>
              )}
            </Space>

            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={progress} status="active" />
              </div>
            )}

            {error && (
              <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                closable
                style={{ marginTop: 16 }}
                action={<Button size="small" onClick={() => setError(null)}>关闭</Button>}
              />
            )}
          </Card>
        </Col>

        <Col span={14}>
          <ResultDisplay
            result={result}
            originalImageUrl={imageUrl}
            onSaveResult={() => saveResult('PGD active flow')}
            onExportData={exportData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default PGDAttack;
