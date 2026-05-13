/**
 * 鲁棒性评估 API
 * 关联需求：Requirement 7
 */

import { api } from './client';

/**
 * 提交鲁棒性评估任务
 * @param {Object} params
 * @param {string} params.image - Base64 编码的图片
 * @param {string[]} params.algorithms - 攻击算法列表，如 ['fgsm', 'pgd']
 * @param {string} [params.model_name] - 模型名称，默认 'resnet100_imagenet'
 * @returns {Promise<{ task_id: string, status: string }>}
 */
export const submitRobustnessEvaluation = async ({ image, algorithms, model_name = 'resnet100_imagenet' }) => {
  const response = await api.post('/robustness/evaluate', {
    image,
    algorithms,
    model_name,
  });
  return response.data;
};

/**
 * 轮询鲁棒性评估任务结果
 * @param {string} taskId - 任务 ID
 * @returns {Promise<{
 *   status: 'pending' | 'running' | 'completed' | 'failed',
 *   matrix: Object | null,
 *   algorithms: string[] | null,
 *   defenses: string[] | null,
 *   time_elapsed: number | null,
 *   error: string | null
 * }>}
 */
export const getRobustnessResult = async (taskId) => {
  const response = await api.get(`/robustness/result/${taskId}`);
  return response.data;
};
