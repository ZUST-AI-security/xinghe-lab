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
                    {gpuLoad > 80 ? '高' : gpuLoad > 50 ? '中' : '低'}
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
                    {queueLength > 5 ? '繁忙' : '正常'}
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
