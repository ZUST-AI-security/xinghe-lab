/**
 * C&W攻击主页面 (改进版)
 * 完整的参数交互、图像上传、结果展示
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

const { Title, Text, Paragraph } = Typography;

const DEFAULT_CW_PARAMS = {
  c: 0.1,
  kappa: 0,
  lr: 0.01,
  max_iter: 2000,
  binary_search_steps: 9,
  init_const: 0.01,
  targeted: false,
  abort_early: true,
  early_stop_iters: 50,
};

/**
 * C&W攻击页面组件 (改进版)
 */
const CWAttack = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(true);
  
  const [params, setParams] = useState(DEFAULT_CW_PARAMS);

  // 使用自定义Hook
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
    hasResult,
    isSuccess,
  } = useCWAttack();

  const paramSpecs = {
    c: {
      label: '权衡系数 c',
      description: '平衡攻击成功与扰动大小的权重。值越大，攻击成功率越高但扰动也越大',
      tips: 'ImageNet建议从0.1开始尝试，如果攻击失败逐渐增大',
      range: { min: 0.001, max: 1000 },
      step: 0.1,
      isLogScale: true,
      unit: ''
    },
    kappa: {
      label: '置信度阈值 κ',
      description: '要求目标类别的logits比其他类别高出多少。值越大，对抗样本越"确信"是目标类别',
      tips: '值越大，生成的扰动也越大。非定向攻击通常设为0',
      range: { min: 0, max: 50 },
      step: 1,
      isLogScale: false,
      unit: ''
    },
    lr: {
      label: '学习率',
      description: 'Adam优化器的步长',
      tips: '如果损失震荡，可适当降低学习率',
      range: { min: 1e-5, max: 1e-1 },
      step: 0.001,
      isLogScale: true,
      unit: ''
    },
    max_iter: {
      label: '最大迭代次数',
      description: '优化过程的上限',
      tips: 'ImageNet需要更多迭代，建议500-1000',
      range: { min: 100, max: 1000 },
      step: 50,
      isLogScale: false,
      unit: '次'
    },
    binary_search_steps: {
      label: '二分搜索步数',
      description: '自动搜索最优c值的迭代次数',
      tips: '步数越多，找到的c值越优，但耗时更长',
      range: { min: 1, max: 20 },
      step: 1,
      isLogScale: false,
      unit: '步'
    },
    init_const: {
      label: '初始c值',
      description: '二分搜索的起点',
      tips: 'ImageNet建议从0.01开始',
      range: { min: 1e-4, max: 10.0 },
      step: 0.001,
      isLogScale: true,
      unit: ''
    },
    early_stop_iters: {
      label: '早停检查步数',
      description: '提前终止的检查间隔',
      tips: '减少不必要的计算，但可能错过最优解',
      range: { min: 10, max: 200 },
      step: 10,
      isLogScale: false,
      unit: '步'
    }
  };

  // 预设模板
  const presets = [
    {
      name: '默认参数',
      icon: '⚡',
      params: DEFAULT_CW_PARAMS,
    },
    {
      name: '激进攻击',
      icon: '🔥',
      params: {
        c: 10,
        kappa: 10,
        lr: 0.05,
        max_iter: 5000,
        binary_search_steps: 15,
        init_const: 0.1,
        targeted: false,
        abort_early: false,
        early_stop_iters: 100,
      },
    },
    {
      name: '隐蔽攻击',
      icon: '👻',
      params: {
        c: 0.01,
        kappa: 0,
        lr: 0.001,
        max_iter: 1000,
        binary_search_steps: 5,
        init_const: 0.001,
        targeted: false,
        abort_early: true,
        early_stop_iters: 25,
      },
    },
    {
      name: '快速测试',
      icon: '⚡',
      params: {
        c: 1.0,
        kappa: 0,
        lr: 0.02,
        max_iter: 500,
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
    
    return false; // 阻止自动上传
  };

  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTargetedChange = (checked) => {
    setParams(prev => ({
      ...prev,
      targeted: checked,
    }));
  };

  const applyPreset = (preset) => {
    setParams(preset.params);
    message.success(`已应用"${preset.name}"模板`);
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
    setParams(presets[0].params); // 重置为默认参数
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

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    const statusConfig = {
      idle: { color: 'default', text: '就绪' },
      pending: { color: 'processing', text: '排队中' },
      processing: { color: 'processing', text: '攻击中' },
      completed: { color: isSuccess ? 'success' : 'warning', text: isSuccess ? '成功' : '失败' },
      failed: { color: 'error', text: '失败' }
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
      {/* 页面头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            C&W 攻击算法
            <Tooltip title="Carlini & Wagner L2攻击，强大的基于优化的对抗攻击方法">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            针对ImageNet ResNet152模型的C&W攻击，支持参数实时调节和多种范数约束
          </Paragraph>
        </div>
        
        <Space>
          <Text type="secondary">状态:</Text>
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

      <Row gutter={24}>
        {/* 左侧：参数配置 */}
        <Col span={10}>
          <Card 
            title="参数配置" 
            variant="borderless"
            extra={
              <Tooltip title="重置所有参数和图片">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleReset}
                  disabled={isRunning}
                  size="small"
                />
              </Tooltip>
            }
          >
            {/* 图片上传 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                待攻击图片
                <Tooltip title="支持JPEG、PNG、WebP格式，建议使用224x224像素的图片">
                  <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              </Text>
              <ImageUploader
                onImageChange={handleImageChange}
                disabled={isRunning}
                maxSize={10}
              />
            </div>

            {/* 预设模板 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                快速预设
                <Tooltip title="选择预定义的参数组合，快速开始攻击">
                  <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
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

            {/* C&W核心参数滑块 */}
            {Object.entries(paramSpecs).map(([key, spec]) => {
              // 在基础模式下隐藏部分参数
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

            {/* 定向攻击选项 */}
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
                当前后端 C&amp;W 定向模式不接收手动目标类别，开启后将按后端算法逻辑选择目标。
              </Text>
            </div>

            {/* 操作按钮 */}
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

            {/* 进度条 */}
            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <Progress 
                  percent={progress} 
                  status="active"
                  format={(percent) => `${percent}%`}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {status === 'pending' && '任务排队中，请稍候...'}
                  {status === 'processing' && '正在执行攻击，请耐心等待...'}
                </Text>
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <Alert
                message="错误"
                description={error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                closable
                action={
                  <Button size="small" onClick={() => setError(null)}>
                    关闭
                  </Button>
                }
              />
            )}
          </Card>
        </Col>

        {/* 右侧：结果展示 */}
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
