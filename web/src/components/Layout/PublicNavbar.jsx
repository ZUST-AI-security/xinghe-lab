/**
 * 星河智安 (XingHe ZhiAn) - 公开导航栏组件
 * 用于公开页面（首页、关于页），根据登录状态显示不同按钮
 * 移动端：折叠菜单为抽屉，操作按钮收纳到抽屉内
 */

import React, { useState } from 'react';
import { Button, Drawer, Grid, Space, Typography } from 'antd';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  MenuOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PublicNavbar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const go = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const NavLink = ({ path, label, icon, block = false }) => {
    const active = location.pathname === path;
    return (
      <Button
        type={active ? 'primary' : 'text'}
        ghost={active}
        icon={icon}
        onClick={() => go(path)}
        block={block}
        style={{ fontWeight: active ? 700 : 500 }}
      >
        {label}
      </Button>
    );
  };

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
        padding: isMobile ? '0 16px' : '0 24px',
        height: isMobile ? 56 : 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
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
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: isMobile ? 30 : 32,
            height: isMobile ? 30 : 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: isMobile ? 15 : 16,
            flexShrink: 0,
          }}
        >
          星
        </div>
        <Text
          strong
          style={{
            fontSize: isMobile ? 15 : 16,
            color: '#0f172a',
            whiteSpace: 'nowrap',
          }}
        >
          星河智安
        </Text>
      </Link>

      {/* 桌面端：中部导航 + 右侧操作按钮 */}
      {!isMobile && (
        <>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button type="text" onClick={() => navigate('/')}>首页</Button>
            <Button type="text" onClick={() => navigate('/about')}>关于</Button>
          </nav>
          <Space size={8}>
            {isAuthenticated && user ? (
              <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate('/dashboard')}>
                进入控制台
              </Button>
            ) : (
              <>
                <Button icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                  立即登录
                </Button>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate('/register')}>
                  注册账号
                </Button>
              </>
            )}
          </Space>
        </>
      )}

      {/* 移动端：右侧仅展示主操作按钮 + 菜单 */}
      {isMobile && (
        <Space size={6} style={{ flexShrink: 0 }}>
          {isAuthenticated && user ? (
            <Button
              type="primary"
              size="middle"
              icon={<DashboardOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              控制台
            </Button>
          ) : (
            <Button
              type="primary"
              size="middle"
              onClick={() => navigate('/login')}
              style={{ paddingInline: 14 }}
            >
              登录
            </Button>
          )}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={() => setDrawerOpen(true)}
            aria-label="打开菜单"
            style={{ padding: '0 8px' }}
          />
        </Space>
      )}

      {/* 移动端抽屉菜单 */}
      <Drawer
        placement="right"
        width={280}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Space>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              星
            </div>
            <Text strong>星河智安</Text>
          </Space>
        }
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <NavLink path="/" label="首页" icon={<HomeOutlined />} block />
          <NavLink path="/about" label="关于" icon={<InfoCircleOutlined />} block />

          <div
            style={{
              height: 1,
              background: '#e5e7eb',
              margin: '12px 0',
            }}
          />

          {isAuthenticated && user ? (
            <Button
              type="primary"
              icon={<DashboardOutlined />}
              onClick={() => go('/dashboard')}
              block
            >
              进入控制台
            </Button>
          ) : (
            <>
              <Button icon={<LoginOutlined />} onClick={() => go('/login')} block>
                立即登录
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => go('/register')}
                block
              >
                注册账号
              </Button>
            </>
          )}
        </Space>
      </Drawer>
    </header>
  );
};

export default PublicNavbar;
