/**
 * 星河智安 (XingHe ZhiAn) - 侧边菜单组件
 * 应用的主导航菜单
 */

import React, { useState } from 'react';
import { Menu, Button, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  HistoryOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const SideMenu = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: '主页',
    },
    {
      key: '/attacks',
      icon: <ThunderboltOutlined />,
      label: '攻击算法',
      children: [
        {
          key: '/attacks/cw',
          icon: <SafetyOutlined />,
          label: 'C&W攻击',
        },
        {
          key: '/attacks/fgsm',
          icon: <ExperimentOutlined />,
          label: 'FGSM攻击',
          disabled: true,
        },
        {
          key: '/attacks/pgd',
          icon: <ExperimentOutlined />,
          label: 'PGD攻击',
          disabled: true,
        },
        {
          key: '/attacks/deepfool',
          icon: <ExperimentOutlined />,
          label: 'DeepFool攻击',
          disabled: true,
        },
      ],
    },
    {
      key: '/models',
      icon: <DatabaseOutlined />,
      label: '模型管理',
      children: [
        {
          key: '/models/classification',
          icon: <BarChartOutlined />,
          label: '分类模型',
        },
        {
          key: '/models/detection',
          icon: <SafetyOutlined />,
          label: '检测模型',
        },
      ],
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '攻击历史',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      disabled: true,
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    
    // 精确匹配
    if (pathname === '/attacks/cw') {
      return ['/attacks/cw'];
    }
    
    // 模糊匹配
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (pathname.startsWith(child.key)) {
            return [child.key];
          }
        }
      } else if (pathname.startsWith(item.key)) {
        return [item.key];
      }
    }
    
    return [pathname];
  };

  // 获取展开的菜单项
  const getOpenKeys = () => {
    const pathname = location.pathname;
    const openKeys = [];
    
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (pathname.startsWith(child.key)) {
            openKeys.push(item.key);
            break;
          }
        }
      }
    }
    
    return openKeys;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 折叠按钮 */}
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <Tooltip title={collapsed ? '展开菜单' : '收起菜单'}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => {}}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
        </Tooltip>
      </div>

      {/* 菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          flex: 1, 
          borderRight: 0,
        }}
      />

      {/* 底部信息 */}
      {!collapsed && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderTop: '1px solid #f0f0f0',
          color: '#8c8c8c',
          fontSize: '12px',
        }}>
          <div>星河智安 v1.0.0</div>
          <div style={{ marginTop: '4px' }}>AI安全研究平台</div>
        </div>
      )}
    </div>
  );
};

export default SideMenu;
