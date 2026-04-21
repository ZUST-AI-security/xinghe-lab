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
