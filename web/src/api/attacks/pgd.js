import apiClient from '../client';

/**
 * 执行PGD攻击（同步模式）
 * @param {Object} params - 攻击参数
 * @param {File} params.image - 输入图片
 * @param {number} params.epsilon - 最大扰动
 * @param {number} params.alpha - 步长
 * @param {number} params.num_iter - 迭代次数
 * @param {boolean} params.random_start - 随机初始化
 * @param {boolean} params.targeted - 定向攻击
 * @param {number} params.target_label - 目标标签
 * @param {string} params.norm - 范数类型
 * @param {number} params.confidence_threshold - 置信度阈值
 * @returns {Promise} - API响应
 */
export const runPGDAttack = async (params) => {
  const formData = new FormData();
  formData.append('file', params.image);
  formData.append('epsilon', params.epsilon);
  formData.append('alpha', params.alpha);
  formData.append('num_iter', params.num_iter);
  formData.append('random_start', params.random_start);
  formData.append('targeted', params.targeted);
  formData.append('norm', params.norm);
  formData.append('confidence_threshold', params.confidence_threshold);
  
  if (params.targeted && params.target_label !== undefined) {
    formData.append('target_label', params.target_label);
  }
  
  // 重要：PGD攻击同步执行，设置较长的超时时间
  return apiClient.post('/attacks/pgd/run', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60秒超时
  });
};