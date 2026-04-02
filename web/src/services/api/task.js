import api from './index';

export const taskService = {
  submitTask: (algorithmId, params) => api.post('/api/task/submit', {
    algorithm_id: algorithmId,
    params: params,
  }),
  getTaskStatus: (taskId) => api.get(`/api/task/status/${taskId}`),
  listTasks: () => api.get('/api/tasks'),
};
