import React from 'react';
import { Layout } from 'antd';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

const { Content } = Layout;

const MainLayout = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content style={{ 
        background: '#f5f7fa', 
        minHeight: 'calc(100vh - 64px - 180px)', // Adjust based on header/footer height
        paddingBottom: '60px'
      }}>
        {children}
      </Content>
      <AppFooter />
    </Layout>
  );
};

export default MainLayout;
