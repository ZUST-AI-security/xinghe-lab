import { api } from './client';

// 管理后台统计
export const getAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

// 攻击历史
export const getAttackHistory = async ({ page = 1, size = 20, algorithm = '', user_id = 0 } = {}) => {
  const response = await api.get('/admin/attack-history', {
    params: { page, size, algorithm, user_id },
  });
  return response.data;
};

// 用户管理
export const getUsers = async ({ page = 1, size = 20, search = '', role = '', is_active = '' } = {}) => {
  const response = await api.get('/users/', {
    params: { page, size, search, role, is_active },
  });
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await api.put(`/users/${userId}`, data);
  return response.data;
};

export const toggleUserActive = async (userId) => {
  const response = await api.put(`/users/${userId}/toggle-active`);
  return response.data;
};

export const resetUserPassword = async (userId) => {
  const response = await api.put(`/users/${userId}/reset-password`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

// 系统配置
export const getSystemConfig = async () => {
  const response = await api.get('/admin/config');
  return response.data;
};

export const updateSystemConfig = async (key, value, description = '') => {
  const response = await api.put(`/admin/config/${key}`, null, {
    params: { value, description },
  });
  return response.data;
};

// 系统日志
export const getSystemLogs = async ({ lines = 100, level = '' } = {}) => {
  const response = await api.get('/admin/logs', {
    params: { lines, level },
  });
  return response.data;
};
