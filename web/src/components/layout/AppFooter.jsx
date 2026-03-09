import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import { GithubOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Footer } = Layout;
const { Text, Link } = Typography;

const AppFooter = () => {
  return (
    <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0', padding: '40px 0 20px' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '8px' }} />
        <Text strong style={{ fontSize: '18px' }}>星河实验室</Text>
      </div>
      <Text type="secondary" style={{ maxWidth: 600, display: 'inline-block', marginBottom: 20 }}>
        专注于人工智能安全与鲁棒性研究，提供工业级的算法评测与攻防实验环境。
      </Text>
      <Divider dashed />
      <div style={{ color: '#999' }}>
        星河智安实验室 ©{new Date().getFullYear()} Created with ❤️ for AI Security
        <div style={{ marginTop: 8 }}>
          <Link href="https://github.com" target="_blank">
            <GithubOutlined style={{ marginRight: 4 }} /> GitHub Repository
          </Link>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;
