/**
 * 星河智安 (XingHe ZhiAn) - 验证码API
 */

import { api } from './client';

export const getCaptcha = async () => {
  const response = await api.get('/captcha');
  return response.data;
};
