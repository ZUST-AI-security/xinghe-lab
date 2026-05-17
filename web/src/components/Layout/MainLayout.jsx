import React, { useMemo, useState } from 'react';
import {
  Avatar, Button, Drawer, Grid, Layout, Space, Typography,
} from 'antd';
import {
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import SideMenu from './SideMenu';

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const isAdmin = user?.role === 'admin';

  const contentMarginLeft = useMemo(() => {
    if (isMobile) return 0;
    return collapsed ? 88 : 260;
  }, [collapsed, isMobile]);

  const headerTitle = isAdmin ? '星河智安' : '实验工作台';
  const headerSubtitle = isAdmin
    ? '统一查看任务、用户与系统状态'
    : '提交攻击任务、跟踪结果与发起对比实验';

  return (
    <Layout className="xh-shell">
      {!isMobile && (
        <div style={{ position: 'fixed', inset: '0 auto 0 0', zIndex: 20, height: '100vh' }}>
          <SideMenu collapsed={collapsed} onCollapseChange={setCollapsed} />
        </div>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          width={280}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <SideMenu mobile onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout className="xh-main" style={{ marginLeft: contentMarginLeft, transition: 'margin-left 0.2s ease' }}>
        <Header
          className="xh-header"
          style={{
            position: 'sticky', top: 0, zIndex: 10, height: 72,
            padding: isMobile ? '0 16px' : '0 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}
        >
          <Space size={14} align="center" style={{ minWidth: 0, flex: 1 }}>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((v) => !v))}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobile ? 20 : 24, fontWeight: 800, color: 'var(--xh-text)',
                lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {headerTitle}
              </div>
              {!isMobile && (
                <Text style={{
                  display: 'block', fontSize: 13, color: 'var(--xh-text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {headerSubtitle}
                </Text>
              )}
            </div>
          </Space>

          <Space size={12} style={{ flexShrink: 0 }}>
            <Space
              size={10}
              align="center"
              style={{
                padding: isMobile ? '4px 8px' : '6px 10px',
                borderRadius: 14,
                border: '1px solid var(--xh-border)',
                background: 'var(--xh-surface)',
                maxHeight: 56, overflow: 'hidden',
              }}
            >
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)' }}
              />
              {!isMobile && (
                <div style={{ lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ fontWeight: 700, color: 'var(--xh-text)' }}>
                    {user?.full_name || user?.username}
                  </div>
                  <Text style={{ fontSize: 12, color: 'var(--xh-text-secondary)' }}>
                    {isAdmin ? '管理员' : '普通用户'}
                  </Text>
                </div>
              )}
            </Space>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              {!isMobile && '退出'}
            </Button>
          </Space>
        </Header>

        <Content className="xh-content" style={{ minHeight: 'calc(100vh - 72px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="xh-content-inner">{children}</div>
            </motion.div>
          </AnimatePresence>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
