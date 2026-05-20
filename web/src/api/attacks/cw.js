import { api } from '../client';

export const runCWAttack = async (attackRequest) => {
  const response = await api.post('/attacks/cw/run', attackRequest);
  return response.data;
};

export const submitCWAttack = async (attackRequest) => {
  const response = await api.post('/attacks/cw/submit', attackRequest);
  return response.data;
};

export const getAttackTaskStatus = async (taskId) => {
  const response = await api.get(`/attacks/tasks/${taskId}`);
  return response.data;
};

export const cancelAttackTask = async (taskId) => {
  const response = await api.delete(`/attacks/tasks/${taskId}`);
  return response.data;
};

export const getAlgorithmParams = async () => {
  const response = await api.get('/attacks/cw/params/schema');
  return response.data;
};

export const searchImageNetClasses = async (query, limit = 20) => {
  const response = await api.get('/attacks/cw/classes/search', {
    params: { q: query, limit },
  });
  return response.data;
};

export const getPopularImageNetClasses = async (limit = 20) => {
  const response = await api.get('/attacks/cw/classes/popular', {
    params: { limit },
  });
  return response.data;
};

export const getAttackHistory = async ({ page = 1, size = 10 } = {}) => {
  const response = await api.get('/attacks/cw/history', {
    params: { page, size },
  });
  return response.data;
};

export const getAttackStats = async () => {
  const response = await api.get('/attacks/cw/stats');
  return response.data;
};

export const runCWAttackAsync = submitCWAttack;
export const getTaskStatus = getAttackTaskStatus;
export const cancelTask = cancelAttackTask;
