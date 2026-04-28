import React, { useEffect, useState } from 'react';
import { Card, Col, Empty, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { getAdminDashboard } from '../../api/admin';

const { Title, Text, Paragraph } = Typography;

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminDashboard().then(setData).catch(() => setData(null));
  }, []);

  const algorithms = Object.entries(data?.attacks?.by_algorithm || {});

  return (
    <div className="xh-page-shell">
      <Card className="xh-page-banner" bordered={false}>
        <div className="xh-page-kicker">ADMIN CONSOLE</div>
        <Title level={2} className="xh-page-title">
          星河智安概览
        </Title>
        <Paragraph className="xh-page-desc">
          在这里集中查看用户规模、攻击任务状态和当前系统环境，方便快速排查异常并调整平台配置。
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card" bordered={false}>
            <Statistic title="总用户数" value={data?.users?.total || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card" bordered={false}>
            <Statistic title="活跃用户" value={data?.users?.active || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card" bordered={false}>
            <Statistic title="攻击总数" value={data?.attacks?.total || 0} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="xh-stat-card" bordered={false}>
            <Statistic
              title="攻击成功率"
              value={(data?.attacks?.success_rate || 0) * 100}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="算法分布" className="xh-admin-card" bordered={false}>
            {algorithms.length === 0 ? (
              <div className="xh-empty-note">
                <Empty description="暂时还没有攻击记录" />
              </div>
            ) : (
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                {algorithms.map(([algorithm, count]) => (
                  <div key={algorithm} className="xh-list-row">
                    <Space>
                      <Tag className="xh-role-tag" color="blue">
                        {algorithm.toUpperCase()}
                      </Tag>
                      <Text strong>{count} 次</Text>
                    </Space>
                    <div
                      style={{
                        flex: 1,
                        maxWidth: 240,
                        height: 8,
                        borderRadius: 999,
                        background: '#e8f1ff',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min((count / Math.max(data?.attacks?.total || 1, 1)) * 100, 100)}%`,
                          height: '100%',
                          background: '#1677ff',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="系统环境" className="xh-admin-card" bordered={false}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="xh-soft-panel">
                <Space>
                  <DatabaseOutlined style={{ color: '#1677ff' }} />
                  <div>
                    <Text type="secondary">数据库</Text>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {data?.system?.database || '-'}
                    </div>
                  </div>
                </Space>
              </div>

              <div className="xh-soft-panel">
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <div>
                    <Text type="secondary">版本</Text>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {data?.system?.version || '-'}
                    </div>
                  </div>
                </Space>
              </div>

              <Space>
                <Text type="secondary">调试模式</Text>
                <Tag className="xh-status-tag" color={data?.system?.debug ? 'gold' : 'green'}>
                  {data?.system?.debug ? '开启' : '关闭'}
                </Tag>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
