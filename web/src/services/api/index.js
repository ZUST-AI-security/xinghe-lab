import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // 永不超时，支持长时间运行的攻击任务
});

export default api;
