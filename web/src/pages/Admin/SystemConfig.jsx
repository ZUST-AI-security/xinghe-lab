import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Table, App } from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

import { getSystemConfig, updateSystemConfig } from '../../api/admin';
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

const SystemConfig = () => {
  const { message } = App.useApp();
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig();
      setConfigs(data);
    } catch {
      message.error('获取系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const dataSource = useMemo(
    () => Object.entries(configs).map(([key, payload]) => ({
      key, value: payload.value ?? '', description: payload.description ?? '',
    })),
    [configs]
  );

  const getEditingValue = (key, field, fallback) => editing[key]?.[field] ?? fallback;

  const patchEditing = (key, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [key]: {
        value: prev[key]?.value ?? configs[key]?.value ?? '',
        description: prev[key]?.description ?? configs[key]?.description ?? '',
        [field]: value,
      },
    }));
  };

  const handleSave = async (key) => {
    const current = editing[key];
    if (!current) return;
    try {
      await updateSystemConfig(key, current.value, current.description);
      message.success(`配置 ${key} 已更新`);
      setEditing((prev) => { const next = { ...prev }; delete next[key]; return next; });
      fetchConfig();
    } catch {
      message.error('配置更新失败');
    }
  };

  const handleAdd = async () => {
    if (!newKey || !newValue) { message.warning('请填写配置键和值'); return; }
    try {
      await updateSystemConfig(newKey, newValue, newDesc);
      message.success('配置已新增');
      setNewKey(''); setNewValue(''); setNewDesc('');
      fetchConfig();
    } catch {
      message.error('新增配置失败');
    }
  };

  const columns = [
    {
      title: '配置键', dataIndex: 'key', width: 260,
      render: (v) => (
        <span style={{
          padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
          background: 'var(--xh-bg)', border: '1px solid var(--xh-border)', color: '#7c3aed',
        }}>{v}</span>
      ),
    },
    {
      title: '配置值', dataIndex: 'value', width: 280,
      render: (v, record) => (
        <Input
          value={getEditingValue(record.key, 'value', v)}
          onChange={(e) => patchEditing(record.key, 'value', e.target.value)}
          onPressEnter={() => handleSave(record.key)}
          style={{ borderRadius: 8 }}
        />
      ),
    },
    {
      title: '说明', dataIndex: 'description',
      render: (v, record) => (
        <Input
          value={getEditingValue(record.key, 'description', v)}
          onChange={(e) => patchEditing(record.key, 'description', e.target.value)}
          onPressEnter={() => handleSave(record.key)}
          style={{ borderRadius: 8 }}
        />
      ),
    },
    {
      title: '', width: 80,
      render: (_, record) => (
        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
          <Button
            size="small" icon={<SaveOutlined />}
            onClick={() => handleSave(record.key)}
            disabled={!editing[record.key]}
            style={{ borderRadius: 8 }}
          />
        </motion.div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: '40px 36px 36px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText text="SYSTEM CONFIG" duration={800}
              style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff', letterSpacing: 3, marginBottom: 16, padding: '4px 14px', borderRadius: 999, background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)' }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect words="系统配置" duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 480, margin: '0 auto' }}
            >
              在后台直接调整限流、窗口时间和其他关键运行参数，更新后新的请求会按最新配置生效。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Add new config */}
      <BlurFade delay={0.1}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 8px rgba(22,163,74,0.4)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>新增配置</span>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <Input placeholder="配置键" value={newKey} onChange={(e) => setNewKey(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
              <Input placeholder="配置值" value={newValue} onChange={(e) => setNewValue(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
              <Input placeholder="说明" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ borderRadius: 10, fontWeight: 600 }}>添加</Button>
              </motion.div>
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Config table */}
      <BlurFade delay={0.15}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.4)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>当前配置</span>
              </div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button icon={<ReloadOutlined />} onClick={fetchConfig} style={{ borderRadius: 10, fontWeight: 600 }}>刷新</Button>
              </motion.div>
            </div>

            <div style={{ padding: '0 8px 8px' }}>
              <Table
                rowKey="key" columns={columns} dataSource={dataSource} loading={loading}
                pagination={false} scroll={{ x: 1080 }}
                style={{ padding: '8px 0' }}
              />
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>
    </div>
  );
};

export default SystemConfig;
