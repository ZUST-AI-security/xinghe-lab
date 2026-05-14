/**
 * 管理员文件管理页面
 * 对应 Requirement 20：管理员后台文件管理功能
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { adminBatchDeleteFiles, adminDeleteFile, adminFileStats, adminListFiles } from '../../api/files';

const { Title, Text } = Typography;
const { confirm } = Modal;

const FileManagement = () => {
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [userIdFilter, setUserIdFilter] = useState(0);

  const fetchFiles = useCallback(async (page = 1, size = 20) => {
    setLoading(true);
    try {
      const data = await adminListFiles(page, size, userIdFilter);
      setFiles(data.items || []);
      setPagination({ current: data.page, pageSize: data.size, total: data.total });
    } catch {
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [userIdFilter]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminFileStats();
      setStats(data);
    } catch {
      // 静默失败
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(1, 20);
    fetchStats();
  }, [fetchFiles, fetchStats]);

  const handleDelete = (record) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除文件 <strong>{record.filename}</strong> 吗？</p>
          <p style={{ color: '#fa8c16', fontSize: 12 }}>此操作将物理删除文件，不可恢复。</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await adminDeleteFile(record.id);
          message.success('文件已删除');
          fetchFiles(pagination.current, pagination.pageSize);
          fetchStats();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文件');
      return;
    }
    confirm({
      title: `批量删除 ${selectedRowKeys.length} 个文件`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除选中的 <strong>{selectedRowKeys.length}</strong> 个文件吗？</p>
          <p style={{ color: '#fa8c16', fontSize: 12 }}>此操作将物理删除文件，不可恢复。</p>
        </div>
      ),
      okText: '确认批量删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await adminBatchDeleteFiles(selectedRowKeys);
          message.success(`已删除 ${selectedRowKeys.length} 个文件`);
          setSelectedRowKeys([]);
          fetchFiles(1, pagination.pageSize);
          fetchStats();
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: '上传用户',
      dataIndex: 'username',
      key: 'username',
      render: (value) => <Tag color="blue">{value || '-'}</Tag>,
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (value) => {
        if (!value) return '-';
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'is_deleted',
      key: 'is_deleted',
      render: (value) => (
        <Tag color={value ? 'red' : 'green'}>{value ? '已删除' : '正常'}</Tag>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          icon={<DeleteOutlined />}
          size="small"
          danger
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 页面标题 */}
      <Card style={{ borderRadius: 20 }}>
        <Space direction="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>文件管理</Title>
          <Text type="secondary">查看和管理所有用户上传的文件，监控存储使用情况。</Text>
        </Space>
      </Card>

      {/* 存储统计 */}
      {stats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic
                title="总文件数"
                value={stats.total_files}
                suffix="个"
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic
                title="总存储占用"
                value={stats.total_size_mb}
                suffix="MB"
                precision={2}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic
                title="上传用户数"
                value={stats.top_users?.length || 0}
                suffix="人"
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Top 10 用户存储排行 */}
      {stats?.top_users?.length > 0 && (
        <Card title="用户存储排行 Top 10" style={{ borderRadius: 20 }}>
          <Table
            rowKey="user_id"
            size="small"
            dataSource={stats.top_users}
            pagination={false}
            columns={[
              { title: '排名', render: (_, __, index) => index + 1, width: 60 },
              { title: '用户名', dataIndex: 'username', render: (v) => <Tag color="blue">{v}</Tag> },
              { title: '文件数', dataIndex: 'file_count', render: (v) => `${v} 个` },
              { title: '存储占用', dataIndex: 'total_size_mb', render: (v) => `${v} MB` },
            ]}
          />
        </Card>
      )}

      {/* 文件列表 */}
      <Card style={{ borderRadius: 20 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="按用户 ID 筛选"
              style={{ width: 160 }}
              onChange={(value) => setUserIdFilter(value || 0)}
              options={
                stats?.top_users?.map((u) => ({
                  label: `${u.username} (ID: ${u.user_id})`,
                  value: u.user_id,
                })) || []
              }
            />
          </Space>
          <Space wrap>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => { fetchFiles(); fetchStats(); }}>
              刷新
            </Button>
          </Space>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={files}
          loading={loading}
          scroll={{ x: 700 }}
          locale={{ emptyText: <Empty description="暂无文件记录" /> }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个文件`,
            onChange: (page, pageSize) => fetchFiles(page, pageSize),
          }}
        />
      </Card>
    </Space>
  );
};

export default FileManagement;
