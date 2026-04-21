import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Table,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';

import { getSystemConfig, updateSystemConfig } from '../../api/admin';

const { Title, Paragraph, Text } = Typography;

const SystemConfig = () => {
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

  useEffect(() => {
    fetchConfig();
  }, []);

  const dataSource = useMemo(
    () => Object.entries(configs).map(([key, payload]) => ({
      key,
      value: payload.value ?? '',
      description: payload.description ?? '',
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
    if (!current) {
      return;
    }
    try {
      await updateSystemConfig(key, current.value, current.description);
      message.success(`配置 ${key} 已更新`);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      fetchConfig();
    } catch {
      message.error('配置更新失败');
    }
  };

  const handleAdd = async () => {
    if (!newKey || !newValue) {
      message.warning('请填写配置键和值');
      return;
    }
    try {
      await updateSystemConfig(newKey, newValue, newDesc);
      message.success('配置已新增');
      setNewKey('');
      setNewValue('');
      setNewDesc('');
      fetchConfig();
    } catch {
      message.error('新增配置失败');
    }
  };

  const columns = [
    {
      title: '配置键',
      dataIndex: 'key',
      width: 260,
      render: (value) => <Text code>{value}</Text>,
    },
    {
      title: '配置值',
      dataIndex: 'value',
      width: 280,
      render: (value, record) => (
        <Input
          value={getEditingValue(record.key, 'value', value)}
          onChange={(event) => patchEditing(record.key, 'value', event.target.value)}
          onPressEnter={() => handleSave(record.key)}
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (value, record) => (
        <Input
          value={getEditingValue(record.key, 'description', value)}
          onChange={(event) => patchEditing(record.key, 'description', event.target.value)}
          onPressEnter={() => handleSave(record.key)}
        />
      ),
    },
    {
      title: '操作',
      width: 110,
      render: (_, record) => (
        <Button
          size="small"
          icon={<SaveOutlined />}
          onClick={() => handleSave(record.key)}
          disabled={!editing[record.key]}
        >
          保存
        </Button>
      ),
    },
  ];

  return (
    <div className="xh-page-shell">
      <Card className="xh-page-banner" bordered={false}>
        <div className="xh-page-kicker">SYSTEM CONFIG</div>
        <Title level={2} className="xh-page-title">
          系统配置
        </Title>
        <Paragraph className="xh-page-desc">
          在后台直接调整限流、窗口时间和其他关键运行参数，更新后新的请求会按最新配置生效。
        </Paragraph>
      </Card>

      <Card title="新增配置" className="xh-admin-card" bordered={false}>
        <div className="xh-toolbar">
          <div className="xh-toolbar-filters" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Input
              placeholder="配置键"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
            <Input
              placeholder="配置值"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
            />
            <Input
              placeholder="说明"
              value={newDesc}
              onChange={(event) => setNewDesc(event.target.value)}
            />
          </div>
          <div className="xh-toolbar-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title="当前配置"
        className="xh-admin-table-card"
        bordered={false}
        extra={<Button icon={<ReloadOutlined />} onClick={fetchConfig}>刷新</Button>}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
          scroll={{ x: 1080 }}
        />
      </Card>
    </div>
  );
};

export default SystemConfig;
