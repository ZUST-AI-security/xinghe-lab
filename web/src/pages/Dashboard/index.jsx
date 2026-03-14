import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Card, Typography, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import TopNav from './components/TopNav';
import WelcomeBanner from './components/WelcomeBanner';
import StatCards from './components/StatCards';
import QuickStart from './components/QuickStart';
import RecentActivity from './components/RecentActivity';
import ExploreNav from './components/ExploreNav';
import { useDashboardData } from './hooks/useDashboardData';
import styles from './Dashboard.module.less';

const { Content } = Layout;
const { Title } = Typography;

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { 
    stats, 
    recentActivities, 
    algorithmUsage, 
    gpuLoad, 
    queueLength,
    loading 
  } = useDashboardData();

  // 设置CSS变量
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', '#F5F7FA');
    root.style.setProperty('--bg-secondary', '#FFFFFF');
    root.style.setProperty('--bg-tertiary', '#F0F2F5');
    root.style.setProperty('--accent-primary', '#1E6DF2');
    root.style.setProperty('--accent-secondary', '#7B2EDA');
    root.style.setProperty('--accent-glow', '#00B8D9');
    root.style.setProperty('--text-primary', '#1A1F36');
    root.style.setProperty('--text-secondary', '#4A5568');
    root.style.setProperty('--text-tertiary', '#718096');
    root.style.setProperty('--border-color', '#E2E8F0');
    root.style.setProperty('--success', '#10B981');
    root.style.setProperty('--warning', '#F59E0B');
    root.style.setProperty('--error', '#EF4444');
    root.style.setProperty('--card-shadow', '0 4px 20px rgba(0, 0, 0, 0.02), 0 2px 8px rgba(0, 0, 0, 0.02)');
    root.style.setProperty('--card-shadow-hover', '0 12px 28px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(30, 109, 242, 0.08)');
  }, []);

  return (
    <Layout className={styles.dashboard}>
      <TopNav />
      
      <Content className={styles.content}>
        <div className={styles.container}>
          {/* 欢迎区域 */}
          <WelcomeBanner 
            username={user?.username || 'User'} 
            gpuLoad={gpuLoad}
            queueLength={queueLength}
          />

          {/* 概况统计 */}
          <div className={styles.section}>
            <StatCards stats={stats} loading={loading} />
          </div>

          {/* 快速开始 */}
          <div className={styles.section}>
            <Title level={3} className={styles.sectionTitle}>
              ⚡ {t('quickStart.title', '快速开始')}
            </Title>
            <QuickStart />
          </div>

          {/* 近期活动 */}
          <div className={styles.section}>
            <Title level={3} className={styles.sectionTitle}>
              📊 {t('recent')}
            </Title>
            <RecentActivity 
              activities={recentActivities}
              algorithmUsage={algorithmUsage}
              loading={loading}
            />
          </div>

          {/* 探索更多 */}
          <div className={styles.section}>
            <Title level={3} className={styles.sectionTitle}>
              🔬 {t('explore')}
            </Title>
            <ExploreNav />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Dashboard;
