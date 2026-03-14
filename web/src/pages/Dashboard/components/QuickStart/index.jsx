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
      title: '图像分类攻击',
      description: '针对分类模型的对抗样本生成',
      model: 'ResNet100',
      classes: '1000类',
      dataset: 'ImageNet',
      background: 'linear-gradient(135deg, rgba(30, 109, 242, 0.1), rgba(30, 109, 242, 0.05))',
      icon: '🖼️',
      status: 'available',
      link: '/attacks/cw'
    },
    {
      key: 'detection',
      title: '目标检测攻击',
      description: '针对检测模型的对抗补丁攻击',
      model: 'YOLOv8',
      classes: '80类',
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
