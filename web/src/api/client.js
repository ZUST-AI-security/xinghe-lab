/**
 * 星河智安 (XingHe ZhiAn) - API客户端
 * Axios实例配置和请求/响应拦截器
 */

import axios from 'axios';
import { message } from 'antd';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';
const ENABLE_DEBUG = import.meta.env.VITE_ENABLE_DEBUG === 'true';

// 创建Axios实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加验证码 (如果存在)
    const captchaId = sessionStorage.getItem('captcha_id');
    const captchaCode = sessionStorage.getItem('captcha_code');
    if (captchaId && captchaCode) {
      config.headers['X-Captcha-ID'] = captchaId;
      config.headers['X-Captcha-Code'] = captchaCode;
    }

    // 添加请求时间戳
    config.metadata = { startTime: new Date() };

    // 开发环境下打印请求信息
    if (ENABLE_DEBUG) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// 请求是否需要登录态：受保护接口失败才会触发跳转
// /api/v1/auth/* 走自身错误流，不重试
const isAuthEndpoint = (url = '') => /\/auth\/(login|refresh|register)/.test(url);

// 当前是否在公开路由（首页、关于、登录、注册）
const isOnPublicRoute = () => {
  const path = window.location.pathname;
  return path === '/' || path === '/about' || path === '/login' || path === '/register';
};

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 计算请求耗时
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;

    // 清除可能存在的验证码
    sessionStorage.removeItem('captcha_id');
    sessionStorage.removeItem('captcha_code');

    // 开发环境下打印响应信息
    if (ENABLE_DEBUG) {
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        duration: `${duration}ms`,
        data: response.data,
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 开发环境下打印错误信息
    if (ENABLE_DEBUG) {
      console.error('❌ API Error:', {
        url: originalRequest?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // 处理401未授权错误
    if (
      error.response?.status === 401
      && !originalRequest._retry
      && !isAuthEndpoint(originalRequest?.url)
    ) {
      originalRequest._retry = true;

      try {
        // 尝试使用refresh token刷新access token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/api/${API_VERSION}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token, refresh_token: newRefresh } = response.data;
          localStorage.setItem('access_token', access_token);
          if (newRefresh) {
            localStorage.setItem('refresh_token', newRefresh);
          }

          // 重新发送原始请求
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失败：清除 token；
        // 仅在受保护页面才硬跳转，公开页静默失败让 UI 自行处理（避免首页被踢）
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (!isOnPublicRoute()) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // 处理其他HTTP错误
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          message.error(data.detail || '请求参数错误');
          break;
        case 401:
          // 仅在非公开页提示，避免首页/关于页等出现"认证失败"打扰
          if (!isOnPublicRoute() && !isAuthEndpoint(originalRequest?.url)) {
            message.error('认证失败，请重新登录');
          }
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 429:
          if (data.require_captcha) {
            window.dispatchEvent(new CustomEvent('showCaptcha', { detail: { originalRequest }}));
          } else if (!data.active_tasks) {
            // 仅在非并发限制的 429（如频率限制）时显示通用提示
            // 并发限制（含 active_tasks 字段）由各攻击页面自行处理
            message.error(data.detail || '请求过于频繁，请稍后再试');
          }
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(data.detail || `请求失败 (${status})`);
      }
    } else if (error.request) {
      // 网络错误
      message.error('网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      message.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

// 设置Axios拦截器（用于外部调用）
export const setupAxiosInterceptors = () => {
  // 这个函数在App.jsx中调用，确保拦截器被设置
};

// 便捷的HTTP方法
export const api = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};

// 文件上传专用方法
export const uploadFile = (url, file, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

// 下载文件专用方法
export const downloadFile = async (url, filename = null) => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    // 创建下载链接
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error('文件下载失败:', error);
    throw error;
  }
};

export default apiClient;
