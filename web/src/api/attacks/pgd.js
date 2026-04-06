/**
 * 星河智安 (XingHe ZhiAn) - PGD攻击API
 * PGD攻击算法相关API接口
 */

import { api } from '../client';

/**
 * 同步运行PGD攻击
 * @param {Object} attackRequest - 攻击请求参数
 * @param {string} attackRequest.image - Base64编码的图片
 * @param {string} attackRequest.model_name - 模型名称
 * @param {Object} attackRequest.params - 攻击参数
 * @returns {Promise} 攻击结果
 */
export const runPGDAttack = async (attackRequest) => {
  const response = await api.post('/attacks/pgd/run', attackRequest, {
    timeout: 120000 // PGD攻击单独设置2分钟超时
  });
  return response.data;
};

/**
 * 异步运行PGD攻击
 * @param {Object} attackRequest - 攻击请求参数
 * @returns {Promise} 任务信息
 */
export const runPGDAttackAsync = async (attackRequest) => {
  const response = await api.post('/attacks/pgd/async', attackRequest, {
    timeout: 30000 // 异步请求保持30秒超时（只是提交任务）
  });
  return response.data;
};

/**
 * 获取异步任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise} 任务状态
 */
export const getTaskStatus = async (taskId) => {
  const response = await api.get(`/attacks/pgd/task/${taskId}`, {
    timeout: 10000 // 任务状态查询设置10秒超时
  });
  return response.data;
};

/**
 * 取消异步任务
 * @param {string} taskId - 任务ID
 * @returns {Promise} 取消结果
 */
export const cancelTask = async (taskId) => {
  const response = await api.delete(`/attacks/pgd/task/${taskId}`);
  return response.data;
};

/**
 * 获取PGD参数配置schema
 * @returns {Promise} 参数配置
 */
export const getAlgorithmParams = async () => {
  const response = await api.get('/attacks/pgd/params/schema');
  return response.data;
};

/**
 * 获取攻击历史
 * @param {Object} params - 分页参数
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页数量
 * @returns {Promise} 历史记录
 */
export const getAttackHistory = async (params = {}) => {
  const { page = 1, size = 10 } = params;
  const response = await api.get(`/attacks/pgd/history?page=${page}&size=${size}`);
  return response.data;
};

/**
 * 获取攻击统计信息
 * @returns {Promise} 统计信息
 */
export const getAttackStats = async () => {
  const response = await api.get('/attacks/pgd/stats');
  return response.data;
};