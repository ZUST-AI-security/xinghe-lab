import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
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
import DetectionResultDisplay from '../shared/DetectionResultDisplay';
import ModelSelector from '../shared/ModelSelector';
import useFGSMAttack from './hooks/useFGSMAttack';
import QueueStatus from '../../../components/common/QueueStatus';

const { Title, Paragraph, Text } = Typography;

const MODEL_TYPE_FALLBACK = {
  resnet100_imagenet: 'classification',
  yolov8: 'detection',
};

const FGSMAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [modelName, setModelName] = useState('resnet100_imagenet');
  const [params, setParams] = useState({
    epsilon: 0.03,
    targeted: false,
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
  } = useFGSMAttack();

  const isDetectionTask = MODEL_TYPE_FALLBACK[modelName] === 'detection';

  // 切到检测任务时把 epsilon 默认值放大一些（YOLO 输入 [0,1] 像素空间）
  useEffect(() => {
    if (isDetectionTask && params.epsilon < 0.02) {
      setParams((prev) => ({ ...prev, epsilon: 0.04, targeted: false }));
    }
  }, [isDetectionTask]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setParams({ epsilon: 0.03, targeted: false });
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
  const resultTaskType = result?.metadata?.task_type
    || (isDetectionTask ? 'detection' : 'classification');

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            FGSM 攻击算法
            <Tooltip title="Fast Gradient Sign Method，单步快速扰动攻击">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {isDetectionTask
              ? '单步 vanish 攻击：让 YOLO 漏检目标。'
              : '轻量级攻击链路，已按 live OpenAPI 接入当前活跃前端结构。'}
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
              supportedTaskTypes={['classification', 'detection']}
              disabled={isRunning}
            />

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>待攻击图片</Text>
              <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
            </div>

            <ParameterSlider
              label="扰动上限 epsilon"
              description="FGSM 单步更新的 L-infinity 扰动上界。"
              tips={isDetectionTask
                ? 'YOLO 单步攻击通常需要 0.03 - 0.08 才能让目标消失。'
                : '值越大越容易成功，但图像变化也更明显。'}
              value={params.epsilon}
              onChange={(value) => setParams((prev) => ({ ...prev, epsilon: value }))}
              range={{ min: 0, max: 0.2 }}
              step={0.001}
              disabled={isRunning}
            />

            {!isDetectionTask && (
              <div style={{ marginBottom: 24 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>攻击模式</Text>
                <Tag color={params.targeted ? 'purple' : 'blue'} onClick={() => setParams((prev) => ({ ...prev, targeted: !prev.targeted }))} style={{ cursor: 'pointer' }}>
                  {params.targeted ? '定向攻击' : '非定向攻击'}
                </Tag>
              </div>
            )}

            <Space size="middle">
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
          {resultTaskType === 'detection' ? (
            <DetectionResultDisplay
              result={result}
              originalImageUrl={imageUrl}
              onSaveResult={() => saveResult('FGSM detection flow')}
              onExportData={exportData}
            />
          ) : (
            <ResultDisplay
              result={result}
              originalImageUrl={imageUrl}
              onSaveResult={() => saveResult('FGSM active flow')}
              onExportData={exportData}
              loading={loading}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default FGSMAttack;
