import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Descriptions, Empty, Modal, Select, Space, Table, Tag, Typography, App,
} from 'antd';
import { EyeOutlined, ReloadOutlined, HistoryOutlined, FilterOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { getMyTaskHistory } from '../../api/tasks';
import {
  SpotlightCard, TextGenerateEffect, GlowingEffect,
} from '../../components/Aceternity';
import {
  BlurFade, HyperText, GlareHover, BorderBeam,
} from '../../components/MagicUI';

const { Text } = Typography;

const ALGO_COLORS = { fgsm: '#3b82f6', ifgsm: '#8b5cf6', pgd: '#06b6d4', cw: '#f59e0b', deepfool: '#10b981' };

const statusConfig = {
  success: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.15)' },
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

const TaskHistory = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [algorithm, setAlgorithm] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailRecord, setDetailRecord] = useState(null);

  const fetchHistory = useCallback(async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const response = await getMyTaskHistory({ page, size, algorithm, status });
      setData(response.items || []);
      setPagination({ current: response.page, pageSize: response.size, total: response.total });
    } catch {
      message.error('获取任务历史失败');
    } finally {
      setLoading(false);
    }
  }, [algorithm, status]);

  useEffect(() => { fetchHistory(1, pagination.pageSize); }, [fetchHistory, pagination.pageSize]);

  const columns = [
    {
      title: '算法', dataIndex: 'algorithm_name', key: 'algorithm_name', width: 120,
      render: (v) => {
        const color = ALGO_COLORS[(v || '').toLowerCase()] || '#60a5fa';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: `${color}10`, border: `1px solid ${color}18`,
              display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color,
            }}>
              {(v || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--xh-text)' }}>{(v || '-').toUpperCase()}</span>
          </div>
        );
      },
    },
    {
      title: '模型', dataIndex: 'model_name', key: 'model_name',
      render: (v) => <span style={{ color: 'var(--xh-text-secondary)' }}>{v || '-'}</span>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 110,
      render: (v) => {
        const cfg = statusConfig[v] || statusConfig.pending;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          }}>
            {v === 'running' && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: cfg.color,
                animation: 'pulse-dot 1.5s infinite',
              }} />
            )}
            {v || '-'}
          </span>
        );
      },
    },
    {
      title: '成功率', dataIndex: 'success_rate', key: 'success_rate', width: 100,
      render: (v) => {
        if (v == null) return <span style={{ color: 'var(--xh-text-tertiary)' }}>-</span>;
        const pct = v * 100;
        const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--xh-border)' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      title: '耗时', dataIndex: 'execution_time', key: 'execution_time', width: 90,
      render: (v) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--xh-text-secondary)' }}>
          {v == null ? '-' : `${v.toFixed(2)}s`}
        </span>
      ),
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (v) => <span style={{ color: 'var(--xh-text-tertiary)', fontSize: 13 }}>{v ? new Date(v).toLocaleString() : '-'}</span>,
    },
    {
      title: '', key: 'action', width: 50,
      render: (_, record) => (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setDetailRecord(record)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--xh-border)',
            background: 'var(--xh-bg)', cursor: 'pointer', display: 'grid', placeItems: 'center',
            color: 'var(--xh-text-secondary)',
          }}
        >
          <EyeOutlined style={{ fontSize: 14 }} />
        </motion.button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero Banner */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 36px)', textAlign: 'center' }}>
            <BorderBeam size={160} duration={14} delay={0} />
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText
              text="TASK HISTORY"
              duration={800}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff',
                letterSpacing: 3, marginBottom: 16,
                padding: '4px 14px', borderRadius: 999,
                background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)',
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect
                words="我的攻击任务"
                duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 480, margin: '0 auto' }}
            >
              查看历史任务、完成状态、模型输出和错误详情。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Filter + Table */}
      <BlurFade delay={0.15}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
            <GlowingEffect spread={40} proximity={120} />
            {/* Filter toolbar */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--xh-border)',
              display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--xh-text-secondary)', fontSize: 13, fontWeight: 600 }}>
                  <FilterOutlined /> 筛选
                </div>
                <Select
                  allowClear placeholder="按算法筛选" style={{ width: 150 }} onChange={(v) => setAlgorithm(v || '')}
                  options={[
                    { label: 'FGSM', value: 'fgsm' }, { label: 'I-FGSM', value: 'ifgsm' },
                    { label: 'PGD', value: 'pgd' }, { label: 'C&W', value: 'cw' }, { label: 'DeepFool', value: 'deepfool' },
                  ]}
                />
                <Select
                  allowClear placeholder="按状态筛选" style={{ width: 150 }} onChange={(v) => setStatus(v || '')}
                  options={[
                    { label: 'Pending', value: 'pending' }, { label: 'Running', value: 'running' },
                    { label: 'Completed', value: 'completed' }, { label: 'Success', value: 'success' }, { label: 'Failed', value: 'failed' },
                  ]}
                />
              </div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchHistory()}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  刷新
                </Button>
              </motion.div>
            </div>

            {/* Table */}
            <div style={{ padding: '0 8px 8px' }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 800 }}
                locale={{
                  emptyText: (
                    <div style={{ padding: '48px 0' }}>
                      <div style={{
                        width: 80, height: 80, borderRadius: 20, margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, rgba(22,119,255,0.06) 0%, rgba(124,58,237,0.06) 100%)',
                        border: '1px solid rgba(22,119,255,0.1)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <HistoryOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--xh-text)', marginBottom: 6 }}>暂无任务历史</div>
                      <div style={{ fontSize: 13, color: 'var(--xh-text-tertiary)' }}>提交一个攻击实验后，任务记录将显示在这里</div>
                    </div>
                  ),
                }}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  onChange: (p, s) => fetchHistory(p, s),
                  style: { padding: '12px 16px 4px' },
                }}
              />
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Detail Modal */}
      <Modal
        title={null}
        open={Boolean(detailRecord)}
        onCancel={() => setDetailRecord(null)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0 } }}
      >
        {detailRecord && (
          <div style={{ padding: 0 }}>
            {/* Modal header */}
            <div style={{
              padding: '24px 28px 20px', borderBottom: '1px solid var(--xh-border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {(() => {
                const algoColor = ALGO_COLORS[(detailRecord.algorithm_name || '').toLowerCase()] || '#60a5fa';
                return (
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${algoColor}10`, border: `1px solid ${algoColor}18`,
                    display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, color: algoColor,
                  }}>
                    {(detailRecord.algorithm_name || '?')[0].toUpperCase()}
                  </div>
                );
              })()}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--xh-text)' }}>
                  {(detailRecord.algorithm_name || '-').toUpperCase()} 任务详情
                </div>
                <div style={{ fontSize: 12, color: 'var(--xh-text-tertiary)', marginTop: 2 }}>
                  ID: {detailRecord.id} · {detailRecord.created_at ? new Date(detailRecord.created_at).toLocaleString() : ''}
                </div>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 28px 28px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                {[
                  { label: '算法', value: (detailRecord.algorithm_name || '-').toUpperCase() },
                  { label: '模型', value: detailRecord.model_name || '-' },
                  { label: '状态', value: detailRecord.status },
                  { label: '成功率', value: detailRecord.success_rate == null ? '-' : `${(detailRecord.success_rate * 100).toFixed(1)}%` },
                  { label: '创建时间', value: detailRecord.created_at ? new Date(detailRecord.created_at).toLocaleString() : '-' },
                  { label: '完成时间', value: detailRecord.completed_at ? new Date(detailRecord.completed_at).toLocaleString() : '-' },
                ].map((item) => (
                  <div key={item.label} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--xh-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--xh-text)' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {detailRecord.result?.metadata && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--xh-text)', marginBottom: 8 }}>元数据</div>
                  <pre style={{
                    margin: 0, padding: 16, borderRadius: 12,
                    background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
                    fontSize: 12, lineHeight: 1.6, color: 'var(--xh-text-secondary)',
                    whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200,
                  }}>
                    {JSON.stringify(detailRecord.result.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {detailRecord.error && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>错误信息</div>
                  <div style={{
                    padding: 14, borderRadius: 12,
                    background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
                    fontSize: 13, color: '#dc2626', lineHeight: 1.6,
                  }}>
                    {detailRecord.error}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default TaskHistory;
