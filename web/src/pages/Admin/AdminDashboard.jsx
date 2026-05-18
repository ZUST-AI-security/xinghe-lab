import React, { useEffect, useState } from 'react';
import { Col, Empty, Row, Typography, App } from 'antd';
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { getAdminDashboard } from '../../api/admin';
import {
  SpotlightCard, TextGenerateEffect, CardContainer, CardBody, CardItem, WobbleCard, GlowingEffect,
} from '../../components/Aceternity';
import { BlurFade, HyperText, NumberTicker, GlareHover, BorderBeam } from '../../components/MagicUI';

const { Text } = Typography;

const ALGO_COLORS = { fgsm: '#3b82f6', ifgsm: '#8b5cf6', pgd: '#06b6d4', cw: '#f59e0b', deepfool: '#10b981' };

const STAT_CONFIG = [
  { key: 'users.total', title: '总用户数', icon: <TeamOutlined />, color: '#1677ff', gradient: 'linear-gradient(135deg, #1677ff 0%, #60a5fa 100%)' },
  { key: 'users.active', title: '活跃用户', icon: <TeamOutlined />, color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
  { key: 'attacks.total', title: '攻击总数', icon: <ThunderboltOutlined />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
  { key: 'attacks.success_rate', title: '攻击成功率', icon: <CheckCircleOutlined />, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', isPercent: true },
];

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const getNestedValue = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const AdminDashboard = () => {
  const { message } = App.useApp();
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminDashboard().then(setData).catch(() => {
      message.error('加载管理概览失败');
      setData(null);
    });
  }, []);

  const algorithms = Object.entries(data?.attacks?.by_algorithm || {});
  const totalAttacks = data?.attacks?.total || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(124,58,237,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: '44px 36px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText
              text="ADMIN CONSOLE"
              duration={1000}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#7c3aed',
                letterSpacing: 3, marginBottom: 16,
                padding: '4px 14px', borderRadius: 999,
                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)',
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect
                words="星河智安管理概览"
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
              集中查看用户规模、攻击任务状态和当前系统环境，方便快速排查异常并调整平台配置。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        {STAT_CONFIG.map((cfg, i) => {
          const raw = getNestedValue(data, cfg.key) || 0;
          const value = cfg.isPercent ? raw * 100 : raw;
          return (
            <Col xs={24} sm={12} xl={6} key={cfg.key}>
              <BlurFade delay={0.1 + i * 0.08}>
                <WobbleCard
                  containerClassName="admin-stat-wobble"
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
                            suffix={cfg.isPercent ? '%' : ''}
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

      {/* Algorithm Distribution + System Info */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <BlurFade delay={0.4}>
            <SpotlightCard spotlightColor="rgba(124,58,237,0.04)" style={{ borderRadius: 20 }}>
              <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                <GlowingEffect spread={40} proximity={120} />
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.4)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>算法分布</span>
                </div>

                <div style={{ padding: '8px 16px' }}>
                  {algorithms.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--xh-text-tertiary)', fontSize: 13 }}>
                      <Empty description="暂时还没有攻击记录" />
                    </div>
                  ) : (
                    algorithms.map(([algorithm, count], i) => {
                      const color = ALGO_COLORS[algorithm.toLowerCase()] || '#60a5fa';
                      const pct = Math.min((count / totalAttacks) * 100, 100);
                      return (
                        <motion.div
                          key={algorithm}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 8px',
                            borderBottom: i < algorithms.length - 1 ? '1px solid var(--xh-border)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: `${color}10`, border: `1px solid ${color}18`,
                              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color,
                            }}>
                              {algorithm[0].toUpperCase()}
                            </div>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--xh-text)' }}>{algorithm.toUpperCase()}</span>
                              <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', marginLeft: 8 }}>{count} 次</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--xh-border)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                                style={{ height: '100%', borderRadius: 2, background: color }}
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 42, textAlign: 'right' }}>
                              {pct.toFixed(1)}%
                            </span>
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

        <Col xs={24} lg={10}>
          <BlurFade delay={0.5}>
            <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 20 }}>
              <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                <GlowingEffect spread={35} proximity={100} />
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.4)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>系统环境</span>
                </div>

                <div style={{ padding: '8px 16px' }}>
                  {[
                    { icon: <DatabaseOutlined />, label: '数据库', value: data?.system?.database || '-' },
                    { icon: <TeamOutlined />, label: '版本', value: data?.system?.version || '-' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 8px',
                        borderBottom: i < 1 ? '1px solid var(--xh-border)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)',
                        display: 'grid', placeItems: 'center', color: '#1677ff', fontSize: 14,
                      }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--xh-text)' }}>{item.value}</div>
                      </div>
                    </motion.div>
                  ))}

                  <div style={{ padding: '14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--xh-text-secondary)' }}>调试模式</span>
                    <span style={{
                      padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: data?.system?.debug ? 'rgba(245,158,11,0.08)' : 'rgba(22,163,74,0.08)',
                      color: data?.system?.debug ? '#f59e0b' : '#16a34a',
                      border: `1px solid ${data?.system?.debug ? 'rgba(245,158,11,0.15)' : 'rgba(22,163,74,0.15)'}`,
                    }}>
                      {data?.system?.debug ? '开启' : '关闭'}
                    </span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </BlurFade>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
