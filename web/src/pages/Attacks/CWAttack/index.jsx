/**
 * C&W attack page.
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Progress,
  Spin,
  message,
  Tooltip,
  Badge,
  Tag,
  Switch,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import ParameterSlider from './components/ParameterSlider';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import useCWAttack from './hooks/useCWAttack';
import QueueStatus from '../../../components/common/QueueStatus';

const { Title, Text, Paragraph } = Typography;

const DEFAULT_CW_PARAMS = {
  c: 0.1,
  kappa: 0,
  lr: 0.01,
  max_iter: 500,
  binary_search_steps: 5,
  init_const: 0.01,
  targeted: false,
  abort_early: true,
  early_stop_iters: 50,
};

const CWAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(true);
  const [params, setParams] = useState(DEFAULT_CW_PARAMS);

  const {
    loading,
    progress,
    result,
    error,
    setError,
    status,
    statusMessage,
    runAttack,
    runSyncAttack,
    cancel,
    reset,
    saveResult,
    exportData,
    isRunning,
    canCancel,
    hasResult,
    isSuccess,
  } = useCWAttack();

  const paramSpecs = {
    c: {
      label: '权衡系数 c',
      description: '平衡攻击成功率与扰动大小的权重。',
      tips: 'ImageNet 建议从 0.1 开始，不够强时再逐步调大。',
      range: { min: 0.001, max: 1000 },
      step: 0.1,
      isLogScale: true,
      unit: '',
    },
    kappa: {
      label: '置信度阈值',
      description: '要求目标类别 logits 超过其他类别的幅度。',
      tips: '数值越大，攻击更强，但通常耗时也更长。',
      range: { min: 0, max: 50 },
      step: 1,
      isLogScale: false,
      unit: '',
    },
    lr: {
      label: '学习率',
      description: 'Adam 优化器学习率。',
      tips: '如果损失震荡，适当降低学习率。',
      range: { min: 1e-5, max: 1e-1 },
      step: 0.001,
      isLogScale: true,
      unit: '',
    },
    max_iter: {
      label: '最大迭代次数',
      description: '每轮搜索中的最大优化步数。',
      tips: '本地开发建议先用 300-500，确认流程通了再加大。',
      range: { min: 100, max: 1000 },
      step: 50,
      isLogScale: false,
      unit: '次',
    },
    binary_search_steps: {
      label: '二分搜索步数',
      description: '用于搜索更优 c 的轮数。',
      tips: '步数越多结果越稳，但耗时会明显上升。',
      range: { min: 1, max: 20 },
      step: 1,
      isLogScale: false,
      unit: '步',
    },
    init_const: {
      label: '初始 c 值',
      description: '二分搜索的起始点。',
      tips: '一般保持默认值即可。',
      range: { min: 1e-4, max: 10.0 },
      step: 0.001,
      isLogScale: true,
      unit: '',
    },
    early_stop_iters: {
      label: '早停检查步数',
      description: '无明显改善时的检查间隔。',
      tips: '可以减少不必要计算，但过小会影响结果质量。',
      range: { min: 10, max: 200 },
      step: 10,
      isLogScale: false,
      unit: '步',
    },
  };

  const presets = [
    {
      name: '默认参数',
      icon: 'A',
      params: DEFAULT_CW_PARAMS,
    },
    {
      name: '激进攻击',
      icon: 'B',
      params: {
        c: 10,
        kappa: 10,
        lr: 0.05,
        max_iter: 1000,
        binary_search_steps: 9,
        init_const: 0.1,
        targeted: false,
        abort_early: false,
        early_stop_iters: 100,
      },
    },
    {
      name: '隐蔽攻击',
      icon: 'C',
      params: {
        c: 0.01,
        kappa: 0,
        lr: 0.001,
        max_iter: 500,
        binary_search_steps: 5,
        init_const: 0.001,
        targeted: false,
        abort_early: true,
        early_stop_iters: 25,
      },
    },
    {
      name: '快速测试',
      icon: 'D',
      params: {
        c: 1.0,
        kappa: 0,
        lr: 0.02,
        max_iter: 200,
        binary_search_steps: 3,
        init_const: 0.1,
        targeted: false,
        abort_early: true,
        early_stop_iters: 20,
      },
    },
  ];

  const handleImageChange = (file) => {
    if (!file) {
      setImageUrl(null);
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleParamChange = (key, value) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTargetedChange = (checked) => {
    setParams((prev) => ({
      ...prev,
      targeted: checked,
    }));
  };

  const applyPreset = (preset) => {
    setParams(preset.params);
    message.success(`已应用“${preset.name}”模板`);
  };

  const handleRunAttack = () => {
    if (!imageUrl) {
      message.warning('请先上传图片');
      return;
    }

    const attackParams = {
      image: imageUrl,
      model_name: 'resnet100_imagenet',
      params,
    };

    if (useAsync) {
      runAttack(attackParams);
    } else {
      runSyncAttack(attackParams);
    }
  };

  const handleReset = () => {
    setImageUrl(null);
    setParams(DEFAULT_CW_PARAMS);
    reset();
  };

  const handleSaveResult = () => {
    if (result) {
      saveResult('CW active flow');
    }
  };

  const handleExportData = () => {
    if (result) {
      exportData(result);
    }
  };

  const renderStatusIndicator = () => {
    const statusConfig = {
      idle: { color: 'default', text: '就绪' },
      pending: { color: 'processing', text: '排队中' },
      processing: { color: 'processing', text: '执行中' },
      running: { color: 'processing', text: '执行中' },
      completed: { color: isSuccess ? 'success' : 'warning', text: isSuccess ? '成功' : '已完成' },
      failed: { color: 'error', text: '失败' },
    };

    const config = statusConfig[status] || statusConfig.idle;

    return (
      <Badge status={config.color} text={config.text}>
        {isRunning && <Spin size="small" style={{ marginLeft: 8 }} />}
      </Badge>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            C&W 攻击算法
            <Tooltip title="Carlini & Wagner L2 attack">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            面向 ImageNet 分类模型的优化型对抗攻击。C&W 质量高，但计算量也明显更大。
          </Paragraph>
        </div>

        <Space>
          <Text type="secondary">状态</Text>
          {renderStatusIndicator()}
          <Switch
            checkedChildren="异步"
            unCheckedChildren="同步"
            checked={useAsync}
            onChange={setUseAsync}
            size="small"
          />
          <Switch
            checkedChildren="高级"
            unCheckedChildren="基础"
            checked={advancedMode}
            onChange={setAdvancedMode}
            size="small"
          />
        </Space>
      </div>

      <QueueStatus />

      <Row gutter={24}>
        <Col span={10}>
          <Card
            title="参数配置"
            variant="borderless"
            extra={
              <Tooltip title="重置图片和参数">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  disabled={isRunning}
                  size="small"
                />
              </Tooltip>
            }
          >
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                待攻击图片
              </Text>
              <ImageUploader
                onImageChange={handleImageChange}
                disabled={isRunning}
                maxSize={10}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                快速预设
              </Text>
              <Space wrap>
                {presets.map((preset, index) => (
                  <Tag
                    key={index}
                    icon={<span>{preset.icon}</span>}
                    onClick={() => applyPreset(preset)}
                    style={{ cursor: 'pointer' }}
                    color={JSON.stringify(params) === JSON.stringify(preset.params) ? 'blue' : 'default'}
                  >
                    {preset.name}
                  </Tag>
                ))}
              </Space>
            </div>

            <Divider orientation="left">攻击参数</Divider>

            {Object.entries(paramSpecs).map(([key, spec]) => {
              if (!advancedMode && ['early_stop_iters'].includes(key)) {
                return null;
              }

              return (
                <ParameterSlider
                  key={key}
                  label={spec.label}
                  description={spec.description}
                  tips={spec.tips}
                  value={params[key]}
                  onChange={(val) => handleParamChange(key, val)}
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
                <Switch
                  checked={params.targeted}
                  onChange={handleTargetedChange}
                  disabled={isRunning}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                当前后端定向模式仍按算法内部逻辑自动选择目标类。
              </Text>
            </div>

            <Space size="middle">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleRunAttack}
                loading={loading}
                disabled={!imageUrl || isRunning}
                size="large"
              >
                {useAsync ? '提交异步任务' : '同步执行'}
              </Button>

              {canCancel && (
                <Button
                  icon={<StopOutlined />}
                  onClick={cancel}
                  danger
                >
                  取消
                </Button>
              )}

              {hasResult && (
                <>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveResult}
                    disabled={loading}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExportData}
                    disabled={loading}
                  >
                    导出
                  </Button>
                </>
              )}
            </Space>

            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={progress}
                  status="active"
                  format={(percent) => `${percent}%`}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {statusMessage || (status === 'pending' ? '任务排队中，请稍候...' : '正在执行攻击，请耐心等待...')}
                </Text>
              </div>
            )}

            {error && (
              <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                closable
                action={(
                  <Button size="small" onClick={() => setError(null)}>
                    关闭
                  </Button>
                )}
              />
            )}
          </Card>
        </Col>

        <Col span={14}>
          <ResultDisplay
            result={result}
            originalImageUrl={imageUrl}
            onSaveResult={handleSaveResult}
            onExportData={handleExportData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default CWAttack;
