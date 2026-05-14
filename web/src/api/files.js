/**
 * 文件上传与图片库 API
 * 对应 Requirement 19：上传图片复用机制
 */

import { api } from './client';

/**
 * 上传图片（base64 编码），支持服务端去重
 * @param {string} imageBase64 - data URL 或纯 base64
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 * @returns {{ file_id, filename, url, is_reused }}
 */
export const uploadImage = async (imageBase64, filename = 'image.png', mimeType = 'image/png') => {
  const response = await api.post('/files/upload', {
    image: imageBase64,
    filename,
    mime_type: mimeType,
  });
  return response.data;
};

/**
 * 获取当前用户的历史上传文件列表
 * @param {number} page
 * @param {number} size
 * @returns {{ items, total, page, size, pages }}
 */
export const getMyUploads = async (page = 1, size = 12) => {
  const response = await api.get('/files/my-uploads', { params: { page, size } });
  return response.data;
};

/**
 * 获取指定文件的 base64 data URL（用于填充到上传区域）
 * @param {number} fileId
 * @returns {{ file_id, filename, data_url }}
 */
export const getImageAsBase64 = async (fileId) => {
  const response = await api.get(`/files/image/${fileId}`);
  return response.data;
};

/**
 * 软删除用户自己的文件
 * @param {number} fileId
 */
export const deleteMyFile = async (fileId) => {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
};

// ---- 管理员接口 ----

/**
 * 管理员：获取所有用户的文件列表
 */
export const adminListFiles = async (page = 1, size = 20, userId = 0) => {
  const response = await api.get('/admin/files', { params: { page, size, user_id: userId } });
  return response.data;
};

/**
 * 管理员：获取存储统计
 */
export const adminFileStats = async () => {
  const response = await api.get('/admin/files/stats');
  return response.data;
};

/**
 * 管理员：删除单个文件
 */
export const adminDeleteFile = async (fileId, force = false) => {
  const response = await api.delete(`/admin/files/${fileId}`, { params: { force } });
  return response.data;
};

/**
 * 管理员：批量删除文件
 */
export const adminBatchDeleteFiles = async (fileIds, force = false) => {
  const response = await api.delete('/admin/files/batch', {
    data: fileIds,
    params: { force },
  });
  return response.data;
};
