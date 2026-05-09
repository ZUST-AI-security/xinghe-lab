import { api } from '../client';
import { pauseTask as pauseTaskApi, resumeTask as resumeTaskApi } from '../tasks';

export const runFGSMAttack = async (attackRequest) => {
  const response = await api.post('/attacks/fgsm/run', attackRequest);
  return response.data;
};

export const submitFGSMAttack = async (attackRequest) => {
  const response = await api.post('/attacks/fgsm/submit', attackRequest);
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

export const pauseAttackTask = pauseTaskApi;
export const resumeAttackTask = resumeTaskApi;

export const getAlgorithmParams = async () => {
  const response = await api.get('/attacks/fgsm/params/schema');
  return response.data;
};

export const searchImageNetClasses = async (query, limit = 20) => {
  const response = await api.get('/attacks/fgsm/classes/search', {
    params: { q: query, limit },
  });
  return response.data;
};

export const getAttackHistory = async ({ page = 1, size = 10 } = {}) => {
  const response = await api.get('/attacks/fgsm/history', {
    params: { page, size },
  });
  return response.data;
};

export const getAttackStats = async () => {
  const response = await api.get('/attacks/fgsm/stats');
  return response.data;
};

export const runFGSMAttackAsync = submitFGSMAttack;
export const getTaskStatus = getAttackTaskStatus;
export const cancelTask = cancelAttackTask;
