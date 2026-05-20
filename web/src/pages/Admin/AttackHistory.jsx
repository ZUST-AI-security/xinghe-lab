import React, { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Input, Select, Table, App } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

import { getAttackHistory } from '../../api/admin';
import {
  SpotlightCard, TextGenerateEffect,
} from '../../components/Aceternity';
import { BlurFade, HyperText } from '../../components/MagicUI';

const ALGO_COLORS = { fgsm: '#3b82f6', ifgsm: '#8b5cf6', pgd: '#06b6d4', cw: '#f59e0b', deepfool: '#10b981' };

const statusConfig = {
  completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.15)' },
  failed: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.15)' },
  running: { color: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  pending: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const algorithmOptions = [
  { label: 'FGSM', value: 'fgsm' }, { label: 'I-FGSM', value: 'ifgsm' },
  { label: 'PGD', value: 'pgd' }, { label: 'C&W', value: 'cw' }, { label: 'DeepFool', value: 'deepfool' },
];
const statusOptions = [
  { label: '运行中', value: 'running' }, { label: '已完成', value: 'completed' }, { label: '失败', value: 'failed' },
];

const AttackHistory = () => {
  const { message } = App.useApp();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [algorithm, setAlgorithm] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const data = await getAttackHistory({ page: nextPage, size: nextSize, algorithm, status, user_id: userId ? Number(userId) : 0 });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
      setPageSize(data.size || nextSize);
    } catch {
      message.error('获取攻击历史失败');
    } finally {
      setLoading(false);
    }
  }, [algorithm, page, pageSize, status, userId]);

  useEffect(() => { fetchHistory(1, pageSize); }, [fetchHistory, pageSize]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '用户 ID', dataIndex: 'user_id', width: 90, render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span> },
    {
      title: '算法', dataIndex: 'algorithm', width: 120,
      render: (v) => {
        const color = ALGO_COLORS[(v || '').toLowerCase()] || '#60a5fa';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              background: `${color}10`, border: `1px solid ${color}18`,
              display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, color,
            }}>
              {(v || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--xh-text)' }}>{(v || '-').toUpperCase()}</span>
          </div>
        );
      },
    },
    { title: '模型', dataIndex: 'model_name', width: 180, render: (v) => <span style={{ color: 'var(--xh-text-secondary)' }}>{v || '-'}</span> },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (v) => {
        const cfg = statusConfig[v] || statusConfig.pending;
        return (
          <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {v || '-'}
          </span>
        );
      },
    },
    {
      title: '成功率', dataIndex: 'success_rate', width: 100,
      render: (v) => {
        if (v == null) return <span style={{ color: 'var(--xh-text-tertiary)' }}>-</span>;
        const pct = v * 100;
        const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
        return <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>;
      },
    },
    { title: '耗时', dataIndex: 'execution_time', width: 100, render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--xh-text-secondary)' }}>{v == null ? '-' : `${v.toFixed(2)}s`}</span> },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v) => <span style={{ color: 'var(--xh-text-tertiary)', fontSize: 13 }}>{v ? new Date(v).toLocaleString() : '-'}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 36px)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText text="ATTACK HISTORY" duration={800}
              style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff', letterSpacing: 3, marginBottom: 16, padding: '4px 14px', borderRadius: 999, background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)' }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect words="全站攻击历史" duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 480, margin: '0 auto' }}
            >
              管理员可以按用户、算法和状态筛选全站攻击记录，查看执行表现与历史结果。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      <BlurFade delay={0.15}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--xh-border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <Input allowClear placeholder="按用户 ID 筛选" prefix={<SearchOutlined />} value={userId} onChange={(e) => setUserId(e.target.value)} onPressEnter={() => fetchHistory(1, pageSize)} style={{ width: 160 }} />
                <Select allowClear placeholder="按算法筛选" value={algorithm || undefined} onChange={(v) => setAlgorithm(v || '')} options={algorithmOptions} style={{ width: 130 }} />
                <Select allowClear placeholder="按状态筛选" value={status || undefined} onChange={(v) => setStatus(v || '')} options={statusOptions} style={{ width: 130 }} />
              </div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button icon={<ReloadOutlined />} onClick={() => fetchHistory(1, pageSize)} style={{ borderRadius: 10, fontWeight: 600 }}>刷新</Button>
              </motion.div>
            </div>

            <div style={{ padding: '0 8px 8px' }}>
              <Table
                rowKey="id" columns={columns} dataSource={items} loading={loading} scroll={{ x: 1040 }}
                locale={{ emptyText: <Empty description="暂无攻击记录" /> }}
                pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => fetchHistory(p, s), style: { padding: '12px 16px 4px' } }}
              />
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>
    </div>
  );
};

export default AttackHistory;
