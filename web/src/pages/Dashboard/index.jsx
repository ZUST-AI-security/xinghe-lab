import React, { useEffect, useMemo, useState } from 'react';
import { App, Card, Col, List, Row, Space, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMyTaskHistory, getMyTaskStats } from '../../api/tasks';
import { useAuthStore } from '../../store/authStore';
import Sparkles from '../../components/Aceternity/Sparkles';
import GlowingCard from '../../components/Aceternity/GlowingCard';
import FloatUp from '../../components/Aceternity/FloatUp';
import BackgroundGrid from '../../components/Aceternity/BackgroundGrid';
import AnimatedCounter from '../../components/Aceternity/AnimatedCounter';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import ShimmerCard from '../../components/Aceternity/ShimmerCard';
import WobbleCard from '../../components/Aceternity/WobbleCard';
import LampContainer from '../../components/Aceternity/Lamp';
import GlowingEffect from '../../components/Aceternity/GlowingEffect';

const { Title, Paragraph, Text } = Typography;

const STAT_CONFIG = [
  { key: 'total_attacks', title: '总任务数', icon: <HistoryOutlined />, color: '#1677ff', bg: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)' },
  { key: 'successful_attacks', title: '成功任务', icon: <CheckCircleOutlined />, color: '#16a34a', bg: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
  { key: 'success_rate', title: '成功率', icon: <ThunderboltOutlined />, color: '#7c3aed', bg: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', isPercent: true },
  { key: 'avg_time_elapsed', title: '平均耗时', icon: <ClockCircleOutlined />, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', suffix: 's' },
];

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { message } = App.useApp();
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
        message.error('加载仪表盘数据失败');
        setStats({ total_attacks: 0, successful_attacks: 0, failed_attacks: 0, success_rate: 0, avg_time_elapsed: 0, by_algorithm: {} });
        setHistory([]);
      }
    };
    load();
  }, []);

  const algorithmCards = useMemo(
    () => Object.entries(stats?.by_algorithm || {}).map(([name, item]) => ({
      name, total: item.total,
      successRate: item.total ? item.successful / item.total : 0,
    })),
    [stats]
  );

  const greeting = user?.role === 'admin' ? '管理员' : (user?.full_name || user?.username);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Hero with Lamp Effect */}
      <FloatUp>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, background: 'var(--xh-surface)' }}>
          <Sparkles count={50} color="rgba(22,119,255,0.3)" />
          <BackgroundGrid dotSize={1} gap={22} dotColor="rgba(22,119,255,0.05)" />
          <div style={{ position: 'relative', zIndex: 1, padding: '48px 32px 40px', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="xh-kicker" style={{ marginBottom: 16 }}>EXPERIMENT HUB</div>
              <Title className="xh-page-title" level={2} style={{ fontSize: 32 }}>
                欢迎回来，{greeting}
              </Title>
              <Paragraph className="xh-page-desc" style={{ margin: '0 auto', maxWidth: 600 }}>
                在这里可以快速发起攻击实验、跟踪近期任务，并把不同算法的输出结果放到同一页进行横向对比。
              </Paragraph>
            </motion.div>

            {/* Lamp glow lines */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 3, background: 'linear-gradient(90deg, transparent, var(--xh-primary), transparent)', opacity: 0.3, filter: 'blur(2px)' }} />
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: 200, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </FloatUp>

      {/* Stat Cards with Wobble */}
      <Row gutter={[16, 16]}>
        {STAT_CONFIG.map((cfg, i) => {
          const raw = stats?.[cfg.key] || 0;
          const value = cfg.isPercent ? raw * 100 : raw;
          return (
            <Col xs={24} sm={12} xl={6} key={cfg.key}>
              <FloatUp delay={0.1 + i * 0.08}>
                <WobbleCard
                  containerClassName="w-full"
                  style={{ borderRadius: 20 }}
                  className="w-full"
                >
                  <div style={{
                    background: cfg.bg,
                    padding: '28px 24px',
                    borderRadius: 16,
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>
                      {cfg.icon} {cfg.title}
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      <AnimatedCounter
                        value={value}
                        decimals={cfg.isPercent ? 1 : cfg.suffix === 's' ? 2 : 0}
                        suffix={cfg.isPercent ? '%' : cfg.suffix || ''}
                        duration={1.2}
                      />
                    </div>
                  </div>
                </WobbleCard>
              </FloatUp>
            </Col>
          );
        })}
      </Row>

      {/* Recent Tasks + Algorithm Distribution */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <FloatUp delay={0.4}>
            <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 28 }}>
              <Card
                title="最近任务"
                extra={<Link to="/tasks/history">查看全部</Link>}
                className="xh-section-card xh-panel"
                style={{ borderRadius: 28, border: '1px solid var(--xh-border)' }}
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
                            <Tag className="xh-soft-tag"
                              color={item.status === 'success' || item.status === 'completed' ? 'green' : item.status === 'failed' ? 'red' : 'gold'}
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
            </SpotlightCard>
          </FloatUp>
        </Col>

        <Col xs={24} xl={10}>
          <FloatUp delay={0.5}>
            <GlowingCard glowColor="rgba(124,58,237,0.06)" borderColor="rgba(124,58,237,0.12)">
              <Card title="算法分布" className="xh-section-card xh-panel" style={{ borderRadius: 28, border: '1px solid var(--xh-border)' }}>
                <List
                  dataSource={algorithmCards}
                  locale={{ emptyText: '暂无算法统计' }}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="xh-list-row">
                        <Space>
                          <Tag className="xh-soft-tag" color="cyan">{item.name.toUpperCase()}</Tag>
                          <Text type="secondary">共 {item.total} 次</Text>
                        </Space>
                        <Text strong>{(item.successRate * 100).toFixed(1)}%</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </GlowingCard>
          </FloatUp>
        </Col>
      </Row>
    </Space>
  );
};

export default Dashboard;
