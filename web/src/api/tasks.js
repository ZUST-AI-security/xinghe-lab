import { api } from './client';

export const getMyTaskHistory = async ({ page = 1, size = 10, algorithm = '', status = '' } = {}) => {
  const response = await api.get('/attacks/tasks/history', {
    params: { page, size, algorithm, status },
  });
  return response.data;
};

export const getMyTaskStats = async () => {
  const response = await api.get('/attacks/tasks/stats');
  return response.data;
};

/**
 * 获取各队列的当前状态（待处理任务数和预估等待时间）
 * 公开端点，无需登录
 */
export const getQueueStatus = async () => {
  const response = await api.get('/tasks/queue-status');
  return response.data;
};
