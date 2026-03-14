import React from 'react';
import { Card, Timeline, Avatar, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../../../../utils/dateUtils';
import styles from './RecentActivity.module.less';

const { Text, Title } = Typography;

const ActivityTimeline = ({ activities }) => {
  const { t } = useTranslation();

  const timelineItems = activities.map(activity => ({
    key: activity.id,
    dot: activity.success ? (
      <CheckCircleOutlined style={{ color: '#10B981' }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#EF4444' }} />
    ),
    children: (
      <div className={styles.timelineItem}>
        <div className={styles.timelineHeader}>
          <Space>
            <div className={styles.algorithmInfo}>
              <Text strong className={styles.algorithmName}>
                {activity.algorithm}
              </Text>
              <Text type="secondary" className={styles.modelName}>
                {activity.model}
              </Text>
            </div>
            <Text type="secondary" className={styles.timestamp}>
              {formatRelativeTime(activity.timestamp)}
            </Text>
          </Space>
        </div>
        
        {activity.image && (
          <div className={styles.imageContainer}>
            <Avatar
              size={40}
              src={activity.image}
              shape="square"
              className={styles.thumbnail}
            />
          </div>
        )}
      </div>
    )
  }));

  return (
    <Card
      title={
        <Title level={4} className={styles.cardTitle}>
          📅 活动时间轴
        </Title>
      }
      className={styles.timelineCard}
      bordered={false}
    >
      <Timeline
        items={timelineItems}
        className={styles.timeline}
        mode="left"
      />
    </Card>
  );
};

export default ActivityTimeline;
