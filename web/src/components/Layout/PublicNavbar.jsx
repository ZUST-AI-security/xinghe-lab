/**
 * 星河智安 (XingHe ZhiAn) - 公开导航栏组件
 * 用于公开页面（首页、关于页），根据登录状态显示不同按钮
 */

import React from 'react';
import { Button, Space, Typography } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Text } = Typography;

const PublicNavbar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Logo / 平台名称 */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          星
        </div>
        <Text
          strong
          style={{
            fontSize: 16,
            color: '#0f172a',
            whiteSpace: 'nowrap',
          }}
        >
          星河智安
        </Text>
      </Link>

      {/* 导航链接 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="text" onClick={() => navigate('/')}>
          首页
        </Button>
        <Button type="text" onClick={() => navigate('/about')}>
          关于
        </Button>
      </nav>

      {/* 右侧操作按钮 */}
      <Space size={8}>
        {isAuthenticated && user ? (
          <Button
            type="primary"
            icon={<DashboardOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            进入控制台
          </Button>
        ) : (
          <>
            <Button
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
            >
              立即登录
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => navigate('/register')}
            >
              注册账号
            </Button>
          </>
        )}
      </Space>
    </header>
  );
};

export default PublicNavbar;
