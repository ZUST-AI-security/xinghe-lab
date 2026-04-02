import React from 'react';
import { Card, Button, Typography, Tag } from 'antd';
import { PlayCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './QuickStart.module.less';

const { Title, Text } = Typography;

const QuickStartCard = ({
  title,
  description,
  model,
  classes,
  dataset,
  status = 'available',
  link,
  background,
  icon,
  buttonText
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const isDisabled = status === 'development';
  
  const handleStart = () => {
    if (!isDisabled && link) {
      navigate(link);
    }
  };

  return (
    <Card
      className={styles.quickStartCard}
      style={{ background }}
      bordered={false}
      hoverable={!isDisabled}
      onClick={!isDisabled ? handleStart : undefined}
    >
      <div className={styles.cardContent}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>{icon}</span>
          </div>
          <div className={styles.titleSection}>
            <Title level={4} className={styles.title}>
              {title}
            </Title>
            {status === 'coming-soon' && (
              <Tag color="orange" className={styles.statusTag}>
                开发中
              </Tag>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <Text className={styles.description}>
            {description}
          </Text>
          
          <div className={styles.modelInfo}>
            <Text className={styles.modelText}>
              {model}
            </Text>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            type="primary"
            size="large"
            icon={isDisabled ? <LockOutlined /> : <PlayCircleOutlined />}
            disabled={isDisabled}
            onClick={handleStart}
            className={styles.button}
          >
            {buttonText || (isDisabled ? '敬请期待' : '开始实验')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default QuickStartCard;
