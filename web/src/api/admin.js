import { api } from './client';

export const getAdminDashboard = async () => {
  const res = await api.get('/admin/dashboard');
  return res.data;
};

export const getAttackHistory = async ({
  page = 1,
  size = 20,
  algorithm = '',
  user_id = 0,
  status = '',
} = {}) => {
  const res = await api.get('/admin/attack-history', {
    params: { page, size, algorithm, user_id, status },
  });
  return res.data;
};

export const getSystemConfig = async () => {
  const res = await api.get('/admin/config');
  return res.data;
};

export const updateSystemConfig = async (key, value, description = '') => {
  const res = await api.put(`/admin/config/${key}`, { value, description });
  return res.data;
};

export const getSystemLogs = async ({ lines = 100, level = '' } = {}) => {
  const res = await api.get('/admin/logs', { params: { lines, level } });
  return res.data;
};

export const getUsers = async ({
  page = 1,
  size = 20,
  search = '',
  role = '',
  is_active = '',
} = {}) => {
  const res = await api.get('/admin/users', {
    params: { page, size, search, role, is_active },
  });
  return res.data;
};

export const updateUser = async (
  userId,
  {
    email = '',
    full_name = '',
    role = '',
    is_active = '',
    bio = '',
  } = {}
) => {
  const body = {};
  if (email) body.email = email;
  if (full_name) body.full_name = full_name;
  if (role) body.role = role;
  if (is_active !== '') body.is_active = is_active === 'true' || is_active === true;
  if (bio) body.bio = bio;
  const res = await api.put(`/admin/users/${userId}`, body);
  return res.data;
};

export const toggleUserActive = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/toggle-active`);
  return res.data;
};

export const resetUserPassword = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/reset-password`);
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
};
