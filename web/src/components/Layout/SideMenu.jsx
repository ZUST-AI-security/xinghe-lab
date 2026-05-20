import React, { useState } from 'react';
import { Layout, Menu, Modal, Space } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  HistoryOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useAuthStore } from '../../store/authStore';
import BorderBeam from '../MagicUI/BorderBeam';
import FlickeringGrid from '../MagicUI/FlickeringGrid';
import Spotlight from '../Aceternity/Spotlight';
import GlowingEffect from '../Aceternity/GlowingEffect';

const { Sider } = Layout;

const baseAttackItems = [
  { key: '/attacks/fgsm', label: 'FGSM', icon: <ThunderboltOutlined /> },
  { key: '/attacks/ifgsm', label: 'I-FGSM', icon: <ThunderboltOutlined /> },
  { key: '/attacks/pgd', label: 'PGD', icon: <ThunderboltOutlined /> },
  { key: '/attacks/cw', label: 'C&W', icon: <ThunderboltOutlined /> },
  { key: '/attacks/deepfool', label: 'DeepFool', icon: <ThunderboltOutlined /> },
];

const buildMenuItems = (isAdmin) => {
  const items = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
    { key: '/tasks/history', icon: <HistoryOutlined />, label: '我的任务' },
    {
      key: '/attacks',
      icon: <SafetyOutlined />,
      label: '攻击实验',
      children: [
        ...baseAttackItems,
        { key: '/attacks/compare', label: '对比模式', icon: <BarChartOutlined /> },
      ],
    },
  ];

  if (isAdmin) {
    items.push({
      key: '/admin',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '系统概览' },
        { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/admin/attack-history', icon: <HistoryOutlined />, label: '攻击历史' },
        { key: '/admin/logs', icon: <AppstoreOutlined />, label: '系统日志' },
        { key: '/admin/config', icon: <SettingOutlined />, label: '系统配置' },
      ],
    });
  }

  return items;
};

const findOpenKeys = (pathname, items) => {
  const matched = [];
  items.forEach((item) => {
    if (item.children?.some((child) => pathname.startsWith(child.key))) {
      matched.push(item.key);
    }
  });
  return matched;
};

const SideMenu = ({
  collapsed = false,
  mobile = false,
  onNavigate,
  onCollapseChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const items = buildMenuItems(isAdmin);
  const openKeys = findOpenKeys(location.pathname, items);
  const [logoPreview, setLogoPreview] = useState(false);

  const handleSelect = ({ key }) => {
    navigate(key);
    onNavigate?.();
  };

  return (
    <Sider
      className="xh-sidebar"
      width={260}
      collapsedWidth={mobile ? 0 : 88}
      collapsed={mobile ? false : collapsed}
      theme="light"
      breakpoint="lg"
      onCollapse={onCollapseChange}
      style={{ borderRight: 'none', position: 'relative', overflow: 'hidden' }}
    >
      {/* FlickeringGrid background — subtle animated particle overlay */}
      <FlickeringGrid
        squareSize={3}
        gridGap={8}
        flickerChance={0.08}
        color="rgb(96, 165, 250)"
        maxOpacity={0.25}
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />
      <div
        className="xh-side-brand"
        style={{
          padding: collapsed && !mobile ? '20px 16px' : '22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* GlowingEffect — cursor-tracking conic gradient glow */}
        <GlowingEffect spread={30} proximity={120} />
        <Spotlight fill="rgba(22,119,255,0.15)" style={{ opacity: 0.4, top: '-80%', left: '-20%' }} />

        <Space direction="vertical" size={10} style={{ width: '100%', position: 'relative', zIndex: 1 }}>
          <Space align="center" size={12}>
            <motion.div
              whileHover={{ scale: 1.08, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              onClick={() => setLogoPreview(true)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(22,119,255,0.35)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img src="/logo.png" alt="星河智安" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>
            {(!collapsed || mobile) && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fbff', letterSpacing: 0.5 }}>
                  星河智安
                </div>
                <div style={{ color: 'rgba(226, 232, 240, 0.6)', fontSize: 11, fontWeight: 500, letterSpacing: 0.3 }}>
                  AI Security Platform
                </div>
              </div>
            )}
          </Space>

          {(!collapsed || mobile) && (
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                background: isAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                color: '#dbeafe', fontSize: 11, fontWeight: 700,
              }}>
                {isAdmin ? '管理员' : '实验用户'}
              </span>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                color: '#e2e8f0', fontSize: 11, fontWeight: 500,
              }}>
                {user?.username || '访客'}
              </span>
            </div>
          )}
        </Space>
      </div>

      <Menu
        className="xh-side-menu"
        mode="inline"
        items={items}
        selectedKeys={[location.pathname]}
        defaultOpenKeys={openKeys}
        onClick={handleSelect}
        style={{ padding: '14px 10px 18px' }}
      />

      <Modal
        open={logoPreview}
        onCancel={() => setLogoPreview(false)}
        footer={null}
        centered
        width={360}
        styles={{ body: { padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
      >
        <img src="/logo.png" alt="星河智安" style={{ width: '100%', borderRadius: 16 }} />
      </Modal>
    </Sider>
  );
};

export default SideMenu;
