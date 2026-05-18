import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
  App,
} from 'antd';
import {
  EditOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

import {
  deleteUser,
  getUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
} from '../../api/admin';
import {
  SpotlightCard, TextGenerateEffect,
} from '../../components/Aceternity';
import { BlurFade, HyperText } from '../../components/MagicUI';

const { Text } = Typography;

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const DEFAULT_QUERY = { page: 1, pageSize: 20, search: '', role: '', activeFilter: '' };
const EMPTY_EDIT_FORM = { email: '', full_name: '', role: 'user', is_active: 'true', bio: '' };

const ROLE_META = {
  admin: { label: '管理员', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.15)' },
  user: { label: '普通用户', color: '#1677ff', bg: 'rgba(22,119,255,0.08)', border: 'rgba(22,119,255,0.15)' },
  viewer: { label: '访客', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)' },
};

const roleOptions = Object.entries(ROLE_META).map(([value, meta]) => ({ label: meta.label, value }));
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
const getRoleMeta = (value) => ROLE_META[value] || { label: value || '-', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' };
const isRequestHandled = (error) => Boolean(error?.response || error?.request);

const UserEditModal = ({ user, formData, saving, onFieldChange, onCancel, onSave }) => (
  <Modal
    title={null}
    open={Boolean(user)}
    onOk={onSave}
    onCancel={onCancel}
    okText="保存"
    cancelText="取消"
    confirmLoading={saving}
    destroyOnClose
    width={620}
    styles={{ body: { padding: 0 } }}
  >
    {user && (
      <div>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--xh-border)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--xh-text)' }}>编辑用户</div>
          <div style={{ fontSize: 12, color: 'var(--xh-text-tertiary)', marginTop: 4 }}>
            {user.username} · ID: {user.id}
          </div>
        </div>
        <div style={{ padding: '20px 28px 28px' }}>
          <Form layout="vertical">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="邮箱" style={{ marginBottom: 12 }}>
                <Input value={formData.email} onChange={(e) => onFieldChange('email', e.target.value)} />
              </Form.Item>
              <Form.Item label="姓名" style={{ marginBottom: 12 }}>
                <Input value={formData.full_name} onChange={(e) => onFieldChange('full_name', e.target.value)} />
              </Form.Item>
              <Form.Item label="角色" style={{ marginBottom: 12 }}>
                <Select value={formData.role} onChange={(v) => onFieldChange('role', v)} options={roleOptions} />
              </Form.Item>
              <Form.Item label="账号状态" style={{ marginBottom: 12 }}>
                <Select value={formData.is_active} onChange={(v) => onFieldChange('is_active', v)} options={activeOptions} />
              </Form.Item>
            </div>
            <Form.Item label="个人简介" style={{ marginBottom: 12 }}>
              <Input.TextArea rows={3} placeholder="填写用户备注或简介" value={formData.bio} onChange={(e) => onFieldChange('bio', e.target.value)} />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>说明：密码重置为默认值后，建议提醒用户在首次登录后立即修改密码。</Text>
          </Form>
        </div>
      </div>
    )}
  </Modal>
);

const createColumns = ({ onEdit, onToggleActive, onResetPassword, onDelete }) => [
  { title: 'ID', dataIndex: 'id', width: 72, fixed: 'left' },
  { title: '用户名', dataIndex: 'username', width: 140, render: (v) => <span style={{ fontWeight: 600, color: 'var(--xh-text)' }}>{v}</span> },
  { title: '邮箱', dataIndex: 'email', width: 240, render: (v) => <span style={{ color: 'var(--xh-text-secondary)' }}>{v || '-'}</span> },
  { title: '姓名', dataIndex: 'full_name', width: 140, render: (v) => <span style={{ color: 'var(--xh-text-secondary)' }}>{v || '-'}</span> },
  {
    title: '角色', dataIndex: 'role', width: 110,
    render: (v) => {
      const m = getRoleMeta(v);
      return <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{m.label}</span>;
    },
  },
  {
    title: '状态', dataIndex: 'is_active', width: 100,
    render: (v) => (
      <span style={{
        padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: v ? 'rgba(22,163,74,0.08)' : 'rgba(107,114,128,0.08)',
        color: v ? '#16a34a' : '#6b7280',
        border: `1px solid ${v ? 'rgba(22,163,74,0.15)' : 'rgba(107,114,128,0.15)'}`,
      }}>
        {v ? '启用' : '禁用'}
      </span>
    ),
  },
  { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v) => <span style={{ color: 'var(--xh-text-tertiary)', fontSize: 13 }}>{formatDateTime(v)}</span> },
  { title: '最近登录', dataIndex: 'last_login_at', width: 170, render: (v) => <span style={{ color: 'var(--xh-text-tertiary)', fontSize: 13 }}>{formatDateTime(v)}</span> },
  {
    title: '', key: 'actions', fixed: 'right', width: 280,
    render: (_, record) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} style={{ borderRadius: 8 }}>编辑</Button>
        <Button size="small" onClick={() => onToggleActive(record)} style={{ borderRadius: 8 }}>{record.is_active ? '禁用' : '启用'}</Button>
        <Popconfirm title="确认将密码重置为 Abc12345 吗？" okText="确认" cancelText="取消" onConfirm={() => onResetPassword(record)}>
          <Button size="small" icon={<LockOutlined />} style={{ borderRadius: 8 }}>重置</Button>
        </Popconfirm>
        <Popconfirm title={`确认删除用户"${record.username}"吗？`} okText="确认" cancelText="取消" onConfirm={() => onDelete(record)}>
          <Button size="small" danger icon={<UserDeleteOutlined />} style={{ borderRadius: 8 }} />
        </Popconfirm>
      </div>
    ),
  },
];

const UserManagement = () => {
  const { message } = App.useApp();
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
      const data = await getUsers({ page, size: pageSize, search: search.trim(), role, is_active: activeFilter });
      setUsers(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
    } catch (error) {
      if (!isRequestHandled(error)) message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, pageSize, role, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearchChange = useCallback((e) => setQuery((p) => ({ ...p, search: e.target.value, page: 1 })), []);
  const handleRoleChange = useCallback((v) => setQuery((p) => ({ ...p, role: v || '', page: 1 })), []);
  const handleActiveFilterChange = useCallback((v) => setQuery((p) => ({ ...p, activeFilter: v || '', page: 1 })), []);
  const handleTableChange = useCallback((np, nps) => setQuery((p) => ({ ...p, page: np, pageSize: nps })), []);

  const openEditModal = useCallback((u) => { setEditingUser(u); setEditForm(createEditForm(u)); }, []);
  const closeEditModal = useCallback(() => { setEditingUser(null); setEditForm(createEditForm()); }, []);
  const updateEditField = useCallback((f, v) => setEditForm((p) => ({ ...p, [f]: v })), []);

  const runUserAction = useCallback(async ({ request, successMessage, refresh = false, fallbackMessage }) => {
    try {
      await request();
      message.success(successMessage);
      if (refresh) await fetchUsers();
      return true;
    } catch (error) {
      if (!isRequestHandled(error)) message.error(fallbackMessage);
      return false;
    }
  }, [fetchUsers]);

  const handleSave = useCallback(async () => {
    if (!editingUser || saving) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      message.success('用户信息已更新');
      closeEditModal();
      await fetchUsers();
    } catch (error) {
      if (!isRequestHandled(error)) message.error('更新用户信息失败');
    } finally {
      setSaving(false);
    }
  }, [closeEditModal, editForm, editingUser, fetchUsers, saving]);

  const handleToggleActive = useCallback((u) => runUserAction({
    request: () => toggleUserActive(u.id),
    successMessage: `已${u.is_active ? '禁用' : '启用'}用户`,
    refresh: true, fallbackMessage: '更新用户状态失败',
  }), [runUserAction]);

  const handleResetPassword = useCallback((u) => runUserAction({
    request: () => resetUserPassword(u.id),
    successMessage: '密码已重置为 Abc12345',
    fallbackMessage: '重置密码失败',
  }), [runUserAction]);

  const handleDelete = useCallback(async (u) => {
    const deleted = await runUserAction({ request: () => deleteUser(u.id), successMessage: '用户已删除', fallbackMessage: '删除用户失败' });
    if (!deleted) return;
    if (users.length === 1 && page > 1) { setQuery((p) => ({ ...p, page: p.page - 1 })); return; }
    await fetchUsers();
  }, [fetchUsers, page, runUserAction, users.length]);

  const columns = createColumns({ onEdit: openEditModal, onToggleActive: handleToggleActive, onResetPassword: handleResetPassword, onDelete: handleDelete });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: '40px 36px 36px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText
              text="USER MANAGEMENT"
              duration={800}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff',
                letterSpacing: 3, marginBottom: 16,
                padding: '4px 14px', borderRadius: 999,
                background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)',
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect
                words="用户管理"
                duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 480, margin: '0 auto' }}
            >
              支持按用户名、邮箱和状态筛选用户，并在同一页面完成资料维护、账号启停、密码重置和删除操作。
            </motion.p>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Table */}
      <BlurFade delay={0.15}>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
          <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--xh-border)',
              display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <Input allowClear placeholder="搜索用户名、邮箱或姓名" prefix={<SearchOutlined />} value={search} onChange={handleSearchChange} style={{ width: 220 }} />
                <Select allowClear placeholder="按角色筛选" value={role || undefined} onChange={handleRoleChange} options={roleOptions} style={{ width: 130 }} />
                <Select allowClear placeholder="按状态筛选" value={activeFilter || undefined} onChange={handleActiveFilterChange} options={activeOptions} style={{ width: 130 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--xh-text-tertiary)' }}>共 {total} 位用户</span>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchUsers} style={{ borderRadius: 10, fontWeight: 600 }}>刷新</Button>
                </motion.div>
              </div>
            </div>

            <div style={{ padding: '0 8px 8px' }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={users}
                loading={loading}
                scroll={{ x: 1420 }}
                locale={{ emptyText: '暂无匹配的用户数据' }}
                pagination={{
                  current: page, pageSize, total,
                  showSizeChanger: true,
                  showTotal: (c, r) => `${r[0]}-${r[1]} / 共 ${c} 条`,
                  onChange: handleTableChange,
                  style: { padding: '12px 16px 4px' },
                }}
              />
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>

      <UserEditModal
        user={editingUser} formData={editForm} saving={saving}
        onFieldChange={updateEditField} onCancel={closeEditModal} onSave={handleSave}
      />
    </div>
  );
};

export default UserManagement;
