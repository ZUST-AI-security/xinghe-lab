import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const algorithmService = {
  getAlgorithms: () => api.get('/api/v1/algorithms'),
};

export const datasetService = {
  getCifar10Samples: (count = 20) => api.get(`/api/v1/datasets/cifar10/samples?count=${count}`),
};

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/v1/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImages: (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return api.post('/api/v1/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const taskService = {
  submitTask: (algorithmId, params) => api.post('/api/v1/task/submit', {
    algorithm_id: algorithmId,
    params: params,
  }),
  getTaskStatus: (taskId) => api.get(`/api/v1/task/status/${taskId}`),
  listTasks: () => api.get('/api/v1/tasks'),
};

export default api;
