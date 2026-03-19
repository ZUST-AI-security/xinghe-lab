import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  Progress,
  Tabs,
  Radio,
  Tooltip,
  Button,
  message
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import ImageUploader from './components/ImageUploader';
import ParameterSlider from './components/ParameterSlider';
import ResultDisplay from './components/ResultDisplay';
import { usePGDAttack } from './hooks/usePGDAttack';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const PGDAttack = () => {
  const [image, setImage] = useState(null);
  const [params, setParams] = useState({
    epsilon: 8/255,
    alpha: 2/255,
    num_iter: 40,
    random_start: true,
    targeted: false,
    target_label: 0,
    norm: 'Linf',
    confidence_threshold: 0.5
  });
  
  const { loading, result, error, progress, executeAttack, resetResult } = usePGDAttack();

  const handleImageChange = (file) => {
    setImage(file);
    resetResult();
  };

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
    resetResult();
  };

  const handleSubmit = () => {
    if (!image) {
      message.warning('请先上传图片');
      return;
    }
    executeAttack({ image, ...params });
  };

  const handleReset = () => {
    setParams({
      epsilon: 8/255,
      alpha: 2/255,
      num_iter: 40,
      random_start: true,
      targeted: false,
      target_label: 0,
      norm: 'Linf',
      confidence_threshold: 0.5
    });
    resetResult();
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>PGD攻击算法演示</Title>
      <Paragraph>
        投影梯度下降(Projected Gradient Descent)是一种迭代式对抗攻击算法，
        通过多次小步长的梯度更新，并在每次迭代后将扰动投影到指定范数范围内。
      </Paragraph>

      <Row gutter={[24, 24]}>
        {/* 左侧：参数配置 */}
        <Col xs={24} lg={10}>
          <Card 
            title="参数配置" 
            extra={
              <Space>
                <Button onClick={handleReset}>重置</Button>
                <Button 
                  type="primary" 
                  onClick={handleSubmit} 
                  loading={loading}
                  disabled={!image}
                >
                  执行攻击
                </Button>
              </Space>
            }
          >
            <ImageUploader 
              value={image} 
              onChange={handleImageChange} 
              disabled={loading}
            />
            
            {loading && (
              <Progress 
                percent={progress} 
                status="active" 
                style={{ marginTop: 16 }}
              />
            )}
            
            {error && (
              <Alert 
                message="攻击失败" 
                description={error} 
                type="error" 
                showIcon 
                style={{ marginTop: 16 }}
              />
            )}
            
            <Tabs defaultActiveKey="basic" style={{ marginTop: 16 }}>
              <TabPane tab="基础参数" key="basic">
                <ParameterSlider
                  label="epsilon"
                  value={params.epsilon}
                  min={1/255}
                  max={32/255}
                  step={1/255}
                  onChange={(v) => handleParamChange('epsilon', v)}
                  tooltip="最大扰动范围，值越大扰动越明显"
                  formatValue={(v) => (v * 255).toFixed(1)}
                  unit="/255"
                  disabled={loading}
                />
                
                <ParameterSlider
                  label="alpha"
                  value={params.alpha}
                  min={0.5/255}
                  max={8/255}
                  step={0.5/255}
                  onChange={(v) => handleParamChange('alpha', v)}
                  tooltip="每步步长，通常为epsilon/4到epsilon/10"
                  formatValue={(v) => (v * 255).toFixed(1)}
                  unit="/255"
                  disabled={loading}
                />
                
                <ParameterSlider
                  label="num_iter"
                  value={params.num_iter}
                  min={10}
                  max={100}
                  step={5}
                  onChange={(v) => handleParamChange('num_iter', v)}
                  tooltip="迭代次数，越多攻击效果越好但耗时更长"
                  unit="次"
                  disabled={loading}
                />
              </TabPane>
              
              <TabPane tab="高级参数" key="advanced">
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    范数类型
                    <Tooltip title="Linf: 无穷范数，限制每个像素的最大变化；L2: 欧几里得范数，限制整体扰动大小">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </label>
                  <Radio.Group 
                    value={params.norm} 
                    onChange={(e) => handleParamChange('norm', e.target.value)}
                    disabled={loading}
                  >
                    <Radio.Button value="Linf">Linf</Radio.Button>
                    <Radio.Button value="L2">L2</Radio.Button>
                  </Radio.Group>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    随机初始化
                    <Tooltip title="在epsilon范围内随机初始化对抗样本，可提高攻击成功率">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </label>
                  <Radio.Group 
                    value={params.random_start} 
                    onChange={(e) => handleParamChange('random_start', e.target.value)}
                    disabled={loading}
                  >
                    <Radio.Button value={true}>开启</Radio.Button>
                    <Radio.Button value={false}>关闭</Radio.Button>
                  </Radio.Group>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    攻击类型
                    <Tooltip title="定向攻击需要指定目标类别">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </label>
                  <Radio.Group 
                    value={params.targeted} 
                    onChange={(e) => handleParamChange('targeted', e.target.value)}
                    disabled={loading}
                  >
                    <Radio.Button value={false}>非定向</Radio.Button>
                    <Radio.Button value={true}>定向</Radio.Button>
                  </Radio.Group>
                </div>
                
                {params.targeted && (
                  <ParameterSlider
                    label="target_label"
                    value={params.target_label}
                    min={0}
                    max={999}
                    step={1}
                    onChange={(v) => handleParamChange('target_label', v)}
                    tooltip="目标类别标签ID"
                    unit=""
                    disabled={loading}
                  />
                )}
              </TabPane>
            </Tabs>
          </Card>
        </Col>
        
        {/* 右侧：结果展示 */}
        <Col xs={24} lg={14}>
          <Card title="攻击结果">
            <ResultDisplay 
              result={result} 
              loading={loading}
              onReset={resetResult}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PGDAttack;