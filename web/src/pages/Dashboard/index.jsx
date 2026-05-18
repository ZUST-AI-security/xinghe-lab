import React, { useEffect, useMemo, useState } from 'react';
import { App, Col, Row, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMyTaskHistory, getMyTaskStats } from '../../api/tasks';
import { useAuthStore } from '../../store/authStore';
import {
  SpotlightCard, CardContainer, CardBody, CardItem, TextGenerateEffect, WobbleCard, GlowingEffect,
  BentoGrid, BentoGridItem,
} from '../../components/Aceternity';
import {
  BlurFade, NumberTicker, HyperText, GlareHover, BorderBeam,
} from '../../components/MagicUI';

const { Text } = Typography;

const STAT_CONFIG = [
  { key: 'total_attacks', title: '总任务数', icon: <HistoryOutlined />, color: '#1677ff', gradient: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)' },
  { key: 'successful_attacks', title: '成功任务', icon: <CheckCircleOutlined />, color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
  { key: 'success_rate', title: '成功率', icon: <ThunderboltOutlined />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', isPercent: true },
  { key: 'avg_time_elapsed', title: '平均耗时', icon: <ClockCircleOutlined />, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', suffix: 's' },
];

const ALGO_COLORS = { fgsm: '#3b82f6', ifgsm: '#8b5cf6', pgd: '#06b6d4', cw: '#f59e0b', deepfool: '#10b981' };

/* shared white card style */
const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { message } = App.useApp();
  const navigate = useNavigate();
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
      color: ALGO_COLORS[name.toLowerCase()] || '#60a5fa',
    })),
    [stats]
  );

  const greeting = user?.role === 'admin' ? '管理员' : (user?.full_name || user?.username);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══════ HERO ═══════ */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: '44px 36px 40px', textAlign: 'center' }}>
            {/* Decorative glow */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText
              text="EXPERIMENT HUB"
              duration={1000}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff',
                letterSpacing: 3, marginBottom: 16,
                padding: '4px 14px', borderRadius: 999,
                background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)',
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect
                words={`欢迎回来，${greeting}`}
                duration={0.6}
                style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 520, margin: '0 auto' }}
            >
              在这里可以快速发起攻击实验、跟踪近期任务，并把不同算法的输出结果放到同一页进行横向对比。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* ═══════ STAT CARDS ═══════ */}
      <Row gutter={[16, 16]}>
        {STAT_CONFIG.map((cfg, i) => {
          const raw = stats?.[cfg.key] || 0;
          const value = cfg.isPercent ? raw * 100 : raw;
          return (
            <Col xs={24} sm={12} xl={6} key={cfg.key}>
              <BlurFade delay={0.1 + i * 0.08}>
                <WobbleCard
                  containerClassName="dash-stat-wobble"
                  style={{ ...whiteCard, padding: 0, background: '#fff', position: 'relative' }}
                >
                  <BorderBeam size={140} duration={10 + i * 2} delay={i * 1.5} colorFrom={cfg.color} colorTo={`${cfg.color}80`} />
                  <SpotlightCard spotlightColor={`${cfg.color}12`} style={{ height: '100%' }}>
                    <GlareHover borderRadius={20} glareColor={`${cfg.color}10`} glareSize={300} style={{ height: '100%' }}>
                      <div style={{ padding: '26px 22px', position: 'relative', zIndex: 2 }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cfg.gradient, borderRadius: '20px 20px 0 0' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${cfg.color}10`, border: `1px solid ${cfg.color}18`,
                            display: 'grid', placeItems: 'center', color: cfg.color, fontSize: 16,
                          }}>
                            {cfg.icon}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--xh-text-secondary)' }}>{cfg.title}</span>
                        </div>

                        <div style={{ fontSize: 'clamp(32px, 4vw, 42px)', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          <NumberTicker
                            value={value}
                            duration={2}
                            suffix={cfg.isPercent ? '%' : cfg.suffix || ''}
                            style={{ background: cfg.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                          />
                        </div>
                      </div>
                    </GlareHover>
                  </SpotlightCard>
                </WobbleCard>
              </BlurFade>
            </Col>
          );
        })}
      </Row>

      {/* ═══════ RECENT TASKS + ALGORITHM DISTRIBUTION ═══════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <BlurFade delay={0.3}>
            <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 20 }}>
              <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                <GlowingEffect spread={40} proximity={100} />
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.4)' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>最近任务</span>
                  </div>
                  <Link to="/tasks/history" style={{ fontSize: 12, color: '#1677ff', textDecoration: 'none', fontWeight: 600 }}>查看全部 →</Link>
                </div>

                <div style={{ padding: '8px 16px' }}>
                  {history.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--xh-text-tertiary)', fontSize: 13 }}>
                      还没有历史任务，先提交一个攻击实验吧。
                    </div>
                  ) : (
                    history.map((item, i) => {
                      const algoColor = ALGO_COLORS[(item.algorithm_name || '').toLowerCase()] || '#60a5fa';
                      const isSuccess = item.status === 'success' || item.status === 'completed';
                      return (
                        <motion.div
                          key={item.id || i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 8px',
                            borderBottom: i < history.length - 1 ? '1px solid var(--xh-border)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: `${algoColor}10`, border: `1px solid ${algoColor}18`,
                              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: algoColor,
                            }}>
                              {(item.algorithm_name || '?')[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--xh-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {(item.algorithm_name || '-').toUpperCase()} · {item.model_name || 'resnet100_imagenet'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', marginTop: 2 }}>
                                {item.created_at ? new Date(item.created_at).toLocaleString() : '时间未知'}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                            background: isSuccess ? 'rgba(22,163,74,0.08)' : item.status === 'failed' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.08)',
                            color: isSuccess ? '#16a34a' : item.status === 'failed' ? '#dc2626' : '#d97706',
                            border: `1px solid ${isSuccess ? 'rgba(22,163,74,0.15)' : item.status === 'failed' ? 'rgba(220,38,38,0.15)' : 'rgba(245,158,11,0.15)'}`,
                          }}>
                            {item.status}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </SpotlightCard>
          </BlurFade>
        </Col>

        <Col xs={24} xl={10}>
          <BlurFade delay={0.4}>
            <SpotlightCard spotlightColor="rgba(124,58,237,0.04)" style={{ borderRadius: 20 }}>
              <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                <GlowingEffect spread={40} proximity={100} />
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.4)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>算法分布</span>
                </div>

                <div style={{ padding: '8px 16px' }}>
                  {algorithmCards.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--xh-text-tertiary)', fontSize: 13 }}>暂无算法统计</div>
                  ) : (
                    algorithmCards.map((item, i) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 8px',
                          borderBottom: i < algorithmCards.length - 1 ? '1px solid var(--xh-border)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `${item.color}10`, border: `1px solid ${item.color}18`,
                            display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: item.color,
                          }}>
                            {item.name[0].toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--xh-text)' }}>{item.name.toUpperCase()}</span>
                            <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', marginLeft: 8 }}>共 {item.total} 次</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--xh-border)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.successRate * 100}%` }}
                              transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                              style={{ height: '100%', borderRadius: 2, background: item.color }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: item.color, minWidth: 42, textAlign: 'right' }}>
                            {(item.successRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </SpotlightCard>
          </BlurFade>
        </Col>
      </Row>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <BlurFade delay={0.5}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.4)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>快速入口</span>
          </div>
          <BentoGrid style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {[
              { title: 'FGSM 攻击', desc: '快速梯度符号法，单步攻击算法', icon: <ThunderboltOutlined style={{ fontSize: 22, color: '#3b82f6' }} />, path: '/attacks/fgsm', color: '#3b82f6' },
              { title: 'C&W 攻击', desc: '基于优化的对抗样本生成', icon: <ExperimentOutlined style={{ fontSize: 22, color: '#f59e0b' }} />, path: '/attacks/cw', color: '#f59e0b' },
              { title: '对比模式', desc: '多算法横向对比分析', icon: <BarChartOutlined style={{ fontSize: 22, color: '#7c3aed' }} />, path: '/attacks/compare', color: '#7c3aed' },
              { title: '任务历史', desc: '查看所有攻击任务记录', icon: <HistoryOutlined style={{ fontSize: 22, color: '#1677ff' }} />, path: '/tasks/history', color: '#1677ff' },
            ].map((item) => (
              <BentoGridItem
                key={item.title}
                title={item.title}
                description={item.desc}
                icon={item.icon}
                onClick={() => navigate(item.path)}
                style={{ cursor: 'pointer' }}
                header={
                  <div style={{
                    height: 60,
                    background: `linear-gradient(135deg, ${item.color}08 0%, ${item.color}15 100%)`,
                    borderBottom: `1px solid ${item.color}12`,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${item.color}12`, border: `1px solid ${item.color}20`,
                      display: 'grid', placeItems: 'center',
                    }}>
                      {item.icon}
                    </div>
                  </div>
                }
              />
            ))}
          </BentoGrid>
        </div>
      </BlurFade>

      <style>{`.dash-stat-wobble { width: 100%; }`}</style>
    </div>
  );
};

export default Dashboard;
