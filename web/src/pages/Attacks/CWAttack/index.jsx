/**
 * C&W攻击主页面 (改进版)
 * 完整的参数交互、图像上传、结果展示
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Radio,
  Divider,
  Alert,
  Progress,
  Select,
  Spin,
  message,
  Tooltip,
  Badge,
  Tag,
  Switch
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

import ParameterSlider from './components/ParameterSlider';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import useCWAttack from './hooks/useCWAttack';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * C&W攻击页面组件 (改进版)
 */
const CWAttack = () => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [useAsync, setUseAsync] = useState(false);
  
  // 参数状态
  const [params, setParams] = useState({
    c: 5.0,  // 大幅增大c值，提高攻击效率
    kappa: 0.0,
    lr: 0.05,  // 大幅增大学习率，快速收敛
    max_iter: 100,  // 保持最小允许值
    norm: '2',
    binary_search_steps: 1,  // 最小搜索步数
    init_const: 0.01,
    target_class: undefined,
    targeted: false,
    abort_early: true,
    early_stop_iters: 5  // 最小早停检查步数
  });

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
    searchClasses,
    isRunning,
    canCancel,
    canRetry,
    hasResult,
    isSuccess
  } = useCWAttack();

  // 参数规范
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
      params: {
        c: 0.1,
        kappa: 0,
        lr: 0.01,
        max_iter: 2000,
        norm: '2',
        binary_search_steps: 9,
        init_const: 0.01,
        targeted: false,
        abort_early: true,
        early_stop_iters: 50
      }
    },
    {
      name: '激进攻击',
      icon: '🔥',
      params: {
        c: 10,
        kappa: 10,
        lr: 0.05,
        max_iter: 5000,
        norm: '2',
        binary_search_steps: 15,
        init_const: 0.1,
        targeted: false,
        abort_early: false,
        early_stop_iters: 100
      }
    },
    {
      name: '隐蔽攻击',
      icon: '👻',
      params: {
        c: 0.01,
        kappa: 0,
        lr: 0.001,
        max_iter: 1000,
        norm: 'inf',
        binary_search_steps: 5,
        init_const: 0.001,
        targeted: false,
        abort_early: true,
        early_stop_iters: 25
      }
    },
    {
      name: '快速测试',
      icon: '⚡',
      params: {
        c: 1.0,
        kappa: 0,
        lr: 0.02,
        max_iter: 500,
        norm: '2',
        binary_search_steps: 3,
        init_const: 0.1,
        targeted: false,
        abort_early: true,
        early_stop_iters: 20
      }
    }
  ];

  // 处理图片上传
  const handleImageChange = (file) => {
    setSelectedImage(file);
    
    // 生成预览URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    
    return false; // 阻止自动上传
  };

  // 处理图片ID变化
  const handleImageIdChange = (id) => {
    setImageId(id);
  };

  // 处理参数变化
  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 处理范数类型变化
  const handleNormChange = (e) => {
    setParams(prev => ({
      ...prev,
      norm: e.target.value
    }));
  };

  // 处理定向攻击切换
  const handleTargetedChange = (checked) => {
    setParams(prev => ({
      ...prev,
      targeted: checked,
      target_class: checked ? undefined : prev.target_class
    }));
  };

  // 搜索目标类别
  const handleSearchClasses = async (query) => {
    if (!query) {
      setClassOptions([]);
      return;
    }
    
    setSearching(true);
    try {
      const results = await searchClasses(query, 20);
      setClassOptions(results);
    } catch (error) {
      console.error('Search classes error:', error);
    } finally {
      setSearching(false);
    }
  };

  // 应用预设模板
  const applyPreset = (preset) => {
    setParams(preset.params);
    message.success(`已应用"${preset.name}"模板`);
  };

  // 运行攻击
  const handleRunAttack = () => {
    if (!imageId) {
      message.warning('请先上传图片');
      return;
    }
    
    const attackParams = {
      image_id: imageId,
      ...params,
      // 确保target_class正确设置
      target_class: params.targeted ? params.target_class : undefined
    };

    if (useAsync) {
      runAttack(attackParams);
    } else {
      // 同步模式需要传递base64图片
      const syncParams = {
        image: imageUrl,
        ...attackParams
      };
      delete syncParams.image_id;
      runSyncAttack(syncParams);
    }
  };

  // 重置所有
  const handleReset = () => {
    setSelectedImage(null);
    setImageUrl(null);
    setImageId(null);
    setClassOptions([]);
    setParams(presets[0].params); // 重置为默认参数
    reset();
  };

  // 保存结果
  const handleSaveResult = () => {
    if (result) {
      saveResult(result);
    }
  };

  // 导出数据
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
            针对ImageNet ResNet100模型的C&W攻击，支持参数实时调节和多种范数约束
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
                onImageIdChange={handleImageIdChange}
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

            {/* 范数类型 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong>范数类型</Text>
              <Radio.Group
                onChange={handleNormChange}
                value={params.norm}
                disabled={isRunning}
                style={{ marginTop: 8, width: '100%' }}
              >
                <Radio.Button value="2">L2 (均方根)</Radio.Button>
                <Radio.Button value="0">L0 (稀疏)</Radio.Button>
                <Radio.Button value="inf">Linf (最大值)</Radio.Button>
              </Radio.Group>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                L2范数产生平滑扰动，L0范数产生稀疏扰动，Linf范数限制最大扰动值
              </Text>
            </div>

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
              
              {params.targeted && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    选择目标类别，攻击将尝试将图片分类为指定类别
                  </Text>
                  <Select
                    showSearch
                    allowClear
                    placeholder="搜索并选择目标类别"
                    value={params.target_class}
                    onChange={(val) => handleParamChange('target_class', val)}
                    onSearch={handleSearchClasses}
                    notFoundContent={searching ? <Spin size="small" /> : '无匹配类别'}
                    filterOption={false}
                    disabled={isRunning}
                    style={{ width: '100%' }}
                    loading={searching}
                  >
                    {classOptions.map(item => (
                      <Option key={item.id} value={item.id}>
                        {item.id}: {item.name.substring(0, 60)}
                        {item.name.length > 60 ? '...' : ''}
                      </Option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <Space size="middle">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleRunAttack}
                loading={loading}
                disabled={!imageId || isRunning}
                size="large"
              >
                {useAsync ? '异步攻击' : '同步攻击'}
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
