/**
 * 星河智安 (XingHe ZhiAn) - C&W攻击API
 * C&W攻击算法相关API
 */

import axios from 'axios';
import { API_ROOT } from '../../config/api';

// 创建专门的异步任务客户端（短超时）
const asyncTaskClient = axios.create({
  baseURL: API_ROOT,
  timeout: 10000, // 10秒超时，任务提交应该很快
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建同步攻击客户端（长超时）
const syncAttackClient = axios.create({
  baseURL: API_ROOT,
  timeout: 120000, // 120秒超时，适应长时间的C&W攻击任务
  headers: {
    'Content-Type': 'application/json',
  },
});

// 同步运行C&W攻击
export const runCWAttack = async (attackRequest) => {
  const response = await syncAttackClient.post('/attacks/cw/run', attackRequest);
  return response.data;
};

// 异步运行C&W攻击
export const runCWAttackAsync = async (attackRequest) => {
  const response = await asyncTaskClient.post('/attacks/cw/async', attackRequest);
  return response.data;
};

// 获取异步任务状态
export const getTaskStatus = async (taskId) => {
  const response = await asyncTaskClient.get(`/attacks/cw/task/${taskId}`);
  return response.data;
};

// 取消异步任务
export const cancelTask = async (taskId) => {
  const response = await asyncTaskClient.delete(`/attacks/cw/task/${taskId}`);
  return response.data;
};

// 获取C&W参数配置schema
export const getAlgorithmParams = async () => {
  const response = await asyncTaskClient.get('/attacks/cw/params/schema');
  return response.data;
};

// 获取攻击历史
export const getAttackHistory = async (params = {}) => {
  const { page = 1, size = 10 } = params;
  const response = await asyncTaskClient.get(`/attacks/cw/history?page=${page}&size=${size}`);
  return response.data;
};
