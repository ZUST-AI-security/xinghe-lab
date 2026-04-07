import api from '../../services/api';

/**
 * FGSM Attack API Service
 */
export const fgsmService = {
  /**
   * Run FGSM attack synchronously
   */
  runAttack: (params) => {
    return api.post('/api/v1/fgsm/run', params);
  },

  /**
   * Run FGSM attack asynchronously (via Celery)
   */
  runAttackAsync: (params) => {
    return api.post('/api/v1/fgsm/async', params);
  },

  /**
   * Get async task status
   */
  getTaskStatus: (taskId) => {
    return api.get(`/api/v1/fgsm/task/${taskId}`);
  },

  /**
   * Search ImageNet classes
   */
  searchClasses: (query) => {
    return api.get(`/api/v1/fgsm/classes/search?q=${query}`);
  }
};

export default fgsmService;
