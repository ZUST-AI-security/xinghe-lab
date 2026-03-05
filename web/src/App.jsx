import React from 'react';
import { Layout, Typography, Card, List, Tag, Space, Button, Input, Row, Col, Menu } from 'antd';
import { FileTextOutlined, UserOutlined, CalendarOutlined, SearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

// 模拟论文数据
const data = [
  {
    title: '基于深度学习的网络入侵检测系统研究',
    authors: ['张三', '李四'],
    date: '2024-02-15',
    tags: ['人工智能', '网络安全', '入侵检测'],
    description: '本文提出了一种改进的卷积神经网络模型，用于识别复杂的网络攻击流量，实验结果表明其准确率达到了98.5%...',
  },
  {
    title: '区块链技术在医疗数据安全共享中的应用',
    authors: ['王五', '赵六'],
    date: '2023-11-20',
    tags: ['区块链', '数据安全', '医疗健康'],
    description: '针对医疗数据共享中的隐私保护问题，本文设计了一种基于私有链的去中心化存储架构，确保了数据的可追溯性和安全性...',
  },
  {
    title: '零信任架构下的身份认证协议优化',
    authors: ['陈七'],
    date: '2023-08-05',
    tags: ['零信任', '身份认证', '协议优化'],
    description: '在零信任环境下，传统的单次认证已不足够。本文提出了一种动态风险评估模型，实现了基于上下文的持续身份认证...',
  },
];

const App = () => {
  return (
    <Layout className="layout" style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: '#001529', 
        padding: '0 20px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: '24px', marginRight: '10px' }} />
          <Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>星河智安</Title>
        </div>
        <Menu 
          theme="dark" 
          mode="horizontal" 
          defaultSelectedKeys={['1']} 
          items={[{ key: '1', label: '研究成果' }]} 
          style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0 }} 
        />
      </Header>

      <Content style={{ padding: '20px 10px' }}>
        <Row justify="center">
          <Col xs={24} sm={22} md={20} lg={18} xl={16}>
            <div style={{ textAlign: 'center', marginBottom: 30, marginTop: 10 }}>
              <Title level={2} style={{ fontSize: 'calc(1.2rem + 1vw)' }}>论文研究成果展示</Title>
              <Paragraph type="secondary">展示实验室在网络安全及人工智能领域的学术贡献</Paragraph>
              <Input 
                prefix={<SearchOutlined />} 
                placeholder="搜索论文标题、作者或关键词" 
                style={{ width: '100%', maxWidth: 500, marginTop: 10 }}
                size="large"
              />
            </div>

            <List
              itemLayout="vertical"
              dataSource={data}
              renderItem={(item) => (
                <List.Item style={{ padding: '10px 0' }}>
                  <Card 
                    hoverable 
                    title={
                      <div style={{ whiteSpace: 'normal', lineHeight: '1.4', padding: '10px 0' }}>
                        <FileTextOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                        {item.title}
                      </div>
                    }
                    styles={{ body: { padding: '15px' } }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Row gutter={[8, 8]}>
                        <Col xs={24} sm={12}>
                          <Text type="secondary"><UserOutlined /> 作者: {item.authors.join(', ')}</Text>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text type="secondary"><CalendarOutlined /> 日期: {item.date}</Text>
                        </Col>
                      </Row>
                      
                      <div style={{ margin: '8px 0' }}>
                        {item.tags.map(tag => (
                          <Tag color="blue" key={tag} style={{ marginBottom: '4px' }}>{tag}</Tag>
                        ))}
                      </div>
                      
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {item.description}
                      </Paragraph>
                      
                      <div style={{ textAlign: 'right', marginTop: '10px' }}>
                        <Button type="primary" ghost size="small">查看全文</Button>
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </Col>
        </Row>
      </Content>

      <Footer style={{ textAlign: 'center', color: '#999', padding: '20px 10px' }}>
        星河智安实验室 ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default App;
