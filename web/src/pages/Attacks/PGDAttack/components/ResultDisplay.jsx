/**
 * PGD攻击结果显示组件
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Image,
  Statistic,
  Descriptions,
  Tabs,
  Alert,
  Typography,
  Space,
  Button,
  Progress,
  Tag
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  LineChartOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ResultDisplay = ({ result, originalImage, onRerun, onSave, loading = false }) => {
  const [activeTab, setActiveTab] = useState('1');

  if (!result) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <LineChartOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <Title level={4} type="secondary" style={{ marginTop: 16 }}>
            暂无攻击结果
          </Title>
          <Text type="secondary">
            请上传图片并点击"运行 PGD 攻击"按钮
          </Text>
        </div>
      </Card>
    );
  }

  // 获取Top预测
  const getTopPrediction = (probs) => {
    if (!probs || !Array.isArray(probs)) return { class: 'N/A', prob: 0 };
    const maxProb = Math.max(...probs);
    const classId = probs.indexOf(maxProb);
    return { class: classId, prob: maxProb };
  };

  const originalTop = getTopPrediction(result.original_probs);
  const adversarialTop = getTopPrediction(result.adversarial_probs);

  // 获取Top5数据
  const getTop5 = (probs) => {
    if (!probs || !Array.isArray(probs)) return [];
    return probs
      .map((prob, idx) => ({ class: idx, prob: prob * 100 }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);
  };

  const originalTop5 = getTop5(result.original_probs);
  const adversarialTop5 = getTop5(result.adversarial_probs);

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="对比视图" key="1">
          <Row gutter={[16, 16]}>
            {/* 原始图片 */}
            <Col span={12}>
              <Card size="small" title="原始图片" style={{ height: '100%' }}>
                <Image
                  src={originalImage || result.original_image}
                  style={{ width: '100%', maxHeight: 250, objectFit: 'contain' }}
                  preview={false}
                />
                <div style={{ marginTop: 12 }}>
                  <Statistic
                    title="预测类别"
                    value={`${originalTop.class}`}
                    valueStyle={{ fontSize: 14 }}
                  />
                  <Statistic
                    title="置信度"
                    value={(originalTop.prob * 100).toFixed(2)}
                    suffix="%"
                    valueStyle={{ fontSize: 14, color: '#1890ff' }}
                  />
                </div>
              </Card>
            </Col>
            
            {/* 对抗样本 */}
            <Col span={12}>
              <Card 
                size="small" 
                title={
                  <Space>
                    <span>对抗样本</span>
                    {result.success && <Tag color="success">攻击成功</Tag>}
                    {!result.success && <Tag color="error">攻击失败</Tag>}
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <Image
                  src={result.adversarial_image}
                  style={{ width: '100%', maxHeight: 250, objectFit: 'contain' }}
                  preview={false}
                />
                <div style={{ marginTop: 12 }}>
                  <Statistic
                    title="预测类别"
                    value={`${adversarialTop.class}`}
                    valueStyle={{ fontSize: 14 }}
                  />
                  <Statistic
                    title="置信度"
                    value={(adversarialTop.prob * 100).toFixed(2)}
                    suffix="%"
                    valueStyle={{ 
                      fontSize: 14, 
                      color: result.success ? '#52c41a' : '#ff4d4f' 
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          {/* 扰动可视化 */}
          {result.heatmap && (
            <Row style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card size="small" title="扰动热力图">
                  <Image
                    src={result.heatmap}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                    preview={false}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    红色区域表示扰动较大的像素
                  </Text>
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        <TabPane tab="置信度分析" key="2">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="原始图片 Top-5">
                {originalTop5.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>类别 {item.class}</Text>
                      <Text strong>{item.prob.toFixed(2)}%</Text>
                    </div>
                    <Progress 
                      percent={item.prob} 
                      size="small" 
                      showInfo={false}
                      strokeColor={idx === 0 ? '#1890ff' : '#d9d9d9'}
                    />
                  </div>
                ))}
              </Card>
            </Col>
            
            <Col span={12}>
              <Card size="small" title="对抗样本 Top-5">
                {adversarialTop5.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>类别 {item.class}</Text>
                      <Text strong>{item.prob.toFixed(2)}%</Text>
                    </div>
                    <Progress 
                      percent={item.prob} 
                      size="small" 
                      showInfo={false}
                      strokeColor={idx === 0 && result.success ? '#52c41a' : '#d9d9d9'}
                    />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="攻击详情" key="3">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="攻击状态">
              <Tag color={result.success ? 'success' : 'error'}>
                {result.success ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="L2 扰动范数">
              {result.metadata?.avg_l2_norm?.toFixed(6) || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="L∞ 扰动范数">
              {result.metadata?.avg_linf_norm?.toFixed(6) || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="攻击成功率">
              {(result.metadata?.success_rate * 100).toFixed(2)}%
            </Descriptions.Item>
            <Descriptions.Item label="执行时间">
              {result.time_elapsed?.toFixed(2)} 秒
            </Descriptions.Item>
            <Descriptions.Item label="迭代次数">
              {result.metadata?.iterations || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="攻击参数">
              <pre style={{ 
                margin: 0, 
                fontSize: 12, 
                background: '#f5f5f5', 
                padding: 8,
                borderRadius: 4,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                {JSON.stringify(result.params, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
      </Tabs>

      {/* 操作按钮 */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={onRerun}
            loading={loading}
          >
            重新攻击
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={onSave}
            disabled={!result}
          >
            保存结果
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ResultDisplay;