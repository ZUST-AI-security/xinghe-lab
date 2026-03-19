import React from 'react';
import { Row, Col, Card, Statistic, Table, Empty, Spin, Divider, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const ResultDisplay = ({ result, loading, onReset }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="攻击执行中..." />
      </div>
    );
  }
  
  if (!result) {
    return (
      <Empty 
        description="请上传图片并配置参数后执行攻击" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }
  
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '类别',
      dataIndex: 'label',
      key: 'label'
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (value) => `${(value * 100).toFixed(2)}%`
    }
  ];
  
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="原始图像" size="small" cover={
            <img 
              src={`data:image/png;base64,${result.original_image}`} 
              alt="Original"
              style={{ width: '100%' }}
            />
          }>
            <Table
              dataSource={result.original_predictions}
              columns={columns}
              size="small"
              pagination={false}
              rowKey={(record, index) => index}
            />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="对抗样本" size="small" cover={
            <img 
              src={`data:image/png;base64,${result.adversarial_image}`} 
              alt="Adversarial"
              style={{ width: '100%' }}
            />
          }>
            <Table
              dataSource={result.adversarial_predictions}
              columns={columns}
              size="small"
              pagination={false}
              rowKey={(record, index) => index}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="扰动热力图" size="small" cover={
            <img 
              src={`data:image/png;base64,${result.heatmap}`} 
              alt="Heatmap"
              style={{ width: '100%' }}
            />
          } />
        </Col>
        
        <Col span={12}>
          <Card title="攻击统计" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="攻击成功率" 
                  value={result.success_rate * 100} 
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: result.success_rate > 0.5 ? '#3f8600' : '#cf1322' }}
                  prefix={result.success_rate > 0.5 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="平均扰动范数" 
                  value={result.avg_perturbation_norm * 255} 
                  suffix="/255"
                  precision={2}
                />
              </Col>
            </Row>
            
            <Divider />
            
            <Statistic 
              title="执行时间" 
              value={result.execution_time} 
              suffix="秒"
              precision={2}
            />
            
            <Divider />
            
            <Tag color={result.success_rate > 0.5 ? 'success' : 'error'}>
              {result.success_rate > 0.5 ? '攻击成功' : '攻击失败'}
            </Tag>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ResultDisplay;