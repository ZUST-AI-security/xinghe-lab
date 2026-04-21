import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

import { getAttackHistory } from '../../api/admin';

const { Title, Paragraph } = Typography;

const algorithmOptions = [
  { label: 'FGSM', value: 'fgsm' },
  { label: 'I-FGSM', value: 'ifgsm' },
  { label: 'PGD', value: 'pgd' },
  { label: 'C&W', value: 'cw' },
  { label: 'DeepFool', value: 'deepfool' },
];

const statusOptions = [
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
];

const AttackHistory = () => {
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
      const data = await getAttackHistory({
        page: nextPage,
        size: nextSize,
        algorithm,
        status,
        user_id: userId ? Number(userId) : 0,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
      setPageSize(data.size || nextSize);
    } finally {
      setLoading(false);
    }
  }, [algorithm, page, pageSize, status, userId]);

  useEffect(() => {
    fetchHistory(1, pageSize);
  }, [fetchHistory, pageSize]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '用户 ID', dataIndex: 'user_id', width: 90 },
    {
      title: '算法',
      dataIndex: 'algorithm',
      width: 120,
      render: (value) => <Tag className="xh-role-tag" color="blue">{(value || '-').toUpperCase()}</Tag>,
    },
    { title: '模型', dataIndex: 'model_name', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value) => (
        <Tag className="xh-status-tag" color={value === 'completed' ? 'green' : value === 'failed' ? 'red' : 'gold'}>
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'success_rate',
      width: 110,
      render: (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`),
    },
    {
      title: '耗时',
      dataIndex: 'execution_time',
      width: 100,
      render: (value) => (value == null ? '-' : `${value.toFixed(2)} s`),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
  ];

  return (
    <div className="xh-page-shell">
      <Card className="xh-page-banner" bordered={false}>
        <div className="xh-page-kicker">ATTACK HISTORY</div>
        <Title level={2} className="xh-page-title">
          全站攻击历史
        </Title>
        <Paragraph className="xh-page-desc">
          管理员可以按用户、算法和状态筛选全站攻击记录，查看执行表现与历史结果。
        </Paragraph>
      </Card>

      <Card className="xh-admin-table-card" bordered={false}>
        <div className="xh-toolbar">
          <div className="xh-toolbar-filters">
            <Input
              placeholder="按用户 ID 筛选"
              prefix={<SearchOutlined />}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              onPressEnter={() => fetchHistory(1, pageSize)}
            />
            <Select
              allowClear
              placeholder="按算法筛选"
              value={algorithm || undefined}
              onChange={(value) => setAlgorithm(value || '')}
              options={algorithmOptions}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              value={status || undefined}
              onChange={(value) => setStatus(value || '')}
              options={statusOptions}
            />
          </div>
          <div className="xh-toolbar-actions">
            <Button icon={<ReloadOutlined />} onClick={() => fetchHistory(1, pageSize)}>
              刷新
            </Button>
          </div>
        </div>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          scroll={{ x: 1040 }}
          locale={{ emptyText: <Empty description="暂无攻击记录" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => fetchHistory(nextPage, nextSize),
          }}
        />
      </Card>
    </div>
  );
};

export default AttackHistory;
