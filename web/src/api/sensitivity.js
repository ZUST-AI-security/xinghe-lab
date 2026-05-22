/**
 * 攻击参数敏感性分析 API
 * 关联需求：Requirement 9
 */

import { api } from './client';

/**
 * 提交参数敏感性扫描任务
 * @param {Object} params
 * @param {string} params.algorithm - 攻击算法名称，如 'fgsm', 'cw'
 * @param {string} params.image - Base64 编码的图片
 * @param {string} [params.model_name] - 模型名称，默认 'resnet100_imagenet'
 * @param {string} params.scan_param - 扫描参数名称，如 'epsilon', 'c', 'overshoot'
 * @param {number} params.param_min - 扫描范围最小值
 * @param {number} params.param_max - 扫描范围最大值
 * @param {number} params.steps - 扫描步数（1–20）
 * @param {Object} [params.base_params] - 基础算法参数
 * @returns {Promise<{ scan_id: string, task_ids: string[], param_values: number[], steps: number }>}
 */
export const submitSensitivityScan = async ({
  algorithm,
  image,
  model_name = 'resnet100_imagenet',
  scan_param,
  param_min,
  param_max,
  steps,
  base_params = {},
}) => {
  const response = await api.post('/sensitivity/scan', {
    algorithm,
    image,
    model_name,
    scan_param,
    param_min,
    param_max,
    steps,
    base_params,
  });
  return response.data;
};

/**
 * 轮询敏感性扫描结果
 * @param {string} scanId - 扫描 ID
 * @returns {Promise<{
 *   status: 'running' | 'completed' | 'partial',
 *   data_points: Array<{
 *     param_value: number,
 *     success_rate: number | null,
 *     l2_norm: number | null,
 *     status: 'ok' | 'failed' | 'pending',
 *     error: string | null
 *   }>,
 *   scan_param: string | null,
 *   algorithm: string | null,
 *   steps: number,
 *   completed: number,
 *   failed: number
 * }>}
 */
export const getSensitivityResult = async (scanId) => {
  const response = await api.get(`/sensitivity/result/${scanId}`);
  return response.data;
};

/**
 * 获取当前用户的历史扫描列表（分页，仅含已完成记录）
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.size=10]
 * @returns {Promise<{ items: Array, total: number, page: number, size: number, pages: number }>}
 */
export const getSensitivityHistory = async ({ page = 1, size = 10 } = {}) => {
  const response = await api.get('/sensitivity/history', { params: { page, size } });
  return response.data;
};

/**
 * 获取单条历史扫描的完整详情（含 data_points）
 * @param {string} scanId
 * @returns {Promise<Object>}
 */
export const getSensitivityHistoryScan = async (scanId) => {
  const response = await api.get(`/sensitivity/history/${scanId}`);
  return response.data;
};
