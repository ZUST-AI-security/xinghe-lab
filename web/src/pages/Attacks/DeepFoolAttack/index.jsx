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
import ModelSelector from '../shared/ModelSelector';
import useDeepFoolAttack from './hooks/useDeepFoolAttack';
import QueueStatus from '../../../components/common/QueueStatus';

const { Title, Paragraph, Text } = Typography;

const DeepFoolAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [modelName, setModelName] = useState('resnet100_imagenet');
  const [params, setParams] = useState({
    max_iter: 50,
    overshoot: 0.02,
    num_classes: 10,
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
  } = useDeepFoolAttack();

  const handleImageChange = (file, dataUrl) => {
    if (!file) {
      setImageUrl(null);
      return false;
    }
    if (dataUrl) {
      setImageUrl(dataUrl);
      return false;
    }
    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleRunAttack = () => {
    if (!imageUrl) return;
    runAttack({
      image: imageUrl,
      model_name: modelName,
      params,
    });
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams({ max_iter: 50, overshoot: 0.02, num_classes: 10 });
    reset();
  };

  const statusConfig = {
    idle: { color: 'default', text: '就绪' },
    pending: { color: 'processing', text: '排队中' },
    processing: { color: 'processing', text: '攻击中' },
    running: { color: 'processing', text: '攻击中' },
    completed: { color: 'success', text: '完成' },
    failed: { color: 'error', text: '失败' },
  };
  const currentStatus = statusConfig[status] || statusConfig.idle;

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            DeepFool 攻击算法
            <Tooltip title="DeepFool 通过寻找最近的决策边界来生成最小 L2 扰动的对抗样本">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            最小 L2 扰动攻击——基于决策边界几何分析，仅适配图像分类模型；攻击 YOLO 等检测模型请改用 PGD/FGSM/I-FGSM。
          </Paragraph>
        </div>

        <Space>
          <Text type="secondary">状态:</Text>
          <Badge status={currentStatus.color} text={currentStatus.text} />
        </Space>
      </div>

      <QueueStatus />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card
            title="参数配置"
            variant="borderless"
            extra={<Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isRunning} size="small" />}
          >
            <ModelSelector
              value={modelName}
              onChange={setModelName}
              supportedTaskTypes={['classification']}
              disabled={isRunning}
              renderHint={() => null}
            />

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>待攻击图片</Text>
              <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
            </div>

            <ParameterSlider
              label="最大迭代次数"
              description="DeepFool 的最大迭代步数。"
              tips="通常 50 次迭代已足够，增大可能略微降低扰动量。"
              value={params.max_iter}
              onChange={(value) => setParams((prev) => ({ ...prev, max_iter: value }))}
              range={{ min: 1, max: 200 }}
              step={1}
              disabled={isRunning}
            />

            <ParameterSlider
              label="过冲系数 overshoot"
              description="越过决策边界的乘数因子。"
              tips="较小值产生更精确的扰动，较大值提高攻击成功率。"
              value={params.overshoot}
              onChange={(value) => setParams((prev) => ({ ...prev, overshoot: value }))}
              range={{ min: 0.001, max: 0.1 }}
              step={0.001}
              disabled={isRunning}
            />

            <ParameterSlider
              label="候选类别数"
              description="计算扰动时考虑的候选类别数量。"
              tips="增大可搜索更多类别边界，但计算成本更高。"
              value={params.num_classes}
              onChange={(value) => setParams((prev) => ({ ...prev, num_classes: value }))}
              range={{ min: 2, max: 20 }}
              step={1}
              disabled={isRunning}
            />

            <Space size="middle" wrap>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunAttack} loading={loading} disabled={!imageUrl || isRunning} size="large">
                提交任务
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

        <Col xs={24} lg={14}>
          <ResultDisplay
            result={result}
            originalImageUrl={imageUrl}
            onSaveResult={() => saveResult('DeepFool attack')}
            onExportData={exportData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default DeepFoolAttack;
