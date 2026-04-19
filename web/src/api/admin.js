import { api } from './client';

export const getAdminDashboard = async () => {
  const res = await api.get('/admin/dashboard');
  return res.data;
};

export const getAttackHistory = async ({ page = 1, size = 20, algorithm = '', user_id = 0 } = {}) => {
  const res = await api.get('/admin/attack-history', { params: { page, size, algorithm, user_id } });
  return res.data;
};

export const getSystemConfig = async () => {
  const res = await api.get('/admin/config');
  return res.data;
};

export const updateSystemConfig = async (key, value, description = '') => {
  const res = await api.put(`/admin/config/${key}`, null, { params: { value, description } });
  return res.data;
};

export const getSystemLogs = async ({ lines = 100, level = '' } = {}) => {
  const res = await api.get('/admin/logs', { params: { lines, level } });
  return res.data;
};

export const getUsers = async ({ page = 1, size = 20, search = '', role = '' } = {}) => {
  const res = await api.get('/admin/users', { params: { page, size, search, role } });
  return res.data;
};

export const updateUser = async (userId, { email = '', full_name = '', role = '' } = {}) => {
  const res = await api.put(`/admin/users/${userId}`, null, { params: { email, full_name, role } });
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
