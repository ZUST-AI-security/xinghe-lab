import React from 'react';
import { Card, Typography, Space, Tag, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import styles from './StatCards.module.less';

const { Text } = Typography;

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  trend, 
  trendText, 
  growth, 
  comparison, 
  status, 
  details, 
  best, 
  label 
}) => {
  const getTrendIcon = (trendValue) => {
    if (trendValue?.startsWith('+')) {
      return <ArrowUpOutlined style={{ color: '#10B981' }} />;
    }
    if (trendValue?.startsWith('-')) {
      return <ArrowDownOutlined style={{ color: '#EF4444' }} />;
    }
    return null;
  };

  const getGrowthColor = (growthValue) => {
    if (growthValue?.startsWith('+')) {
      return '#10B981';
    }
    if (growthValue?.startsWith('-')) {
      return '#EF4444';
    }
    return '#4A5568';
  };

  return (
    <Card 
      className={styles.statCard}
      bordered={false}
      style={{ '--accent-color': color }}
    >
      <div className={styles.cardContent}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>{icon}</span>
          </div>
          <Text className={styles.title}>{title}</Text>
        </div>

        <div className={styles.valueSection}>
          <div className={styles.value}>{value}</div>
          
          {(trend || growth) && (
            <div className={styles.trend}>
              {trend && (
                <Space size={4}>
                  {getTrendIcon(trend)}
                  <Text style={{ color: getGrowthColor(trend) }}>
                    {trend}
                  </Text>
                  <Text type="secondary" className={styles.trendText}>
                    {trendText}
                  </Text>
                </Space>
              )}
              
              {growth && (
                <Space size={4}>
                  <Text style={{ color: getGrowthColor(growth) }}>
                    {growth}
                  </Text>
                  <Text type="secondary" className={styles.trendText}>
                    {comparison}
                  </Text>
                </Space>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {status && (
            <Tag color="success" className={styles.statusTag}>
              {status}
            </Tag>
          )}
          
          {details && (
            <Tooltip title={details.join(', ')}>
              <Text type="secondary" className={styles.details}>
                {details.length} models
              </Text>
            </Tooltip>
          )}
          
          {best && (
            <Text type="secondary" className={styles.best}>
              {label}: {best}
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
