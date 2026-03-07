import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Row, Col, Card, Tag, Button, Spin, Empty } from 'antd';
import { ArrowRightOutlined, ExperimentOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { algorithmService } from '../../services/api';

const { Title, Paragraph, Text } = Typography;

const Home = () => {
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
    <div style={{ padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title level={1} style={{ fontSize: '3rem', marginBottom: 20 }}>
          星河智安 <span style={{ color: '#1890ff' }}>算法实验室</span>
        </Title>
        <Paragraph style={{ fontSize: '1.2rem', color: '#666', maxWidth: 800, margin: '0 auto' }}>
          提供先进的人工智能安全攻防实验平台，实时演示对抗性攻击、鲁棒性分析及防御策略验证。
        </Paragraph>
      </div>

      <Title level={2} style={{ marginBottom: 30, textAlign: 'center' }}>
        <ExperimentOutlined /> 可选实验算法
      </Title>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" description="加载算法中..." />
        </div>
      ) : algorithms.length > 0 ? (
        <Row gutter={[24, 24]} justify="center">
          {algorithms.map(algo => (
            <Col key={algo.id} xs={24} sm={12} md={8} lg={6}>
              <Card 
                hoverable
                style={{ height: '100%', borderRadius: '15px', overflow: 'hidden' }}
                actions={[
                  <Button 
                    type="primary" 
                    icon={<ArrowRightOutlined />} 
                    onClick={() => handleStartExperiment(algo.id)}
                  >
                    开始实验
                  </Button>
                ]}
              >
                <Card.Meta
                  title={<Title level={4}>{algo.name}</Title>}
                  description={
                    <div style={{ minHeight: 120 }}>
                      <Paragraph ellipsis={{ rows: 3 }} type="secondary">
                        {algo.description}
                      </Paragraph>
                      <div style={{ marginTop: 10 }}>
                        <Tag color="blue">{algo.id.includes('resnet') ? '分类算法' : '检测算法'}</Tag>
                        <Tag color="cyan">Pytorch</Tag>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无可用算法，请检查后端连接" />
      )}
    </div>
  );
};

export default Home;
