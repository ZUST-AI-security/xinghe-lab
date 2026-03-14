import React from 'react';
import { Card, Typography, Space, Tag, Row, Col } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../store/authStore';
import { formatGreeting, formatDate } from '../../../../utils/dateUtils';
import styles from './WelcomeBanner.module.less';

const { Title, Text } = Typography;

const WelcomeBanner = ({ gpuLoad, queueLength }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const greeting = formatGreeting();
  const currentDate = formatDate(new Date());

  const getGpuStatus = (load) => {
    if (load > 80) return t('high', '高');
    if (load > 50) return t('medium', '中');
    return t('low', '低');
  };

  const getQueueStatus = (queue) => {
    if (queue > 5) return t('busy', '繁忙');
    return t('normal', '正常');
  };

  return (
    <Card className={styles.welcomeBanner} bordered={false}>
      <div className={styles.bannerContent}>
        <div className={styles.leftSection}>
          <Title level={2} className={styles.welcomeText}>
            {greeting}，{user?.username || 'User'}
          </Title>
          <Text className={styles.dateText}>{currentDate}</Text>
        </div>
        
        <div className={styles.rightSection}>
          <Space size="large">
            <div className={styles.statusItem}>
              <ThunderboltOutlined className={styles.statusIcon} />
              <div>
                <Text className={styles.statusLabel}>GPU负载</Text>
                <div className={styles.statusValue}>
                  <span className={styles.statusNumber}>{gpuLoad}%</span>
                  <Tag 
                    color={gpuLoad > 80 ? 'error' : gpuLoad > 50 ? 'warning' : 'success'}
                    className={styles.statusTag}
                  >
                    {getGpuStatus(gpuLoad)}
                  </Tag>
                </div>
              </div>
            </div>
            
            <div className={styles.statusItem}>
              <ClockCircleOutlined className={styles.statusIcon} />
              <div>
                <Text className={styles.statusLabel}>任务队列</Text>
                <div className={styles.statusValue}>
                  <span className={styles.statusNumber}>{queueLength}</span>
                  <Tag 
                    color={queueLength > 5 ? 'warning' : 'default'}
                    className={styles.statusTag}
                  >
                    {getQueueStatus(queueLength)}
                  </Tag>
                </div>
              </div>
            </div>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default WelcomeBanner;
