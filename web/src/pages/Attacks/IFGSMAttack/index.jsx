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
import useIFGSMAttack from './hooks/useIFGSMAttack';
import QueueStatus from '../../../components/common/QueueStatus';

const { Title, Paragraph, Text } = Typography;

const IFGSMAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [params, setParams] = useState({
    epsilon: 0.03,
    alpha: 0.01,
    num_iterations: 10,
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
  } = useIFGSMAttack();

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
    if (!imageUrl) return;
    const requestData = {
      image: imageUrl,
      model_name: 'resnet100_imagenet',
      params,
    };
    runAttack(requestData);
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams({ epsilon: 0.03, alpha: 0.01, num_iterations: 10, targeted: false });
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
            I-FGSM 攻击算法
            <Tooltip title="Iterative Fast Gradient Sign Method，迭代快速梯度符号法，通过多步小扰动实现更精细的对抗攻击">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            基于 FGSM 的迭代版本，每次施加较小的扰动并限制在 epsilon 球内，攻击效果更优。
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
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>待攻击图片</Text>
              <ImageUploader onImageChange={handleImageChange} disabled={isRunning} maxSize={10} />
            </div>

            <ParameterSlider
              label="扰动上限 epsilon"
              description="L∞ 扰动约束上界。"
              tips="值越大攻击越容易成功，但图像质量下降越明显。"
              value={params.epsilon}
              onChange={(value) => setParams((prev) => ({ ...prev, epsilon: value }))}
              range={{ min: 0, max: 0.2 }}
              step={0.001}
              disabled={isRunning}
            />

            <ParameterSlider
              label="步长 alpha"
              description="每次迭代的步长大小。"
              tips="通常设为 epsilon / num_iterations 的量级。"
              value={params.alpha}
              onChange={(value) => setParams((prev) => ({ ...prev, alpha: value }))}
              range={{ min: 0.001, max: 0.1 }}
              step={0.001}
              disabled={isRunning}
            />

            <ParameterSlider
              label="迭代次数"
              description="I-FGSM 的迭代步数。"
              tips="更多迭代可能获得更强攻击效果，但耗时增加。"
              value={params.num_iterations}
              onChange={(value) => setParams((prev) => ({ ...prev, num_iterations: value }))}
              range={{ min: 1, max: 100 }}
              step={1}
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
            onSaveResult={() => saveResult('I-FGSM attack')}
            onExportData={exportData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default IFGSMAttack;
