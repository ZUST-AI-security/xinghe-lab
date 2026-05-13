/**
 * QueueStatus 组件
 * 展示各 Celery 队列的待处理任务数和预估等待时间
 * 每 30 秒自动刷新，组件卸载时清除定时器（无内存泄漏）
 */

import React, { useEffect, useRef, useState } from 'react';
import { Badge, Card, Col, Row, Spin, Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getQueueStatus } from '../../api/tasks';

const { Text } = Typography;

const QUEUE_LABELS = {
  high: { label: '高优先级队列', description: 'FGSM（单步算法）', color: '#52c41a' },
  default: { label: '默认队列', description: 'I-FGSM、PGD（迭代算法）', color: '#1677ff' },
  low: { label: '低优先级队列', description: 'C&W、DeepFool（优化算法）', color: '#fa8c16' },
};

/**
 * 将秒数格式化为可读字符串
 */
const formatWaitTime = (seconds) => {
  if (seconds <= 0) return '< 1 秒';
  if (seconds < 60) return `约 ${Math.round(seconds)} 秒`;
  const minutes = Math.round(seconds / 60);
  return `约 ${minutes} 分钟`;
};

const QueueStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const data = await getQueueStatus();
      setStatus(data);
      setLastUpdated(new Date());
    } catch {
      // 静默失败：队列状态不影响核心功能
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 首次加载
    fetchStatus();

    // 每 30 秒自动刷新
    intervalRef.current = setInterval(fetchStatus, 30000);

    // 组件卸载时清除定时器，防止内存泄漏
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '8px 16px' }}
      >
        <Spin size="small" style={{ marginRight: 8 }} />
        <Text type="secondary">正在获取队列状态...</Text>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card
      size="small"
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          当前队列状态
        </span>
      }
      extra={
        <Tooltip title={lastUpdated ? `上次更新：${lastUpdated.toLocaleTimeString()}，每 30 秒自动刷新` : '每 30 秒自动刷新'}>
          <ReloadOutlined
            style={{ color: '#999', cursor: 'pointer' }}
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
          />
        </Tooltip>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        {Object.entries(QUEUE_LABELS).map(([key, meta]) => {
          const queueData = status[key] || { pending: 0, estimated_wait_seconds: 0 };
          const pending = queueData.pending ?? 0;
          const waitSeconds = queueData.estimated_wait_seconds ?? 0;

          return (
            <Col key={key} xs={24} sm={8}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Badge
                  count={pending}
                  showZero
                  style={{ backgroundColor: pending > 0 ? meta.color : '#d9d9d9' }}
                />
                <div>
                  <Text strong style={{ fontSize: 13 }}>{meta.label}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{meta.description}</Text>
                  <br />
                  <Text style={{ fontSize: 12, color: pending > 0 ? '#fa8c16' : '#52c41a' }}>
                    {pending > 0
                      ? `预估等待：${formatWaitTime(waitSeconds)}`
                      : '队列空闲'}
                  </Text>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
};

export default QueueStatus;
