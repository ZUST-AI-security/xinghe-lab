import { api } from '../client';

export const runPGDAttack = async (attackRequest) => {
  const response = await api.post('/attacks/pgd/run', attackRequest);
  return response.data;
};

export const submitPGDAttack = async (attackRequest) => {
  const response = await api.post('/attacks/pgd/submit', attackRequest);
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
  const response = await api.get('/attacks/pgd/params/schema');
  return response.data;
};

export const searchImageNetClasses = async (query, limit = 20) => {
  const response = await api.get('/attacks/pgd/classes/search', {
    params: { q: query, limit },
  });
  return response.data;
};

export const getAttackHistory = async ({ page = 1, size = 10 } = {}) => {
  const response = await api.get('/attacks/pgd/history', {
    params: { page, size },
  });
  return response.data;
};

export const getAttackStats = async () => {
  const response = await api.get('/attacks/pgd/stats');
  return response.data;
};

export const runPGDAttackAsync = submitPGDAttack;
export const getTaskStatus = getAttackTaskStatus;
export const cancelTask = cancelAttackTask;
