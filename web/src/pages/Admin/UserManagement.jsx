import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
  LockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { getUsers, updateUser, toggleUserActive, resetUserPassword, deleteUser } from '../../../api/admin';

const { Title } = Typography;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers({ page, size: pageSize, search, role: roleFilter });
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (userId) => {
    await toggleUserActive(userId);
    message.success('操作成功');
    fetchUsers();
  };

  const handleResetPassword = async (userId) => {
    await resetUserPassword(userId);
    message.success('密码已重置为 Abc12345');
  };

  const handleDelete = async (userId) => {
    await deleteUser(userId);
    message.success('删除成功');
    fetchUsers();
  };

  const handleEditSave = async () => {
    try {
      await updateUser(editModal.user.id, editForm);
      message.success('更新成功');
      setEditModal({ open: false, user: null });
      fetchUsers();
    } catch {
      message.error('更新失败');
    }
  };

  const openEdit = (user) => {
    setEditForm({ email: user.email, full_name: user.full_name, role: user.role });
    setEditModal({ open: true, user });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 200 },
    { title: '全名', dataIndex: 'full_name', width: 120 },
    {
      title: '角色', dataIndex: 'role', width: 80,
      render: (role) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>,
    },
    {
      title: '状态', dataIndex: 'is_active', width: 80,
      render: (active) => <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t) => t ? new Date(t).toLocaleString() : '-' },
    {
      title: '操作', width: 280, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button size="small" onClick={() => handleToggleActive(record.id)}>
            {record.is_active ? '禁用' : '启用'}
          </Button>
          <Popconfirm title="确认重置密码？" onConfirm={() => handleResetPassword(record.id)}>
            <Button size="small" icon={<LockOutlined />}>重置密码</Button>
          </Popconfirm>
          <Popconfirm title="确认删除？此操作不可撤销。" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<UserDeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>用户管理</Title>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索用户名/邮箱/全名"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={fetchUsers}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="角色筛选"
          value={roleFilter || undefined}
          onChange={(val) => setRoleFilter(val || '')}
          allowClear
          style={{ width: 120 }}
          options={[
            { label: '管理员', value: 'admin' },
            { label: '普通用户', value: 'user' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setPageSize(s); },
        }}
        scroll={{ x: 1100 }}
        size="small"
      />

      <Modal
        title="编辑用户"
        open={editModal.open}
        onOk={handleEditSave}
        onCancel={() => setEditModal({ open: false, user: null })}
      >
        <div style={{ marginBottom: 12 }}>
          <label>邮箱</label>
          <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>全名</label>
          <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>角色</label>
          <Select
            value={editForm.role}
            onChange={(val) => setEditForm((f) => ({ ...f, role: val }))}
            style={{ width: '100%' }}
            options={[
              { label: '管理员', value: 'admin' },
              { label: '普通用户', value: 'user' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
