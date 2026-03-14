/**
 * 星河智安 (XingHe ZhiAn) - C&W攻击页面
 * C&W攻击算法的可视化交互页面
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, message, Space, Alert, Spin } from 'antd';
import { PlayCircleOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';

import ImageUploader from '../../components/Common/ImageUploader';
import ModelSelector from '../../components/Common/ModelSelector';
import ComparisonSlider from '../../components/Visualization/ComparisonSlider';
import Heatmap from '../../components/Visualization/Heatmap';
import ConfidenceChart from '../../components/Visualization/ConfidenceChart';
import PageLoading from '../../components/Common/LoadingSpin';

import useCWAttack from '../../hooks/useCWAttack';
import { getAlgorithmParams } from '../../api/attacks/cw';

const CWAttack = () => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState('resnet100_imagenet');
  const [params, setParams] = useState({});
  const [paramSchema, setParamSchema] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(false);
  
  // 自定义Hook：攻击逻辑
  const {
    loading,
    result,
    error,
    runAttack,
    saveResult,
  } = useCWAttack();

  // 加载参数配置
  useEffect(() => {
    const loadParams = async () => {
      setLoadingSchema(true);
      try {
        const schema = await getAlgorithmParams();
        setParamSchema(schema);
        
        // 设置默认参数
        const defaultParams = {};
        Object.keys(schema).forEach(key => {
          defaultParams[key] = schema[key].default;
        });
        setParams(defaultParams);
      } catch (err) {
        message.error('加载参数配置失败');
      } finally {
        setLoadingSchema(false);
      }
    };
    loadParams();
  }, []);

  // 处理参数变化
  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 运行攻击
  const handleRunAttack = async () => {
    if (!selectedImage) {
      message.warning('请先上传图片');
      return;
    }

    try {
      await runAttack({
        image: selectedImage,
        model: selectedModel,
        params
      });
      message.success('攻击完成');
    } catch (err) {
      message.error('攻击失败: ' + err.message);
    }
  };

  // 保存结果
  const handleSaveResult = async () => {
    if (!result) {
      message.warning('没有可保存的结果');
      return;
    }

    try {
      await saveResult();
      message.success('保存成功');
    } catch (err) {
      message.error('保存失败');
    }
  };

  // 渲染参数面板
  const renderParameterPanel = () => {
    if (loadingSchema) {
      return (
        <div className="flex-center" style={{ height: '200px' }}>
          <Spin tip="加载参数配置..." />
        </div>
      );
    }

    return (
      <div className="params-panel">
        {Object.entries(paramSchema).map(([key, config]) => (
          <div key={key} className="param-item">
            <div className="param-label">
              {config.label}
              {config.description && (
                <div className="param-description">
                  {config.description}
                </div>
              )}
            </div>
            
            {/* 根据类型渲染不同的输入控件 */}
            {config.type === 'slider' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={params[key] || config.default}
                  onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#8c8c8c',
                  marginTop: '4px'
                }}>
                  <span>{config.min}</span>
                  <span>{params[key] || config.default}</span>
                  <span>{config.max}</span>
                </div>
              </div>
            )}
            
            {config.type === 'switch' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={params[key] || config.default}
                  onChange={(e) => handleParamChange(key, e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>
                  {config.label}
                </span>
              </div>
            )}
            
            {config.type === 'select' && (
              <div style={{ marginTop: '8px' }}>
                <select
                  value={params[key] || config.default}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  style={{ width: '100%', padding: '4px' }}
                >
                  {config.options.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">
          <ThunderboltOutlined style={{ marginRight: '8px' }} />
          C&W 攻击算法演示
        </h1>
        <p className="page-description">
          Carlini & Wagner (C&W) 是一种强大的优化-based攻击算法。
          通过调节下方参数，观察攻击效果的变化。
        </p>
      </div>

      {/* 主要操作区 */}
      <Row gutter={[16, 16]}>
        {/* 左侧：图片上传和模型选择 */}
        <Col span={12}>
          <Card title="1. 选择图片和模型" bordered={false}>
            <ImageUploader
              value={selectedImage}
              onChange={setSelectedImage}
              description="上传一张图片（支持jpg/png，建议224x224）"
            />
            <div style={{ marginTop: 16 }}>
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                showOnly={['resnet100_imagenet']} // 目前只支持ResNet100
              />
            </div>
          </Card>
        </Col>

        {/* 右侧：参数调节 */}
        <Col span={12}>
          <Card title="2. 调节参数" bordered={false}>
            {renderParameterPanel()}
          </Card>
        </Col>
      </Row>

      {/* 运行按钮 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="large"
              loading={loading}
              onClick={handleRunAttack}
              disabled={!selectedImage || loadingSchema}
              style={{
                background: 'linear-gradient(45deg, #1890ff, #722ed1)',
                border: 'none',
              }}
            >
              {loading ? '攻击中...' : '运行攻击'}
            </Button>
            <Button
              icon={<SaveOutlined />}
              size="large"
              onClick={handleSaveResult}
              disabled={!result}
            >
              保存结果
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 错误提示 */}
      {error && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Alert 
              message="错误" 
              description={
                typeof error === 'string' 
                  ? error 
                  : error?.message || '发生未知错误'
              } 
              type="error" 
              showIcon 
            />
          </Col>
        </Row>
      )}

      {/* 结果展示区 */}
      {result && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card title="3. 攻击结果" bordered={false}>
              <Row gutter={[16, 16]}>
                {/* 对比滑块 */}
                <Col span={12}>
                  <ComparisonSlider
                    leftImage={result.original_image}
                    rightImage={result.adversarial_image}
                    leftLabel="原始图片"
                    rightLabel="对抗样本"
                  />
                </Col>

                {/* 热力图 */}
                <Col span={12}>
                  <Heatmap
                    image={result.heatmap}
                    title="扰动热力图"
                    description="红色区域表示修改较大的像素"
                  />
                </Col>

                {/* 置信度变化 */}
                <Col span={24}>
                  <ConfidenceChart
                    originalProbs={result.original_probs}
                    adversarialProbs={result.adversarial_probs}
                    title="分类置信度变化"
                  />
                </Col>

                {/* 攻击信息 */}
                <Col span={24}>
                  <Alert
                    message={`攻击${result.success ? '成功' : '失败'}`}
                    description={
                      <div>
                        <div>L2扰动距离: {result.metadata.l2_norm?.toFixed(4)}</div>
                        <div>迭代次数: {result.metadata.iterations}</div>
                        <div>执行时间: {result.time_elapsed?.toFixed(2)}秒</div>
                        <div>最终c值: {result.metadata.final_c_value}</div>
                      </div>
                    }
                    type={result.success ? 'success' : 'info'}
                    showIcon
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default CWAttack;
