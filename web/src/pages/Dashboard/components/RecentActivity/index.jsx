import React from 'react';
import { Row, Col, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import ActivityTimeline from './ActivityTimeline';
import UsageChart from './UsageChart';
import styles from './RecentActivity.module.less';

const RecentActivity = ({ activities, algorithmUsage, loading }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Row gutter={[24, 24]} className={styles.recentActivity}>
      <Col xs={24} lg={14}>
        <ActivityTimeline activities={activities} />
      </Col>
      <Col xs={24} lg={10}>
        <UsageChart data={algorithmUsage} />
      </Col>
    </Row>
  );
};

export default RecentActivity;
