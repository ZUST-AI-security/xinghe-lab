import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Card, Tag, Button, Spin, Empty, Breadcrumb } from 'antd';
import { ArrowRightOutlined, ExperimentOutlined, HomeOutlined } from '@ant-design/icons';
import { algorithmService } from '../../services/api';

const { Title, Paragraph, Text } = Typography;

const AlgorithmList = () => {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    algorithmService.getAlgorithms()
      .then(res => {
        setAlgorithms(res.data || []);
      })
      .catch(err => {
        console.error('Failed to fetch algorithms:', err);
        setAlgorithms([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleStartExperiment = (algoId) => {
    navigate(`/attack/${algoId}`);
  };

  return (
    <div style={{ padding: '24px 40px' }}>
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ExperimentOutlined />
          <span>算法实验</span>
        </Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ marginBottom: 40 }}>
        <Title level={2}>
          <ExperimentOutlined /> 算法实验列表
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '1.1rem' }}>
          选择一个基础模型来开启对抗攻防实验。
        </Paragraph>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="加载算法中..." />
        </div>
      ) : algorithms.length > 0 ? (
        <Row gutter={[24, 24]}>
          {algorithms.map(algo => (
            <Col key={algo.id} xs={24} sm={12} md={8} lg={6}>
              <Card 
                hoverable
                style={{ height: '100%', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                actions={[
                  <Button 
                    type="primary" 
                    icon={<ArrowRightOutlined />} 
                    onClick={() => handleStartExperiment(algo.id)}
                    block
                  >
                    开始实验
                  </Button>
                ]}
              >
                <div style={{ flex: 1 }}>
                  <Title level={4} style={{ marginBottom: 12 }}>{algo.name}</Title>
                  <Paragraph ellipsis={{ rows: 3 }} type="secondary" style={{ marginBottom: 16 }}>
                    {algo.description || '暂无描述。'}
                  </Paragraph>
                  <div style={{ marginTop: 'auto' }}>
                    <Tag color="blue">{algo.id.includes('resnet') ? '图像分类' : '目标检测'}</Tag>
                    <Tag color="cyan">Deep Learning</Tag>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description={
            <Space direction="vertical">
              <Text type="secondary">暂无可用算法</Text>
              <Button type="link" onClick={() => window.location.reload()}>重新加载</Button>
            </Space>
          } 
        />
      )}
    </div>
  );
};

export default AlgorithmList;
