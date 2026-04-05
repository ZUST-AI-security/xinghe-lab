/**
 * 星河智安 (XingHe ZhiAn) - I-FGSM攻击API
 * I-FGSM攻击算法相关API
 */

import axios from 'axios';
import { API_ROOT } from '../../config/api';

const asyncTaskClient = axios.create({
  baseURL: API_ROOT,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const syncAttackClient = axios.create({
  baseURL: API_ROOT,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const runIFGSMAttack = async (attackRequest) => {
  const response = await syncAttackClient.post('/attacks/ifgsm/run', attackRequest);
  return response.data;
};

export const runIFGSMAttackAsync = async (attackRequest) => {
  const response = await asyncTaskClient.post('/attacks/ifgsm/async', attackRequest);
  return response.data;
};

export const getTaskStatus = async (taskId) => {
  const response = await asyncTaskClient.get(`/attacks/ifgsm/task/${taskId}`);
  return response.data;
};

export const cancelTask = async (taskId) => {
  const response = await asyncTaskClient.delete(`/attacks/ifgsm/task/${taskId}`);
  return response.data;
};

export const getAlgorithmParams = async () => {
  const response = await asyncTaskClient.get('/attacks/ifgsm/params/schema');
  return response.data;
};

export const getAttackHistory = async (params = {}) => {
  const { page = 1, size = 10 } = params;
  const response = await asyncTaskClient.get(`/attacks/ifgsm/history?page=${page}&size=${size}`);
  return response.data;
};
