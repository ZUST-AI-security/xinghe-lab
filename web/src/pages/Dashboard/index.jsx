import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

import { getMyTaskHistory, getMyTaskStats } from '../../api/tasks';
import { useAuthStore } from '../../store/authStore';

const { Title, Paragraph, Text } = Typography;

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, historyData] = await Promise.all([
          getMyTaskStats(),
          getMyTaskHistory({ page: 1, size: 5 }),
        ]);
        setStats(statsData);
        setHistory(historyData.items || []);
      } catch {
        setStats({
          total_attacks: 0,
          successful_attacks: 0,
          failed_attacks: 0,
          success_rate: 0,
          avg_time_elapsed: 0,
          by_algorithm: {},
        });
        setHistory([]);
      }
    };
    load();
  }, []);

  const algorithmCards = useMemo(
    () => Object.entries(stats?.by_algorithm || {}).map(([name, item]) => ({
      name,
      total: item.total,
      successRate: item.total ? item.successful / item.total : 0,
    })),
    [stats]
  );

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="xh-hero-card xh-panel" style={{ borderRadius: 28 }}>
        <div className="xh-kicker">EXPERIMENT HUB</div>
        <Title className="xh-page-title" level={2}>
          {user?.role === 'admin' ? '欢迎回来，管理员' : `欢迎回来，${user?.full_name || user?.username}`}
        </Title>
        <Paragraph className="xh-page-desc">
          在这里可以快速发起攻击实验、跟踪近期任务，并把不同算法的输出结果放到同一页进行横向对比。
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card xh-panel" style={{ borderRadius: 24 }}>
            <Statistic
              title="总任务数"
              value={stats?.total_attacks || 0}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card xh-panel" style={{ borderRadius: 24 }}>
            <Statistic
              title="成功任务"
              value={stats?.successful_attacks || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card xh-panel" style={{ borderRadius: 24 }}>
            <Statistic
              title="成功率"
              value={(stats?.success_rate || 0) * 100}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card xh-panel" style={{ borderRadius: 24 }}>
            <Statistic
              title="平均耗时"
              value={stats?.avg_time_elapsed || 0}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="最近任务"
            extra={<Link to="/tasks/history">查看全部</Link>}
            className="xh-section-card xh-panel"
            style={{ borderRadius: 28 }}
          >
            <List
              dataSource={history}
              locale={{ emptyText: '还没有历史任务，先提交一个攻击实验吧。' }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={(
                      <Space wrap>
                        <Tag className="xh-soft-tag" color="geekblue">
                          {(item.algorithm_name || '-').toUpperCase()}
                        </Tag>
                        <Text strong>{item.model_name || 'resnet100_imagenet'}</Text>
                        <Tag
                          className="xh-soft-tag"
                          color={
                            item.status === 'success' || item.status === 'completed'
                              ? 'green'
                              : item.status === 'failed'
                                ? 'red'
                                : 'gold'
                          }
                        >
                          {item.status}
                        </Tag>
                      </Space>
                    )}
                    description={item.created_at ? new Date(item.created_at).toLocaleString() : '时间未知'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="算法分布" className="xh-section-card xh-panel" style={{ borderRadius: 28 }}>
            <List
              dataSource={algorithmCards}
              locale={{ emptyText: '暂无算法统计' }}
              renderItem={(item) => (
                <List.Item>
                  <div className="xh-list-row">
                    <Space>
                      <Tag className="xh-soft-tag" color="cyan">
                        {item.name.toUpperCase()}
                      </Tag>
                      <Text type="secondary">共 {item.total} 次</Text>
                    </Space>
                    <Text strong>{(item.successRate * 100).toFixed(1)}%</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default Dashboard;
