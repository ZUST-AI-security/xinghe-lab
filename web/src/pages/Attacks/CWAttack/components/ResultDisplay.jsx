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
  Table
} from 'antd';
import {
  DownloadOutlined,
  ShareAltOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import ComparisonSlider from '../../../../components/Visualization/ComparisonSlider';
import Heatmap from '../../../../components/Visualization/Heatmap';
import ConfidenceChart from '../../../../components/Visualization/ConfidenceChart';

const { Title, Text } = Typography;
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

  const originalImage = result.original_image || originalImageUrl;
  const metadata = result.metadata || {};
  const originalPrediction = metadata.original_prediction || null;
  const adversarialPrediction = metadata.adversarial_prediction || null;
  const originalTopClass = result.original_probs?.length
    ? result.original_probs.indexOf(Math.max(...result.original_probs))
    : null;
  const adversarialTopClass = result.adversarial_probs?.length
    ? result.adversarial_probs.indexOf(Math.max(...result.adversarial_probs))
    : null;
  const formatPredictionLabel = (prediction, fallbackClassId) => {
    if (prediction?.class_name) {
      return `${prediction.class_name} (#${prediction.class_id})`;
    }
    return fallbackClassId !== null ? `${fallbackClassId}` : '-';
  };
  const buildTop5 = (probs, top5FromMetadata) => {
    if (Array.isArray(top5FromMetadata) && top5FromMetadata.length > 0) {
      return top5FromMetadata.map((item, index) => ({
        key: `${item.class_id}-${index}`,
        class: item.class_id,
        className: item.class_name,
        probability: Number(((item.confidence || 0) * 100).toFixed(2)),
      }));
    }

    return (probs || [])
    .map((probability, index) => ({
      key: index,
      class: index,
      className: null,
      probability: Number((probability * 100).toFixed(2)),
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
  };

  const originalTop5 = buildTop5(result.original_probs, metadata.original_top5);
  const adversarialTop5 = buildTop5(result.adversarial_probs, metadata.adversarial_top5);

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
      width: 220,
      render: (classId, record) => record.className || `${classId}`
    },
    {
      title: '置信度',
      dataIndex: 'probability',
      key: 'probability',
      width: 100,
      render: (probability) => `${probability}%`,
    }
  ];

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
            <Col span={12}>
              <Card size="small" title="原始图片">
                <Image
                  src={originalImage}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                  preview={false}
                />
                <div style={{ marginTop: 12 }}>
                  <Statistic
                    title="预测类别"
                    value={formatPredictionLabel(originalPrediction, originalTopClass)}
                    valueStyle={{ fontSize: 14, fontWeight: 'bold' }}
                  />
                  <Statistic
                    title="置信度"
                    value={originalTopClass !== null ? ((result.original_probs?.[originalTopClass] || 0) * 100).toFixed(2) : '-'}
                    suffix="%"
                    valueStyle={{ fontSize: 14, color: '#1890ff' }}
                  />
                </div>
              </Card>
            </Col>
            
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
                        value={formatPredictionLabel(adversarialPrediction, adversarialTopClass)}
                        valueStyle={{ fontSize: 14, fontWeight: 'bold' }}
                      />
                      <Statistic
                        title="置信度"
                        value={adversarialTopClass !== null ? ((result.adversarial_probs?.[adversarialTopClass] || 0) * 100).toFixed(2) : '-'}
                        suffix="%"
                        valueStyle={{ fontSize: 14, color: result.success ? '#52c41a' : '#ff4d4f' }}
                      />
                      <Statistic
                        title="扰动大小"
                        value={metadata.l2_norm?.toFixed?.(4) ?? metadata.linf_norm?.toFixed?.(4) ?? '-'}
                        suffix={metadata.linf_norm !== undefined ? 'Linf' : 'L2'}
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

          {result.adversarial_image && (
            <Row style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card size="small" title="对比滑块">
                  <ComparisonSlider
                    leftImage={originalImage}
                    rightImage={result.adversarial_image}
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
                    originalProbs={result.original_probs}
                    adversarialProbs={result.adversarial_probs}
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
                    image={result.heatmap}
                    title="攻击扰动分布"
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
                    {metadata.l2_norm?.toFixed?.(6) ?? '-'} {metadata.linf_norm !== undefined ? `(Linf: ${metadata.linf_norm.toFixed(6)})` : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="攻击耗时">
                    {result.time_elapsed?.toFixed(2)} 秒
                  </Descriptions.Item>
                  <Descriptions.Item label="迭代信息">
                    {metadata.iterations ?? metadata.num_iter ?? '-'}
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
            <Descriptions.Item label="成功率">
              {metadata.success_rate !== undefined ? `${(metadata.success_rate * 100).toFixed(2)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="原始类别">
              {formatPredictionLabel(originalPrediction, originalTopClass)}
            </Descriptions.Item>
            <Descriptions.Item label="原始置信度">
              {originalTopClass !== null ? `${((result.original_probs?.[originalTopClass] || 0) * 100).toFixed(2)}%` : '-'}
            </Descriptions.Item>
            {adversarialTopClass !== null && (
              <>
                <Descriptions.Item label="对抗样本类别">
                  {formatPredictionLabel(adversarialPrediction, adversarialTopClass)}
                </Descriptions.Item>
                <Descriptions.Item label="对抗样本置信度">
                  {`${((result.adversarial_probs?.[adversarialTopClass] || 0) * 100).toFixed(2)}%`}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="类别变化">
              {metadata.original_class_id !== undefined && metadata.adversarial_class_id !== undefined
                ? `${metadata.original_class_id} -> ${metadata.adversarial_class_id}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="扰动范数">
              {metadata.l2_norm?.toFixed?.(4) ?? '-'}
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
