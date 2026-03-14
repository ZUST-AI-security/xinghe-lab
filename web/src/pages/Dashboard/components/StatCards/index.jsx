import React from 'react';
import { Row, Col, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import StatCard from './StatCard';
import styles from './StatCards.module.less';

const StatCards = ({ stats, loading }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      key: 'algorithms',
      title: '可用算法',
      value: stats.algorithms.count,
      trend: stats.algorithms.trend,
      trendText: stats.algorithms.trendText,
      icon: '🔬',
      color: '#1E6DF2'
    },
    {
      key: 'models',
      title: '可用模型',
      value: stats.models.count,
      status: stats.models.status,
      details: stats.models.list,
      icon: '🤖',
      color: '#7B2EDA'
    },
    {
      key: 'runsToday',
      title: '今日运行',
      value: stats.runsToday.count,
      growth: stats.runsToday.growth,
      comparison: stats.runsToday.comparison,
      icon: '⚡',
      color: '#00B8D9'
    },
    {
      key: 'successRate',
      title: '攻击成功率',
      value: `${Math.round(stats.successRate.rate * 100)}%`,
      best: stats.successRate.best,
      label: stats.successRate.label,
      icon: '📈',
      color: '#10B981'
    }
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Row gutter={[24, 24]} className={styles.statCards}>
      {statItems.map(item => (
        <Col key={item.key} xs={24} sm={12} lg={6}>
          <StatCard {...item} />
        </Col>
      ))}
    </Row>
  );
};

export default StatCards;
