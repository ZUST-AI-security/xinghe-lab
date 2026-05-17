/**
 * 星河智安 (XingHe ZhiAn) - 认证API
 * 用户登录、注册、token管理相关API
 */

import { api } from './client';

// 用户登录（验证码必填）
export const login = async (credentials) => {
  const loginData = {
    username: credentials.username,
    password: credentials.password,
    captcha_id: credentials.captcha_id,
    captcha_code: credentials.captcha_code,
  };

  const response = await api.post('/auth/login', loginData);
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
  const response = await api.get('/users/me');
  return response.data;
};

// 修改密码
export const changePassword = async (passwordData) => {
  const response = await api.post('/users/me/change-password', passwordData);
  return response.data;
};

// 更新用户信息
export const updateProfile = async (profileData) => {
  const response = await api.put('/users/me', profileData);
  return response.data;
};

// 登出（发送 refresh_token 供服务端黑名单）
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/auth/logout', { refresh_token: refreshToken });
  } catch (error) {
    console.warn('服务器端登出失败:', error);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};
