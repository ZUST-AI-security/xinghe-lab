import React from 'react';
import { Row, Col } from 'antd';
import QuickStartCard from './QuickStartCard';
import styles from './QuickStart.module.less';

const QuickStart = () => {
  const quickStartItems = [
    {
      key: 'cw',
      title: 'C&W 攻击',
      description: '优化式攻击，适合演示高质量扰动效果',
      model: 'ResNet152',
      classes: '1000类',
      dataset: 'ImageNet',
      background: 'linear-gradient(135deg, rgba(30, 109, 242, 0.1), rgba(30, 109, 242, 0.05))',
      icon: '⚡',
      status: 'available',
      link: '/attacks/cw'
    },
    {
      key: 'pgd',
      title: 'PGD 攻击',
      description: '多步迭代攻击，适合作为当前主线实验入口',
      model: 'ResNet152',
      classes: '1000类',
      dataset: 'ImageNet',
      background: 'linear-gradient(135deg, rgba(123, 46, 218, 0.1), rgba(123, 46, 218, 0.05))',
      icon: '🧪',
      status: 'available',
      link: '/attacks/pgd'
    },
    {
      key: 'fgsm',
      title: 'FGSM 攻击',
      description: '单步快速攻击，适合轻量演示与参数对比',
      model: 'ResNet152',
      classes: '1000类',
      dataset: 'ImageNet',
      background: 'linear-gradient(135deg, rgba(0, 184, 217, 0.1), rgba(0, 184, 217, 0.05))',
      icon: '🚀',
      status: 'available',
      link: '/attacks/fgsm'
    }
  ];

  return (
    <Row gutter={[24, 24]} className={styles.quickStart}>
      {quickStartItems.map(item => (
        <Col key={item.key} xs={24} md={12} xl={8}>
          <QuickStartCard {...item} />
        </Col>
      ))}
    </Row>
  );
};

export default QuickStart;
