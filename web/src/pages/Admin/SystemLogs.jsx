import React, { useEffect, useState } from 'react';
import { Button, Input, Select, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { getSystemLogs } from '../../api/admin';
import {
  SpotlightCard, TextGenerateEffect,
} from '../../components/Aceternity';
import { BlurFade, HyperText } from '../../components/MagicUI';

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const SystemLogs = () => {
  const { message } = App.useApp();
  const [lines, setLines] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [numLines, setNumLines] = useState(200);
  const [level, setLevel] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getSystemLogs({ lines: numLines, level });
      setLines(data.lines || []);
      setTotal(data.total || 0);
    } catch {
      message.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const getLineColor = (line) => {
    if (line.includes('ERROR')) return '#dc2626';
    if (line.includes('WARNING')) return '#f59e0b';
    if (line.includes('INFO')) return '#3b82f6';
    return 'var(--xh-text-secondary)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 36px)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText text="SYSTEM LOGS" duration={800}
              style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff', letterSpacing: 3, marginBottom: 16, padding: '4px 14px', borderRadius: 999, background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)' }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect words="系统日志" duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>

      <BlurFade delay={0.15}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--xh-border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <Select
                  placeholder="日志级别" value={level || undefined} onChange={(v) => setLevel(v || '')} allowClear style={{ width: 120 }}
                  options={[{ label: 'INFO', value: 'INFO' }, { label: 'WARNING', value: 'WARNING' }, { label: 'ERROR', value: 'ERROR' }]}
                />
                <Input type="number" value={numLines} onChange={(e) => setNumLines(Number(e.target.value))} style={{ width: 100 }} min={1} max={1000} addonAfter="行" />
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading} style={{ borderRadius: 10, fontWeight: 600 }}>刷新</Button>
                </motion.div>
              </div>
              <span style={{ fontSize: 13, color: 'var(--xh-text-tertiary)' }}>共 {total} 行日志</span>
            </div>

            <div style={{ padding: '16px 24px' }}>
              <div style={{
                background: '#0f172a', borderRadius: 14,
                maxHeight: 'calc(100vh - 360px)', overflow: 'auto',
                padding: 16,
              }}>
                {lines.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>暂无日志记录</div>
                ) : (
                  <pre style={{ margin: 0, fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace', fontSize: 12, lineHeight: 1.7 }}>
                    {lines.map((line, idx) => (
                      <div key={idx} style={{ color: getLineColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {line}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>
    </div>
  );
};

export default SystemLogs;
