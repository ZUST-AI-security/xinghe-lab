import React from 'react';
import { Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import QuickStartCard from './QuickStartCard';
import styles from './QuickStart.module.less';

const QuickStart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quickStartItems = [
    {
      key: 'classification',
      title: t('quickStart.classification'),
      description: t('quickStart.classificationDesc'),
      model: 'ResNet100',
      classes: '1000 classes',
      dataset: 'ImageNet',
      background: 'linear-gradient(135deg, rgba(30, 109, 242, 0.1), rgba(30, 109, 242, 0.05))',
      icon: '🖼️',
      status: 'available',
      link: '/attacks/cw'
    },
    {
      key: 'detection',
      title: t('quickStart.detection'),
      description: t('quickStart.detectionDesc'),
      model: 'YOLOv8',
      classes: '80 classes',
      dataset: 'COCO',
      background: 'linear-gradient(135deg, rgba(123, 46, 218, 0.1), rgba(123, 46, 218, 0.05))',
      icon: '🎯',
      status: 'development'
    }
  ];

  return (
    <Row gutter={[24, 24]} className={styles.quickStart}>
      {quickStartItems.map(item => (
        <Col key={item.key} xs={24} md={12}>
          <QuickStartCard {...item} />
        </Col>
      ))}
    </Row>
  );
};

export default QuickStart;
