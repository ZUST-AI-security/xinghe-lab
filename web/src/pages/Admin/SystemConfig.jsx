import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Table, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { getSystemConfig, updateSystemConfig } from '../../api/admin';

const { Title } = Typography;

const SystemConfig = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editing, setEditing] = useState({});

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig();
      setConfigs(data);
    } catch {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async (key) => {
    const val = editing[key];
    if (val === undefined) return;
    try {
      await updateSystemConfig(key, val);
      message.success(`配置 ${key} 已更新`);
      setEditing((e) => { const n = { ...e }; delete n[key]; return n; });
      fetchConfig();
    } catch {
      message.error('更新失败');
    }
  };

  const handleAdd = async () => {
    if (!newKey || !newValue) { message.warning('请填写配置键和值'); return; }
    try {
      await updateSystemConfig(newKey, newValue, newDesc);
      message.success('配置已添加');
      setNewKey(''); setNewValue(''); setNewDesc('');
      fetchConfig();
    } catch {
      message.error('添加失败');
    }
  };

  const dataSource = Object.entries(configs).map(([key, { value, description }]) => ({
    key, value, description,
  }));

  const columns = [
    { title: '配置键', dataIndex: 'key', width: 200 },
    {
      title: '值', dataIndex: 'value', width: 300,
      render: (val, record) => (
        <Input
          value={editing[record.key] !== undefined ? editing[record.key] : val}
          onChange={(e) => setEditing((ed) => ({ ...ed, [record.key]: e.target.value }))}
          onPressEnter={() => handleSave(record.key)}
        />
      ),
    },
    { title: '说明', dataIndex: 'description', width: 300 },
    {
      title: '操作', width: 100,
      render: (_, record) => (
        <Button
          size="small"
          icon={<SaveOutlined />}
          onClick={() => handleSave(record.key)}
          disabled={editing[record.key] === undefined}
        >
          保存
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>系统配置</Title>

      <Card title="添加新配置" style={{ marginBottom: 24 }} size="small">
        <Space>
          <Input placeholder="配置键" value={newKey} onChange={(e) => setNewKey(e.target.value)} style={{ width: 160 }} />
          <Input placeholder="值" value={newValue} onChange={(e) => setNewValue(e.target.value)} style={{ width: 200 }} />
          <Input placeholder="说明（可选）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加</Button>
        </Space>
      </Card>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无配置项' }}
        title={() => (
          <Button icon={<ReloadOutlined />} onClick={fetchConfig} size="small">刷新</Button>
        )}
      />
    </div>
  );
};

export default SystemConfig;
