/**
 * 星河智安 (XingHe ZhiAn) - 认证API
 * 用户登录、注册、token管理相关API
 */

import { api } from './client';

// 用户登录
export const login = async (credentials) => {
  // 后端使用OAuth2PasswordRequestForm，需要表单数据
  const formData = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
  
  console.log('🔐 发送登录请求:', credentials);
  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  console.log('✅ 登录响应:', response.data);
  return response.data;
};

// 用户注册
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// 刷新token
export const refreshToken = async (refreshToken) => {
  const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  console.log('🔍 获取当前用户信息...');
  const token = localStorage.getItem('access_token');
  console.log('🎫 当前token:', token ? '存在' : '不存在');
  
  const response = await api.get('/users/me');
  console.log('✅ 用户信息获取成功:', response.data);
  return response.data;
};

// 修改密码
export const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData);
  return response.data;
};

// 更新用户信息
export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

// 登出
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // 即使服务器端登出失败，也要清除本地token
    console.warn('服务器端登出失败:', error);
  } finally {
    // 清除本地存储的token
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};
