import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Typography, Menu, Space } from 'antd';
import { SafetyCertificateOutlined, ExperimentOutlined, HomeOutlined } from '@ant-design/icons';
import Home from './pages/Home';
import AttackLab from './pages/AttackLab';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App = () => {
  return (
    <Router>
      <Layout className="layout" style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: '#001529', 
          padding: '0 20px',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: '24px', marginRight: '10px' }} />
            <Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>星河智安</Title>
          </Link>
          <Menu 
            theme="dark" 
            mode="horizontal" 
            style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0 }} 
            items={[
              { 
                key: '/', 
                label: <Link to="/"><HomeOutlined /> 首页</Link> 
              },
              { 
                key: '/attack-lab', 
                label: <Link to="/attack-lab"><ExperimentOutlined /> 算法实验台</Link> 
              }
            ]}
          />
        </Header>

        <Content style={{ minHeight: 'calc(100vh - 128px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/attack-lab" element={<AttackLab />} />
          </Routes>
        </Content>

        <Footer style={{ textAlign: 'center', color: '#999', padding: '20px 10px' }}>
          星河智安实验室 ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Router>
  );
};

export default App;
