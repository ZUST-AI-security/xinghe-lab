import api from './index';

// C&W Attack specific service
export const cwAttackService = {
  runAttack: (params) => {
    const payload = {
      image: params.image,
      model_name: params.model_name || 'resnet100_imagenet',
      params: {
        c: params.c || 0.1,  // 使用后端推荐的默认值
        kappa: params.kappa || 0.0,
        lr: params.lr || 0.01,
        max_iter: params.max_iter || 100,
        binary_search_steps: params.binary_search_steps || 9,
        init_const: params.init_const || 1e-2,
        targeted: params.targeted || false,
        abort_early: params.abort_early !== false,
        early_stop_iters: params.early_stop_iters || 50
      }
    };
    return api.post('/api/v1/attacks/cw/run', payload, { timeout: 120000 }); // 增加超时时间
  },
  runAsyncAttack: (params) => {
    const payload = {
      image: params.image,
      model_name: params.model_name || 'resnet100_imagenet',
      params: {
        c: params.c || 0.1,  // 使用后端推荐的默认值
        kappa: params.kappa || 0.0,
        lr: params.lr || 0.01,
        max_iter: params.max_iter || 100,
        binary_search_steps: params.binary_search_steps || 9,
        init_const: params.init_const || 1e-2,
        targeted: params.targeted || false,
        abort_early: params.abort_early !== false,
        early_stop_iters: params.early_stop_iters || 50
      }
    };
    return api.post('/api/v1/attacks/cw/async', payload);
  },
  getTaskStatus: (taskId) => api.get(`/api/v1/attacks/cw/task/${taskId}`),
};

// I-FGSM Attack specific service
export const ifgsmAttackService = {
  runAttack: (params) => {
    const payload = {
      image: params.image,
      model_name: params.model_name || 'resnet100_imagenet',
      params: {
        epsilon: params.epsilon || 0.03,  // 使用后端推荐的默认值
        steps: params.steps || 10,
        alpha: params.alpha || 0.01,
        targeted: params.targeted || false,
      }
    };
    return api.post('/api/v1/attacks/ifgsm/run', payload, { timeout: 120000 }); // 增加超时时间
  },
  runAsyncAttack: (params) => {
    const payload = {
      image: params.image,
      model_name: params.model_name || 'resnet100_imagenet',
      params: {
        epsilon: params.epsilon || 0.03,  // 使用后端推荐的默认值
        steps: params.steps || 10,
        alpha: params.alpha || 0.01,
        targeted: params.targeted || false,
      }
    };
    return api.post('/api/v1/attacks/ifgsm/async', payload);
  },
  getTaskStatus: (taskId) => api.get(`/api/v1/attacks/ifgsm/task/${taskId}`),
};
