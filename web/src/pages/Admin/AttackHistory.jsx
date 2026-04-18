import React, { useEffect, useState, useCallback } from 'react';
import { Button, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getAttackHistory } from '../../../api/admin';

const { Title } = Typography;

const AttackHistory = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [algorithm, setAlgorithm] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAttackHistory({ page, size: pageSize, algorithm });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      message.error('获取攻击历史失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, algorithm]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户ID', dataIndex: 'user_id', width: 80 },
    {
      title: '算法', dataIndex: 'algorithm', width: 100,
      render: (algo) => <Tag color="blue">{algo?.toUpperCase()}</Tag>,
    },
    { title: '模型', dataIndex: 'model_name', width: 160 },
    {
      title: '成功', dataIndex: 'success', width: 70,
      render: (s) => <Tag color={s ? 'green' : 'red'}>{s ? '是' : '否'}</Tag>,
    },
    { title: '成功率', dataIndex: 'success_rate', width: 80, render: (v) => v != null ? `${(v * 100).toFixed(1)}%` : '-' },
    { title: 'L2 范数', dataIndex: 'l2_norm', width: 90, render: (v) => v != null ? v.toFixed(4) : '-' },
    { title: 'L∞ 范数', dataIndex: 'linf_norm', width: 90, render: (v) => v != null ? v.toFixed(4) : '-' },
    { title: '耗时(s)', dataIndex: 'execution_time', width: 80, render: (v) => v != null ? v.toFixed(2) : '-' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s) => {
        const colors = { completed: 'green', failed: 'red', running: 'blue', pending: 'orange' };
        return <Tag color={colors[s] || 'default'}>{s || '-'}</Tag>;
      },
    },
    { title: '时间', dataIndex: 'created_at', width: 170, render: (t) => t ? new Date(t).toLocaleString() : '-' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>攻击任务历史</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="算法筛选"
          value={algorithm || undefined}
          onChange={(val) => { setAlgorithm(val || ''); setPage(1); }}
          allowClear
          style={{ width: 140 }}
          options={[
            { label: 'FGSM', value: 'fgsm' },
            { label: 'I-FGSM', value: 'ifgsm' },
            { label: 'PGD', value: 'pgd' },
            { label: 'C&W', value: 'cw' },
            { label: 'DeepFool', value: 'deepfool' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchHistory}>刷新</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setPageSize(s); },
        }}
        scroll={{ x: 1200 }}
        size="small"
      />
    </div>
  );
};

export default AttackHistory;
