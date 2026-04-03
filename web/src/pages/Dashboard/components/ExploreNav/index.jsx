import React from 'react';
import { Row, Col } from 'antd';
import ExploreCard from './ExploreCard';
import styles from './ExploreNav.module.less';

const ExploreNav = () => {
  const exploreItems = [
    {
      key: 'cw',
      title: 'C&W 攻击',
      description: '优化式攻击实验入口',
      icon: '⚡',
      color: '#1E6DF2',
      path: '/attacks/cw'
    },
    {
      key: 'pgd',
      title: 'PGD 攻击',
      description: '多步迭代攻击实验入口',
      icon: '🧪',
      color: '#7B2EDA',
      path: '/attacks/pgd'
    },
    {
      key: 'fgsm',
      title: 'FGSM 攻击',
      description: '单步快速攻击实验入口',
      icon: '🚀',
      color: '#00B8D9',
      path: '/attacks/fgsm'
    },
    {
      key: 'models',
      title: '模型库',
      description: '探索当前可用模型能力',
      icon: '🤖',
      color: '#F59E0B',
      path: '/models'
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
