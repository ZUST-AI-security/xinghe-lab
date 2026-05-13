/**
 * 模型鲁棒性排行榜 API
 * 关联需求：Requirement 10
 */

import { api } from './client';

/**
 * 获取模型鲁棒性排行榜
 * @param {Object} [params]
 * @param {string} [params.algorithm] - 按攻击算法过滤，如 'fgsm'、'pgd'、'cw'。不传则返回所有算法的聚合数据。
 * @returns {Promise<{
 *   algorithm: string | null,
 *   entries: Array<{
 *     model_name: string,
 *     total_attacks: number,
 *     success_count: number,
 *     avg_success_rate: number,
 *     avg_l2_norm: number | null,
 *     avg_linf_norm: number | null
 *   }>,
 *   total: number
 * }>}
 */
export const getLeaderboard = async ({ algorithm } = {}) => {
  const params = {};
  if (algorithm) {
    params.algorithm = algorithm;
  }
  const response = await api.get('/leaderboard', { params });
  return response.data;
};
