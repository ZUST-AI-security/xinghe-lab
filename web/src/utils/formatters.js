/**
 * 星河智安 (XingHe ZhiAn) - 格式化工具函数
 * 包含各种数据格式化和转换的工具函数
 */

/**
 * 文件转Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Base64字符串
 */
export const getBase64FromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Base64转Blob
 * @param {string} base64 - Base64字符串
 * @param {string} mimeType - MIME类型
 * @returns {Blob} Blob对象
 */
export const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
  // 移除data URL前缀
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // 转换为二进制
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
export const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds.toFixed(1)}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${remainingMinutes}分`;
  }
};

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} total - 总数
 * @param {number} decimals - 小数位数
 * @returns {string} 百分比字符串
 */
export const formatPercentage = (value, total, decimals = 2) => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(decimals)}%`;
};

/**
 * 格式化数字
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的数字
 */
export const formatNumber = (num, decimals = 2) => {
  if (typeof num !== 'number') return '0';
  return num.toFixed(decimals);
};

/**
 * 格式化置信度
 * @param {number} confidence - 置信度值
 * @returns {string} 格式化后的置信度
 */
export const formatConfidence = (confidence) => {
  if (typeof confidence !== 'number') return '0%';
  return `${(confidence * 100).toFixed(2)}%`;
};

/**
 * 格式化模型参数数量
 * @param {number} params - 参数数量
 * @returns {string} 格式化后的参数数量
 */
export const formatModelParams = (params) => {
  if (typeof params !== 'number') return '0';
  
  if (params >= 1e9) {
    return `${(params / 1e9).toFixed(1)}B`;
  } else if (params >= 1e6) {
    return `${(params / 1e6).toFixed(1)}M`;
  } else if (params >= 1e3) {
    return `${(params / 1e3).toFixed(1)}K`;
  } else {
    return params.toString();
  }
};

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或时间戳
 * @returns {string} 格式化后的日期时间
 */
export const formatDateTime = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '无效日期';
  
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 格式化相对时间
 * @param {Date|string} date - 日期对象或时间戳
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '无效日期';
  
  const now = new Date();
  const diff = now - d;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDateTime(date);
  }
};

/**
 * 截断文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名
 */
export const getFileExtension = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
};

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
  return obj;
};

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
};
