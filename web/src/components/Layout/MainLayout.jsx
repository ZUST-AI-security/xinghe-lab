import React, { useMemo, useState } from 'react';
import { Button, Drawer, Grid, Layout, Space } from 'antd';
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, HomeOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import SideMenu from './SideMenu';
import AnimatedGradientText from '../MagicUI/AnimatedGradientText';
import HyperText from '../MagicUI/HyperText';
import BorderBeam from '../MagicUI/BorderBeam';
import MovingBorder from '../Aceternity/MovingBorder';

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
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
            position: 'sticky', top: 0, zIndex: 10,
            height: 'auto', minHeight: 72,
            lineHeight: 'normal',
            padding: isMobile ? '12px 16px' : '12px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px) saturate(200%)',
            WebkitBackdropFilter: 'blur(20px) saturate(200%)',
            borderBottom: '1px solid var(--xh-border)',
            overflow: 'visible',
          }}
        >
          {/* Animated border beam at bottom — full header width, enough height for gradient rotation */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none' }}>
            <BorderBeam size={180} duration={12} delay={0} />
          </div>

          {/* Decorative glow behind title */}
          <div style={{
            position: 'absolute', top: -40, left: 60, width: 280, height: 120,
            background: 'radial-gradient(ellipse, rgba(22,119,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Left section */}
          <Space size={14} align="center" style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="text"
                icon={isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((v) => !v))}
                style={{ borderRadius: 10, width: 36, height: 36 }}
              />
            </motion.div>

            <div style={{ minWidth: 0 }}>
              <AnimatedGradientText
                style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, lineHeight: 1.4, letterSpacing: 0.5 }}
              >
                {headerTitle}
              </AnimatedGradientText>
              {!isMobile && (
                <HyperText
                  text={headerSubtitle}
                  duration={600}
                  animateOnView={false}
                  style={{
                    display: 'block', fontSize: 11, fontWeight: 500,
                    color: 'var(--xh-text-tertiary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginTop: 1, letterSpacing: 0.3,
                  }}
                />
              )}
            </div>
          </Space>

          {/* Right section */}
          <Space size={12} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <MovingBorder
              duration={4000}
              colors={['rgba(22,119,255,0.4)', 'rgba(124,58,237,0.4)', 'rgba(6,182,212,0.4)', 'rgba(22,119,255,0.4)']}
              style={{ padding: 1.5, borderRadius: 14 }}
            >
              <Space
                size={10}
                align="center"
                style={{
                  padding: isMobile ? '5px 10px' : '6px 14px',
                  borderRadius: 13,
                  background: 'var(--xh-surface)',
                  maxHeight: 56, overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)',
                  display: 'grid', placeItems: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(22,119,255,0.25)',
                }}>
                  {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                </div>
                {!isMobile && (
                  <div style={{ lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--xh-text)' }}>
                      {user?.full_name || user?.username}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', marginTop: 1 }}>
                      {isAdmin ? '管理员' : '普通用户'}
                    </div>
                  </div>
                )}
              </Space>
            </MovingBorder>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
                style={{
                  borderRadius: 10, height: 36,
                  background: 'linear-gradient(135deg, rgba(22,119,255,0.06), rgba(22,119,255,0.02))',
                  borderColor: 'rgba(22,119,255,0.15)',
                  color: '#1677ff',
                  fontWeight: 600,
                }}
              >
                {!isMobile && '首页'}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                icon={<LogoutOutlined />}
                onClick={logout}
                style={{
                  borderRadius: 10, height: 36,
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))',
                  borderColor: 'rgba(239,68,68,0.15)',
                  color: '#ef4444',
                  fontWeight: 600,
                }}
              >
                {!isMobile && '退出'}
              </Button>
            </motion.div>
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
