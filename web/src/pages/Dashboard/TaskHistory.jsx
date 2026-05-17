import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Descriptions, Empty, Modal, Select, Space, Table, Tag, Typography, message,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMyTaskHistory } from '../../api/tasks';
import FloatUp from '../../components/Aceternity/FloatUp';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import PulseDot from '../../components/Aceternity/AnimatedTestimonials';

const { Title, Text } = Typography;

const statusColorMap = {
  success: 'green', completed: 'green', failed: 'red', running: 'processing', pending: 'gold',
};

const TaskHistory = () => {
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
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '算法', dataIndex: 'algorithm_name', key: 'algorithm_name',
      render: (v) => <Tag color="blue">{(v || '-').toUpperCase()}</Tag>,
    },
    { title: '模型', dataIndex: 'model_name', key: 'model_name', render: (v) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v) => (
        <Space size={4}>
          {v === 'running' && <PulseDot color="var(--xh-primary)" size={6} />}
          <Tag color={statusColorMap[v] || 'default'}>{v || '-'}</Tag>
        </Space>
      ),
    },
    { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (v) => (v == null ? '-' : `${(v * 100).toFixed(1)}%`) },
    { title: '耗时', dataIndex: 'execution_time', key: 'execution_time', render: (v) => (v == null ? '-' : `${v.toFixed(2)} s`) },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
    {
      title: '操作', key: 'action',
      render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setDetailRecord(record)}>查看</Button>,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <FloatUp>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <Card style={{ borderRadius: 20, border: '1px solid var(--xh-border)' }}>
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0 }}>我的攻击任务</Title>
              <Text type="secondary">查看历史任务、完成状态、模型输出和错误详情。</Text>
            </Space>
          </Card>
        </SpotlightCard>
      </FloatUp>

      <FloatUp delay={0.1}>
        <Card style={{ borderRadius: 20 }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Select allowClear placeholder="按算法筛选" style={{ width: 160 }} onChange={(v) => setAlgorithm(v || '')}
                options={[
                  { label: 'FGSM', value: 'fgsm' }, { label: 'I-FGSM', value: 'ifgsm' },
                  { label: 'PGD', value: 'pgd' }, { label: 'C&W', value: 'cw' }, { label: 'DeepFool', value: 'deepfool' },
                ]}
              />
              <Select allowClear placeholder="按状态筛选" style={{ width: 160 }} onChange={(v) => setStatus(v || '')}
                options={[
                  { label: 'Pending', value: 'pending' }, { label: 'Running', value: 'running' },
                  { label: 'Completed', value: 'completed' }, { label: 'Success', value: 'success' }, { label: 'Failed', value: 'failed' },
                ]}
              />
            </Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchHistory()}>刷新</Button>
          </Space>

          <Table
            style={{ marginTop: 16 }}
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description="暂无任务历史" /> }}
            pagination={{ ...pagination, showSizeChanger: true, onChange: (p, s) => fetchHistory(p, s) }}
          />
        </Card>
      </FloatUp>

      <Modal title="任务详情" open={Boolean(detailRecord)} onCancel={() => setDetailRecord(null)} footer={null} width={900}>
        {detailRecord && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="算法">{detailRecord.algorithm_name}</Descriptions.Item>
              <Descriptions.Item label="模型">{detailRecord.model_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{detailRecord.status}</Descriptions.Item>
              <Descriptions.Item label="成功率">
                {detailRecord.success_rate == null ? '-' : `${(detailRecord.success_rate * 100).toFixed(1)}%`}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detailRecord.created_at ? new Date(detailRecord.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {detailRecord.completed_at ? new Date(detailRecord.completed_at).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            {detailRecord.result?.metadata && (
              <Card size="small" title="元数据">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(detailRecord.result.metadata, null, 2)}</pre>
              </Card>
            )}
            {detailRecord.error && (
              <Card size="small" title="错误信息"><Text type="danger">{detailRecord.error}</Text></Card>
            )}
          </Space>
        )}
      </Modal>
    </Space>
  );
};

export default TaskHistory;
