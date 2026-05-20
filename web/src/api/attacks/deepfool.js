import { api } from '../client';

export const runDeepFoolAttack = async (attackRequest) => {
  const response = await api.post('/attacks/deepfool/run', attackRequest);
  return response.data;
};

export const submitDeepFoolAttack = async (attackRequest) => {
  const response = await api.post('/attacks/deepfool/submit', attackRequest);
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

export const getDeepFoolParamsSchema = async () => {
  const response = await api.get('/attacks/deepfool/params/schema');
  return response.data;
};

export const searchImageNetClasses = async (query, limit = 20) => {
  const response = await api.get('/attacks/deepfool/classes/search', {
    params: { q: query, limit },
  });
  return response.data;
};
