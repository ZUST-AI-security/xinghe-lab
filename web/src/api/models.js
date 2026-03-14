/**
 * 星河智安 (XingHe ZhiAn) - 模型API
 * 模型管理相关API
 */

import { api } from './client';

// 获取所有可用模型
export const getAvailableModels = async () => {
  const response = await api.get('/models');
  return response.data;
};

// 获取特定模型信息
export const getModelInfo = async (modelName) => {
  const response = await api.get(`/models/${modelName}`);
  return response.data;
};

// 获取模型统计信息
export const getModelStats = async () => {
  const response = await api.get('/models/stats');
  return response.data;
};

// 按类别获取模型
export const getModelsByCategory = async (category) => {
  const response = await api.get(`/models?category=${category}`);
  return response.data;
};

// 搜索模型
export const searchModels = async (query) => {
  const response = await api.get(`/models/search?q=${encodeURIComponent(query)}`);
  return response.data;
};
