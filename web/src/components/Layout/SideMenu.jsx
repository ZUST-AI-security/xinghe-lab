import React from 'react';
import { Layout, Menu, Space, Tag, Typography } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';

const { Sider } = Layout;
const { Text } = Typography;

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
    { key: '/robustness', icon: <ExperimentOutlined />, label: '鲁棒性评估' },
    { key: '/sensitivity', icon: <BarChartOutlined />, label: '敏感性分析' },
    { key: '/leaderboard', icon: <TrophyOutlined />, label: '鲁棒性排行榜' },
  ];

  if (isAdmin) {
    items.push({
      key: '/admin',
      icon: <SettingOutlined />,
      label: '后台管理',
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
      style={{ borderRight: 'none' }}
    >
      <div
        className="xh-side-brand"
        style={{
          padding: collapsed && !mobile ? '20px 16px' : '22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space align="center" size={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              星
            </div>
            {(!collapsed || mobile) && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fbff' }}>
                  星河智安
                </div>
                <Text style={{ color: 'rgba(226, 232, 240, 0.72)', fontSize: 12 }}>
                  AI 安全实验平台
                </Text>
              </div>
            )}
          </Space>

          {(!collapsed || mobile) && (
            <Space wrap>
              <Tag
                bordered={false}
                style={{
                  borderRadius: 999,
                  background: isAdmin ? 'rgba(59, 130, 246, 0.18)' : 'rgba(148, 163, 184, 0.18)',
                  color: '#dbeafe',
                  fontWeight: 700,
                }}
              >
                {isAdmin ? '管理员' : '实验用户'}
              </Tag>
              <Tag
                bordered={false}
                style={{
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                }}
              >
                {user?.username || '访客'}
              </Tag>
            </Space>
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
    </Sider>
  );
};

export default SideMenu;
