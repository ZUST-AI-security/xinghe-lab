import React from 'react';
import { Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ExploreNav.module.less';

const { Title, Text } = Typography;

const ExploreCard = ({
  title,
  description,
  descriptionEn,
  icon,
  color,
  path
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <Card
      className={styles.exploreCard}
      bordered={false}
      hoverable
      onClick={handleClick}
      style={{ '--accent-color': color }}
    >
      <div className={styles.cardContent}>
        <div className={styles.iconContainer}>
          <span className={styles.icon}>{icon}</span>
        </div>
        
        <div className={styles.content}>
          <Title level={5} className={styles.title}>
            {title}
          </Title>
          <Text className={styles.description}>
            {i18n.language === 'zh' ? description : descriptionEn}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ExploreCard;
