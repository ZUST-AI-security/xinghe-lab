import { useState, useCallback } from 'react';
import { message } from 'antd';
import { runPGDAttack } from '../../../../api/attacks/pgd';

export const usePGDAttack = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const executeAttack = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setProgress(10); // 开始上传
    
    try {
      // 模拟进度（实际无法获取真实进度，只能模拟）
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const response = await runPGDAttack(params);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.data.success) {
        setResult(response.data);
        message.success(`攻击成功！成功率: ${(response.data.success_rate * 100).toFixed(1)}%`);
      } else {
        setError(response.data.message);
        message.error(response.data.message);
      }
    } catch (err) {
      console.error('PGD攻击失败:', err);
      const errorMsg = err.response?.data?.detail || err.message || '攻击执行失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
      // 延迟重置进度
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    loading,
    result,
    error,
    progress,
    executeAttack,
    resetResult
  };
};