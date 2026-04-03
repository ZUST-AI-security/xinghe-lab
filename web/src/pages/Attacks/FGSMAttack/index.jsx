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
import useFGSMAttack from './hooks/useFGSMAttack';

const { Title, Paragraph, Text } = Typography;

const FGSMAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [useAsync, setUseAsync] = useState(true);
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            FGSM 攻击算法
            <Tooltip title="Fast Gradient Sign Method，单步快速扰动攻击">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            轻量级攻击链路，已按 live OpenAPI 接入当前活跃前端结构。
          </Paragraph>
        </div>

        <Space>
          <Text type="secondary">状态:</Text>
          <Badge status={currentStatus.color} text={currentStatus.text} />
          <Switch checkedChildren="异步" unCheckedChildren="同步" checked={useAsync} onChange={setUseAsync} size="small" />
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={10}>
          <Card
            title="参数配置"
            variant="borderless"
            extra={<Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isRunning} size="small" />}
          >
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>待攻击图片</Text>
              <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
            </div>

            <ParameterSlider
              label="扰动上限 epsilon"
              description="FGSM 单步更新的 L-infinity 扰动上界。"
              tips="值越大越容易成功，但图像变化也更明显。"
              value={params.epsilon}
              onChange={(value) => setParams((prev) => ({ ...prev, epsilon: value }))}
              range={{ min: 0, max: 0.2 }}
              step={0.001}
              disabled={isRunning}
            />

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>攻击模式</Text>
              <Tag color={params.targeted ? 'purple' : 'blue'} onClick={() => setParams((prev) => ({ ...prev, targeted: !prev.targeted }))} style={{ cursor: 'pointer' }}>
                {params.targeted ? '定向攻击' : '非定向攻击'}
              </Tag>
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
            onSaveResult={() => saveResult('FGSM active flow')}
            onExportData={exportData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default FGSMAttack;
