import { api } from '../client';

export const runIFGSMAttack = async (attackRequest) => {
  const response = await api.post('/attacks/ifgsm/run', attackRequest);
  return response.data;
};

export const submitIFGSMAttack = async (attackRequest) => {
  const response = await api.post('/attacks/ifgsm/submit', attackRequest);
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

export const getIFGSMParamsSchema = async () => {
  const response = await api.get('/attacks/ifgsm/params/schema');
  return response.data;
};

export const searchImageNetClasses = async (query, limit = 20) => {
  const response = await api.get('/attacks/ifgsm/classes/search', {
    params: { q: query, limit },
  });
  return response.data;
};
