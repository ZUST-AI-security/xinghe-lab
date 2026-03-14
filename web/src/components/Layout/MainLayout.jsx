/**
 * 星河智安 (XingHe ZhiAn) - 主布局组件
 * 应用的主要布局结构
 */

import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import { useAuthStore } from '../../store/authStore';
import SideMenu from './SideMenu';
import PropTypes from 'prop-types';

const { Header, Content, Sider } = Layout;

const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <SideMenu collapsed={collapsed} />
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: '64px',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 600,
              background: 'linear-gradient(45deg, #1890ff, #722ed1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              星河智安
            </h1>
            <span style={{ 
              marginLeft: '12px', 
              color: '#8c8c8c', 
              fontSize: '14px' 
            }}>
              AI安全攻击可视化平台
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#262626' }}>
              欢迎，{user?.full_name || user?.username}
            </span>
          </div>
        </Header>
        
        <Content
          style={{
            margin: '0',
            overflow: 'initial',
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainLayout;
