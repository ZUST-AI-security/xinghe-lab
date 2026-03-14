/**
 * 星河智安 (XingHe ZhiAn) - C&W攻击API
 * C&W攻击算法相关API
 */

import { api } from '../client';

// 同步运行C&W攻击
export const runCWAttack = async (attackRequest) => {
  const response = await api.post('/attacks/cw/run', attackRequest);
  return response.data;
};

// 异步运行C&W攻击
export const runCWAttackAsync = async (attackRequest) => {
  const response = await api.post('/attacks/cw/async', attackRequest);
  return response.data;
};

// 获取异步任务状态
export const getTaskStatus = async (taskId) => {
  const response = await api.get(`/attacks/cw/task/${taskId}`);
  return response.data;
};

// 取消异步任务
export const cancelTask = async (taskId) => {
  const response = await api.delete(`/attacks/cw/task/${taskId}`);
  return response.data;
};

// 获取C&W参数配置schema
export const getAlgorithmParams = async () => {
  const response = await api.get('/attacks/cw/params/schema');
  return response.data;
};

// 获取攻击历史
export const getAttackHistory = async (params = {}) => {
  const { page = 1, size = 10 } = params;
  const response = await api.get(`/attacks/cw/history?page=${page}&size=${size}`);
  return response.data;
};
