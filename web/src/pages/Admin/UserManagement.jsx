import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';

import {
  deleteUser,
  getUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
} from '../../api/admin';

const { Title, Paragraph, Text } = Typography;

const DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
  search: '',
  role: '',
  activeFilter: '',
};

const EMPTY_EDIT_FORM = {
  email: '',
  full_name: '',
  role: 'user',
  is_active: 'true',
  bio: '',
};

const ROLE_META = {
  admin: { label: '管理员', color: 'volcano' },
  user: { label: '普通用户', color: 'blue' },
  viewer: { label: '访客', color: 'purple' },
};

const roleOptions = Object.entries(ROLE_META).map(([value, meta]) => ({
  label: meta.label,
  value,
}));

const activeOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
];

const createEditForm = (user = null) => ({
  email: user?.email || '',
  full_name: user?.full_name || '',
  role: user?.role || EMPTY_EDIT_FORM.role,
  is_active: user?.is_active === false ? 'false' : 'true',
  bio: user?.bio || '',
});

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const getRoleMeta = (value) => ROLE_META[value] || { label: value || '-', color: 'default' };

const getStatusMeta = (value) =>
  value
    ? { label: '启用', color: 'green' }
    : { label: '禁用', color: 'default' };

const isRequestHandled = (error) => Boolean(error?.response || error?.request);

const UserEditModal = ({
  user,
  formData,
  saving,
  onFieldChange,
  onCancel,
  onSave,
}) => (
  <Modal
    title="编辑用户"
    open={Boolean(user)}
    onOk={onSave}
    onCancel={onCancel}
    okText="保存"
    cancelText="取消"
    confirmLoading={saving}
    destroyOnClose
    width={620}
  >
    <Form layout="vertical" className="xh-form-grid">
      <Form.Item label="邮箱">
        <Input
          value={formData.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
        />
      </Form.Item>
      <Form.Item label="姓名">
        <Input
          value={formData.full_name}
          onChange={(event) => onFieldChange('full_name', event.target.value)}
        />
      </Form.Item>
      <Form.Item label="角色">
        <Select
          value={formData.role}
          onChange={(value) => onFieldChange('role', value)}
          options={roleOptions}
        />
      </Form.Item>
      <Form.Item label="账号状态">
        <Select
          value={formData.is_active}
          onChange={(value) => onFieldChange('is_active', value)}
          options={activeOptions}
        />
      </Form.Item>
      <Form.Item label="个人简介">
        <Input.TextArea
          rows={4}
          placeholder="填写用户备注或简介"
          value={formData.bio}
          onChange={(event) => onFieldChange('bio', event.target.value)}
        />
      </Form.Item>
      <Text type="secondary">
        说明：密码重置为默认值后，建议提醒用户在首次登录后立即修改密码。
      </Text>
    </Form>
  </Modal>
);

const createColumns = ({
  onEdit,
  onToggleActive,
  onResetPassword,
  onDelete,
}) => [
  { title: 'ID', dataIndex: 'id', width: 72, fixed: 'left' },
  { title: '用户名', dataIndex: 'username', width: 140 },
  {
    title: '邮箱',
    dataIndex: 'email',
    width: 240,
    render: (value) => value || '-',
  },
  {
    title: '姓名',
    dataIndex: 'full_name',
    width: 140,
    render: (value) => value || '-',
  },
  {
    title: '角色',
    dataIndex: 'role',
    width: 110,
    render: (value) => {
      const roleMeta = getRoleMeta(value);
      return (
        <Tag className="xh-role-tag" color={roleMeta.color}>
          {roleMeta.label}
        </Tag>
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    width: 100,
    render: (value) => {
      const statusMeta = getStatusMeta(value);
      return (
        <Tag className="xh-status-tag" color={statusMeta.color}>
          {statusMeta.label}
        </Tag>
      );
    },
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 180,
    render: (value) => formatDateTime(value),
  },
  {
    title: '最近登录',
    dataIndex: 'last_login_at',
    width: 180,
    render: (value) => formatDateTime(value),
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 320,
    render: (_, record) => (
      <div className="xh-action-group">
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
          编辑
        </Button>
        <Button size="small" onClick={() => onToggleActive(record)}>
          {record.is_active ? '禁用' : '启用'}
        </Button>
        <Popconfirm
          title="确认将密码重置为 Abc12345 吗？"
          okText="确认"
          cancelText="取消"
          onConfirm={() => onResetPassword(record)}
        >
          <Button size="small" icon={<LockOutlined />}>
            重置密码
          </Button>
        </Popconfirm>
        <Popconfirm
          title={`确认删除用户“${record.username}”吗？`}
          okText="确认"
          cancelText="取消"
          onConfirm={() => onDelete(record)}
        >
          <Button size="small" danger icon={<UserDeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    ),
  },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(() => createEditForm());
  const [saving, setSaving] = useState(false);

  const { activeFilter, page, pageSize, role, search } = query;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers({
        page,
        size: pageSize,
        search: search.trim(),
        role,
        is_active: activeFilter,
      });
      setUsers(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
    } catch (error) {
      if (!isRequestHandled(error)) {
        message.error('获取用户列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, pageSize, role, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = useCallback((event) => {
    const nextSearch = event.target.value;
    setQuery((prev) => ({ ...prev, search: nextSearch, page: 1 }));
  }, []);

  const handleRoleChange = useCallback((value) => {
    setQuery((prev) => ({ ...prev, role: value || '', page: 1 }));
  }, []);

  const handleActiveFilterChange = useCallback((value) => {
    setQuery((prev) => ({ ...prev, activeFilter: value || '', page: 1 }));
  }, []);

  const handleTableChange = useCallback((nextPage, nextPageSize) => {
    setQuery((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize,
    }));
  }, []);

  const openEditModal = useCallback((user) => {
    setEditingUser(user);
    setEditForm(createEditForm(user));
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingUser(null);
    setEditForm(createEditForm());
  }, []);

  const updateEditField = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const runUserAction = useCallback(
    async ({ request, successMessage, refresh = false, fallbackMessage }) => {
      try {
        await request();
        message.success(successMessage);

        if (refresh) {
          await fetchUsers();
        }

        return true;
      } catch (error) {
        if (!isRequestHandled(error)) {
          message.error(fallbackMessage);
        }

        return false;
      }
    },
    [fetchUsers]
  );

  const handleSave = useCallback(async () => {
    if (!editingUser || saving) {
      return;
    }

    setSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      message.success('用户信息已更新');
      closeEditModal();
      await fetchUsers();
    } catch (error) {
      if (!isRequestHandled(error)) {
        message.error('更新用户信息失败');
      }
    } finally {
      setSaving(false);
    }
  }, [closeEditModal, editForm, editingUser, fetchUsers, saving]);

  const handleToggleActive = useCallback(
    (user) =>
      runUserAction({
        request: () => toggleUserActive(user.id),
        successMessage: `已${user.is_active ? '禁用' : '启用'}用户`,
        refresh: true,
        fallbackMessage: '更新用户状态失败',
      }),
    [runUserAction]
  );

  const handleResetPassword = useCallback(
    (user) =>
      runUserAction({
        request: () => resetUserPassword(user.id),
        successMessage: '密码已重置为 Abc12345',
        fallbackMessage: '重置密码失败',
      }),
    [runUserAction]
  );

  const handleDelete = useCallback(
    async (user) => {
      const deleted = await runUserAction({
        request: () => deleteUser(user.id),
        successMessage: '用户已删除',
        fallbackMessage: '删除用户失败',
      });

      if (!deleted) {
        return;
      }

      if (users.length === 1 && page > 1) {
        setQuery((prev) => ({ ...prev, page: prev.page - 1 }));
        return;
      }

      await fetchUsers();
    },
    [fetchUsers, page, runUserAction, users.length]
  );

  const columns = createColumns({
    onEdit: openEditModal,
    onToggleActive: handleToggleActive,
    onResetPassword: handleResetPassword,
    onDelete: handleDelete,
  });

  return (
    <div className="xh-page-shell">
      <Card className="xh-page-banner" bordered={false}>
        <div className="xh-page-kicker">USER MANAGEMENT</div>
        <Title level={2} className="xh-page-title">
          用户管理
        </Title>
        <Paragraph className="xh-page-desc">
          支持按用户名、邮箱和状态筛选用户，并在同一页面完成资料维护、账号启停、密码重置和删除操作。
        </Paragraph>
      </Card>

      <Card className="xh-admin-table-card" bordered={false}>
        <div className="xh-toolbar">
          <div className="xh-toolbar-filters">
            <Input
              allowClear
              placeholder="搜索用户名、邮箱或姓名"
              prefix={<SearchOutlined />}
              value={search}
              onChange={handleSearchChange}
            />
            <Select
              allowClear
              placeholder="按角色筛选"
              value={role || undefined}
              onChange={handleRoleChange}
              options={roleOptions}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              value={activeFilter || undefined}
              onChange={handleActiveFilterChange}
              options={activeOptions}
            />
          </div>
          <div className="xh-toolbar-actions">
            <Text type="secondary">共 {total} 位用户</Text>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchUsers}>
              刷新
            </Button>
          </div>
        </div>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          scroll={{ x: 1420 }}
          locale={{ emptyText: '暂无匹配的用户数据' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count, range) => `${range[0]}-${range[1]} / 共 ${count} 条`,
            onChange: handleTableChange,
          }}
        />
      </Card>

      <UserEditModal
        user={editingUser}
        formData={editForm}
        saving={saving}
        onFieldChange={updateEditField}
        onCancel={closeEditModal}
        onSave={handleSave}
      />
    </div>
  );
};

export default UserManagement;
