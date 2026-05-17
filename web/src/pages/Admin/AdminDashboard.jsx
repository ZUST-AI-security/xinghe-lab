import React, { useEffect, useState } from 'react';
import { Card, Col, Empty, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { getAdminDashboard } from '../../api/admin';
import FloatUp from '../../components/Aceternity/FloatUp';
import GlowingCard from '../../components/Aceternity/GlowingCard';
import AnimatedCounter from '../../components/Aceternity/AnimatedCounter';
import BackgroundGrid from '../../components/Aceternity/BackgroundGrid';
import Sparkles from '../../components/Aceternity/Sparkles';

const { Title, Text, Paragraph } = Typography;

const STAT_CONFIG = [
  { key: 'users.total', title: '总用户数', icon: <TeamOutlined />, color: '#1677ff' },
  { key: 'users.active', title: '活跃用户', icon: <TeamOutlined />, color: '#16a34a' },
  { key: 'attacks.total', title: '攻击总数', icon: <ThunderboltOutlined />, color: '#7c3aed' },
  { key: 'attacks.success_rate', title: '攻击成功率', icon: <CheckCircleOutlined />, color: '#f59e0b', isPercent: true },
];

const getNestedValue = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminDashboard().then(setData).catch(() => setData(null));
  }, []);

  const algorithms = Object.entries(data?.attacks?.by_algorithm || {});

  return (
    <div className="xh-page-shell">
      <FloatUp>
        <Card className="xh-page-banner" bordered={false} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24 }}>
          <BackgroundGrid dotSize={1} gap={20} dotColor="rgba(22,119,255,0.05)" />
          <Sparkles count={30} color="rgba(22,119,255,0.25)" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="xh-page-kicker">ADMIN CONSOLE</div>
            <Title level={2} className="xh-page-title">星河智安概览</Title>
            <Paragraph className="xh-page-desc">
              在这里集中查看用户规模、攻击任务状态和当前系统环境，方便快速排查异常并调整平台配置。
            </Paragraph>
          </div>
        </Card>
      </FloatUp>

      <Row gutter={[16, 16]}>
        {STAT_CONFIG.map((cfg, i) => {
          const raw = getNestedValue(data, cfg.key) || 0;
          const value = cfg.isPercent ? raw * 100 : raw;
          return (
            <Col xs={24} sm={12} xl={6} key={cfg.key}>
              <FloatUp delay={0.1 + i * 0.08}>
                <GlowingCard glowColor={`${cfg.color}22`} borderColor={`${cfg.color}33`}>
                  <Card className="xh-stat-card" bordered={false} style={{ borderRadius: 20 }}>
                    <Statistic
                      title={cfg.title}
                      value={value}
                      precision={cfg.isPercent ? 1 : 0}
                      suffix={cfg.isPercent ? '%' : ''}
                      prefix={React.cloneElement(cfg.icon, { style: { color: cfg.color } })}
                    />
                  </Card>
                </GlowingCard>
              </FloatUp>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <FloatUp delay={0.4}>
            <Card title="算法分布" className="xh-admin-card" bordered={false} style={{ borderRadius: 20 }}>
              {algorithms.length === 0 ? (
                <div className="xh-empty-note"><Empty description="暂时还没有攻击记录" /></div>
              ) : (
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  {algorithms.map(([algorithm, count]) => (
                    <div key={algorithm} className="xh-list-row">
                      <Space>
                        <Tag className="xh-role-tag" color="blue">{algorithm.toUpperCase()}</Tag>
                        <Text strong>{count} 次</Text>
                      </Space>
                      <div style={{ flex: 1, maxWidth: 240, height: 8, borderRadius: 999, background: 'var(--xh-primary-soft)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min((count / Math.max(data?.attacks?.total || 1, 1)) * 100, 100)}%`,
                          height: '100%', background: 'var(--xh-primary)',
                          borderRadius: 999,
                          transition: 'width 1s ease-out',
                        }} />
                      </div>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </FloatUp>
        </Col>

        <Col xs={24} lg={10}>
          <FloatUp delay={0.5}>
            <Card title="系统环境" className="xh-admin-card" bordered={false} style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div className="xh-soft-panel">
                  <Space>
                    <DatabaseOutlined style={{ color: 'var(--xh-primary)' }} />
                    <div>
                      <Text type="secondary">数据库</Text>
                      <div style={{ fontWeight: 700, color: 'var(--xh-text)' }}>{data?.system?.database || '-'}</div>
                    </div>
                  </Space>
                </div>
                <div className="xh-soft-panel">
                  <Space>
                    <TeamOutlined style={{ color: 'var(--xh-primary)' }} />
                    <div>
                      <Text type="secondary">版本</Text>
                      <div style={{ fontWeight: 700, color: 'var(--xh-text)' }}>{data?.system?.version || '-'}</div>
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
          </FloatUp>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
