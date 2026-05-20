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

export const pauseTask = async (taskId) => {
  const response = await api.post(`/attacks/tasks/${taskId}/pause`);
  return response.data;
};

export const resumeTask = async (taskId) => {
  const response = await api.post(`/attacks/tasks/${taskId}/resume`);
  return response.data;
};

export const cancelTask = async (taskId) => {
  const response = await api.delete(`/attacks/tasks/${taskId}`);
  return response.data;
};
