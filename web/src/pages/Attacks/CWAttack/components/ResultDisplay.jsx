/**
 * C&W攻击结果展示组件
 * 支持对比视图、详细信息、扰动可视化
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
  Table,
  Progress
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  LineChartOutlined,
  HeatMapOutlined
} from '@ant-design/icons';
import ComparisonSlider from '../../../../components/Visualization/ComparisonSlider';
import Heatmap from '../../../../components/Visualization/Heatmap';
import ConfidenceChart from '../../../../components/Visualization/ConfidenceChart';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * @typedef {Object} ResultDisplayProps
 * @property {Object} result - 攻击结果
 * @property {string} originalImageUrl - 原始图片URL
 * @property {function} onSaveResult - 保存结果回调
 * @property {function} onExportData - 导出数据回调
 * @property {boolean} loading - 是否加载中
 */

/**
 * 结果展示组件
 * @param {ResultDisplayProps} props
 */
const ResultDisplay = ({
  result,
  originalImageUrl,
  onSaveResult,
  onExportData,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('1');

  // 如果没有结果，显示空状态
  if (!result) {
    return (
      <Card title="攻击结果" variant="borderless">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <LineChartOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <Title level={4} type="secondary" style={{ marginTop: 16 }}>
            请上传图片并运行攻击
          </Title>
          <Text type="secondary">
            调整左侧参数，点击"运行攻击"开始生成对抗样本
          </Text>
        </div>
      </Card>
    );
  }

  // 计算置信度变化
  const confidenceChange = result.adversarial_confidence 
    ? ((result.adversarial_confidence - result.original_confidence) * 100).toFixed(2)
    : 0;

  // 生成Top-5预测数据
  const getTop5Data = (probs, isOriginal = true) => {
    if (!probs) return [];
    
    return probs
      .map((prob, index) => ({
        key: index,
        class: index,
        probability: (prob * 100).toFixed(2),
        isOriginal
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
  };

  const originalTop5 = getTop5Data(result.original_probs, true);
  const adversarialTop5 = getTop5Data(result.adversarial_probs, false);

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_, record, index) => index + 1
    },
    {
      title: '类别',
      dataIndex: 'class',
      key: 'class',
      width: 80,
      render: (classId) => `${classId}`
    },
    {
      title: '置信度',
      dataIndex: 'probability',
      key: 'probability',
      width: 100,
      render: (prob) => `${prob}%`
    },
    {
      title: '可视化',
      dataIndex: 'probability',
      key: 'visual',
      render: (prob) => (
        <Progress 
          percent={parseFloat(prob)} 
          size="small" 
          showInfo={false}
          strokeColor={parseFloat(prob) > 50 ? '#52c41a' : '#1890ff'}
        />
      )
    }
  ];

  // 操作按钮
  const actionButtons = (
    <Space>
      <Button 
        icon={<DownloadOutlined />} 
        onClick={() => onExportData && onExportData(result)}
        disabled={loading}
      >
        导出数据
      </Button>
      <Button 
        icon={<ShareAltOutlined />} 
        onClick={() => onSaveResult && onSaveResult(result)}
        disabled={loading}
      >
        保存结果
      </Button>
    </Space>
  );

  return (
    <Card 
      title="攻击结果" 
      variant="borderless"
      extra={actionButtons}
    >
      {!result.success && (
        <Alert
          message="攻击失败"
          description={result.error_message || "未能生成对抗样本，请尝试调整参数"}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="对比视图" key="1">
          <Row gutter={[16, 16]}>
            {/* 原始图片 */}
            <Col span={12}>
              <Card size="small" title="原始图片">
                <Image
                  src={originalImageUrl}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                  preview={false}
                />
                <div style={{ marginTop: 12 }}>
                  <Statistic
                    title="预测类别"
                    value={`${result.original_class}: ${result.original_class_name}`}
                    valueStyle={{ fontSize: 14, fontWeight: 'bold' }}
                  />
                  <Statistic
                    title="置信度"
                    value={(result.original_confidence * 100).toFixed(2)}
                    suffix="%"
                    valueStyle={{ fontSize: 14, color: '#1890ff' }}
                  />
                </div>
              </Card>
            </Col>
            
            {/* 对抗样本 */}
            <Col span={12}>
              <Card size="small" title="对抗样本">
                {result.adversarial_image ? (
                  <>
                    <Image
                      src={result.adversarial_image}
                      style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                      preview={false}
                    />
                    <div style={{ marginTop: 12 }}>
                      <Statistic
                        title="预测类别"
                        value={`${result.adversarial_class}: ${result.adversarial_class_name}`}
                        valueStyle={{ fontSize: 14, fontWeight: 'bold' }}
                      />
                      <Statistic
                        title="置信度"
                        value={(result.adversarial_confidence * 100).toFixed(2)}
                        suffix="%"
                        valueStyle={{ fontSize: 14, color: result.success ? '#52c41a' : '#ff4d4f' }}
                      />
                      <Statistic
                        title="扰动大小"
                        value={result.perturbation_norm?.toFixed(4)}
                        suffix={result.perturbation_type}
                        valueStyle={{ fontSize: 12 }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">未生成对抗样本</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* 对比滑块 */}
          {result.adversarial_image && (
            <Row style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card size="small" title="对比滑块">
                  <ComparisonSlider
                    before={originalImageUrl}
                    after={result.adversarial_image}
                    beforeLabel="原始图片"
                    afterLabel="对抗样本"
                  />
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        <TabPane tab="置信度分析" key="2">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="原始图片 Top-5 预测">
                <Table
                  dataSource={originalTop5}
                  columns={columns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            
            <Col span={12}>
              <Card size="small" title="对抗样本 Top-5 预测">
                <Table
                  dataSource={adversarialTop5}
                  columns={columns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          {result.original_probs && result.adversarial_probs && (
            <Row style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card size="small" title="置信度变化图">
                  <ConfidenceChart
                    original={result.original_probs}
                    adversarial={result.adversarial_probs}
                    originalClass={result.original_class}
                    adversarialClass={result.adversarial_class}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        <TabPane tab="扰动分析" key="3">
          <Row gutter={[16, 16]}>
            {result.heatmap && (
              <Col span={12}>
                <Card size="small" title="扰动热力图">
                  <Heatmap
                    data={result.heatmap}
                    title="C&W攻击扰动分布"
                  />
                </Card>
              </Col>
            )}
            
            <Col span={result.heatmap ? 12 : 24}>
              <Card size="small" title="扰动统计">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="攻击状态">
                    <span style={{ 
                      color: result.success ? '#52c41a' : '#ff4d4f',
                      fontWeight: 'bold'
                    }}>
                      {result.success ? '成功' : '失败'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="扰动范数">
                    {result.perturbation_norm?.toFixed(6)} ({result.perturbation_type})
                  </Descriptions.Item>
                  <Descriptions.Item label="置信度变化">
                    <span style={{ 
                      color: confidenceChange > 0 ? '#ff4d4f' : '#52c41a'
                    }}>
                      {confidenceChange > 0 ? '+' : ''}{confidenceChange}%
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="攻击耗时">
                    {result.time_elapsed?.toFixed(2)} 秒
                  </Descriptions.Item>
                  <Descriptions.Item label="攻击成功率">
                    <Progress 
                      percent={result.success ? 100 : 0} 
                      size="small" 
                      status={result.success ? 'success' : 'exception'}
                    />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="详细信息" key="4">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="任务ID">
              {result.task_id || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="攻击状态">
              {result.success ? '成功' : '失败'}
            </Descriptions.Item>
            <Descriptions.Item label="原始类别">
              {result.original_class}: {result.original_class_name}
            </Descriptions.Item>
            <Descriptions.Item label="原始置信度">
              {(result.original_confidence * 100).toFixed(2)}%
            </Descriptions.Item>
            {result.adversarial_class && (
              <>
                <Descriptions.Item label="对抗样本类别">
                  {result.adversarial_class}: {result.adversarial_class_name}
                </Descriptions.Item>
                <Descriptions.Item label="对抗样本置信度">
                  {(result.adversarial_confidence * 100).toFixed(2)}%
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="扰动范数">
              {result.perturbation_norm?.toFixed(4)} ({result.perturbation_type})
            </Descriptions.Item>
            <Descriptions.Item label="攻击耗时">
              {result.time_elapsed?.toFixed(2)} 秒
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
                {JSON.stringify(result.attack_params || result.params, null, 2)}
              </pre>
            </Descriptions.Item>
            {result.error_message && (
              <Descriptions.Item label="错误信息">
                <Text type="danger">{result.error_message}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="生成时间">
              {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default ResultDisplay;
