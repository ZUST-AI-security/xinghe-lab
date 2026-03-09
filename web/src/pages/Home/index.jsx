import React from 'react';
import { Typography, Button, Row, Col, Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  ExperimentOutlined, 
  SafetyCertificateOutlined, 
  RocketOutlined, 
  EyeOutlined 
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: '对抗攻防实验',
      description: '提供主流的对抗性攻击算法（如 FGSM, PGD, CW）及防御效果实时演示。',
      icon: <BugOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
    },
    {
      title: '模型鲁棒性评测',
      description: '对深度学习模型在各种噪声、扰动下的稳定性进行量化评估。',
      icon: <SafetyCertificateOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
    },
    {
      title: '可视化分析',
      description: '热力图、置信度对比图、攻击前后对比，多维度揭示模型决策机理。',
      icon: <EyeOutlined style={{ fontSize: '32px', color: '#faad14' }} />,
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)', 
        padding: '100px 20px', 
        textAlign: 'center',
        color: '#fff'
      }}>
        <Title style={{ color: '#fff', fontSize: '3.5rem', marginBottom: '24px' }}>
          星河实验室
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.5rem', maxWidth: 800, margin: '0 auto 40px' }}>
          探索人工智能安全的星辰大海。
          <br />
          工业级 AI 攻防实验平台，实时评估您的模型安全性。
        </Paragraph>
        <Space size="large">
          <Button 
            type="primary" 
            size="large" 
            icon={<RocketOutlined />} 
            onClick={() => navigate('/algorithms')}
            style={{ height: '50px', padding: '0 32px', fontSize: '18px' }}
          >
            进入实验台
          </Button>
          <Button 
            ghost 
            size="large" 
            onClick={() => navigate('/about')}
            style={{ height: '50px', padding: '0 32px', fontSize: '18px' }}
          >
            了解更多
          </Button>
        </Space>
      </div>

      {/* Feature Section */}
      <div style={{ padding: '80px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[32, 32]} justify="center">
          {features.map((item, index) => (
            <Col key={index} xs={24} md={8}>
              <Card 
                hoverable 
                style={{ height: '100%', textAlign: 'center', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                cover={<div style={{ paddingTop: '40px' }}>{item.icon}</div>}
              >
                <Title level={3} style={{ marginTop: '16px' }}>{item.title}</Title>
                <Paragraph type="secondary" style={{ fontSize: '16px' }}>
                  {item.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Quick Start Section */}
      <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center' }}>
        <Title level={2}>准备好开始了吗？</Title>
        <Paragraph type="secondary" style={{ marginBottom: '32px' }}>
          只需点击下方按钮，选择您感兴趣的算法进行实验。
        </Paragraph>
        <Button 
          type="primary" 
          shape="round" 
          size="large" 
          icon={<ExperimentOutlined />}
          onClick={() => navigate('/algorithms')}
        >
          立即开始实验
        </Button>
      </div>
    </div>
  );
};

// Add BugOutlined icon for use in features
import { BugOutlined } from '@ant-design/icons';

export default Home;
