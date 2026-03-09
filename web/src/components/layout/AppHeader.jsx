import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  ExperimentOutlined, 
  InfoCircleOutlined, 
  SafetyCertificateOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  const location = useLocation();

  const menuItems = [
    { 
      key: '/', 
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link> 
    },
    { 
      key: '/algorithms', 
      icon: <ExperimentOutlined />,
      label: <Link to="/algorithms">算法实验</Link> 
    },
    { 
      key: '/about', 
      icon: <InfoCircleOutlined />,
      label: <Link to="/about">关于</Link> 
    },
    { 
      key: '/test', 
      icon: <BugOutlined />,
      label: <Link to="/test">功能测试</Link> 
    }
  ];

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      background: '#001529', 
      padding: '0 40px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginRight: '40px' }}>
        <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: '28px', marginRight: '12px' }} />
        <Title level={3} style={{ color: '#fff', margin: 0, letterSpacing: '1px' }}>星河实验室</Title>
      </Link>
      <Menu 
        theme="dark" 
        mode="horizontal" 
        selectedKeys={[location.pathname]}
        style={{ flex: 1, borderBottom: 'none' }} 
        items={menuItems}
      />
    </Header>
  );
};

export default AppHeader;
