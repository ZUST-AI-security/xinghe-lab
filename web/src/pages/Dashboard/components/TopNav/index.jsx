import React, { useState } from 'react';
import { Layout, Space, Dropdown, Avatar, Badge, Typography } from 'antd';
import { 
  BellOutlined, 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  StarOutlined 
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../store/authStore';
import LanguageSwitch from '../../../../components/Common/LanguageSwitch';
import styles from './TopNav.module.less';

const { Header } = Layout;
const { Text } = Typography;

const TopNav = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const [notifications] = useState([
    { id: 1, title: '系统更新', read: false },
    { id: 2, title: '新算法上线', read: true }
  ]);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>{user?.username}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {user?.role || '研究员'}
          </div>
        </div>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  const notificationItems = notifications.map(item => ({
    key: item.id,
    label: (
      <div className={styles.notificationItem}>
        <Text className={!item.read ? styles.unread : ''}>
          {item.title}
        </Text>
      </div>
    )
  }));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <StarOutlined className={styles.logoIcon} />
          <span className={styles.logoText}>
            {i18n.language === 'zh' ? '星河智安' : 'XingHe ZhiAn'}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <Space size="large">
          {/* 语言切换 */}
          <LanguageSwitch />
          
          {/* 通知中心 */}
          <Dropdown 
            menu={{ items: notificationItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Badge count={unreadCount} size="small">
              <BellOutlined className={styles.icon} />
            </Badge>
          </Dropdown>

          {/* 用户菜单 */}
          <Dropdown 
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Avatar 
              icon={<UserOutlined />} 
              className={styles.avatar}
              style={{ cursor: 'pointer' }}
            />
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default TopNav;
