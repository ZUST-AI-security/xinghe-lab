import React from 'react';
import { Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import ExploreCard from './ExploreCard';
import styles from './ExploreNav.module.less';

const ExploreNav = () => {
  const { t } = useTranslation();

  const exploreItems = [
    {
      key: 'algorithms',
      title: t('algorithms'),
      description: '查看所有攻击算法详情和参数',
      descriptionEn: 'Explore all attack algorithms and parameters',
      icon: '🔬',
      color: '#1E6DF2',
      path: '/algorithms'
    },
    {
      key: 'models',
      title: t('models'),
      description: '探索可用模型和性能指标',
      descriptionEn: 'Discover available models and metrics',
      icon: '🤖',
      color: '#7B2EDA',
      path: '/models'
    },
    {
      key: 'docs',
      title: t('docs'),
      description: 'API文档和二次开发指南',
      descriptionEn: 'API docs and development guide',
      icon: '📚',
      color: '#00B8D9',
      path: '/docs'
    },
    {
      key: 'community',
      title: t('community'),
      description: '论文分享和学术讨论',
      descriptionEn: 'Paper sharing and discussions',
      icon: '👥',
      color: '#F59E0B',
      path: '/community'
    }
  ];

  return (
    <Row gutter={[24, 24]} className={styles.exploreNav}>
      {exploreItems.map(item => (
        <Col key={item.key} xs={12} sm={6}>
          <ExploreCard {...item} />
        </Col>
      ))}
    </Row>
  );
};

export default ExploreNav;
