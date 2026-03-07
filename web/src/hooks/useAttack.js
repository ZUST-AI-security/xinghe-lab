import { useState, useCallback, useRef, useEffect } from 'react';
import { taskService, uploadService } from '../services/api';

export const useAttack = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const pollIntervalRef = useRef(null);

  const clearPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPoll();
  }, [clearPoll]);

  const pollTaskStatus = useCallback(async (taskId) => {
    try {
      const response = await taskService.getTaskStatus(taskId);
      const data = response.data || {};
      const { status, result: taskResult } = data;

      if (status === 'SUCCESS') {
        setResult(taskResult);
        setLoading(false);
        setProgress(100);
        clearPoll();
        return true;
      } else if (status === 'FAILURE') {
        setError(data.error || '任务执行失败');
        setLoading(false);
        setProgress(0);
        clearPoll();
        return true;
      } else {
        // Still pending or processing
        setProgress((prev) => {
            if (prev >= 90) return 95;
            return prev + 5;
        });
        return false;
      }
    } catch (err) {
      setError(err.message || '轮询状态失败');
      setLoading(false);
      clearPoll();
      return true;
    }
  }, [clearPoll]);

  const executeAttack = useCallback(async (algorithmId, params, imageFiles = null) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(5);
    clearPoll();

    try {
      let finalParams = { ...params };

      // Handle multiple or single image uploads
      if (imageFiles) {
        if (Array.isArray(imageFiles) && imageFiles.length > 0) {
          const uploadRes = await uploadService.uploadImages(imageFiles);
          if (uploadRes.data && uploadRes.data.urls) {
            finalParams.images = uploadRes.data.urls;
          }
        } else if (imageFiles instanceof File) {
          const uploadRes = await uploadService.uploadImage(imageFiles);
          if (uploadRes.data && uploadRes.data.url) {
            finalParams.image = uploadRes.data.url;
          }
        }
      }

      const submitRes = await taskService.submitTask(algorithmId, finalParams);
      const taskId = submitRes.data?.task_id;
      
      if (!taskId) {
          throw new Error('未获取到任务ID');
      }

      setProgress(20);

      // Start polling
      pollIntervalRef.current = setInterval(() => {
        pollTaskStatus(taskId);
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || '启动实验失败');
      setLoading(false);
      setProgress(0);
    }
  }, [pollTaskStatus, clearPoll]);

  return {
    executeAttack,
    result,
    loading,
    error,
    progress,
  };
};
