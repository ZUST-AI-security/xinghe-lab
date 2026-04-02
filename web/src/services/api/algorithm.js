import api from './index';

export const algorithmService = {
  getAlgorithms: () => api.get('/api/v1/algorithms'),
  getModels: () => api.get('/api/v1/models'),
  predict: (imageBase64, modelName = 'resnet100_imagenet') => {
    const formData = new FormData();
    formData.append('image', imageBase64);
    formData.append('model_name', modelName);
    return api.post('/api/v1/models/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const datasetService = {
  getCifar10Samples: (count = 20) => api.get(`/api/datasets/cifar10/samples?count=${count}`),
};
