import { useState, useCallback, useRef, useEffect } from 'react';
import { taskService, uploadService, cwAttackService } from '../services/api';

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

  const pollCWTaskStatus = useCallback(async (taskId) => {
    try {
      const response = await cwAttackService.getTaskStatus(taskId);
      const data = response.data || {};
      const { status, result: taskResult } = data;

      if (status === 'SUCCESS') {
        // Transform C&W response to match expected format
        const transformedResult = {
          original_image: taskResult.original_image,
          adversarial_image: taskResult.adversarial_image,
          noise_image: taskResult.heatmap, // 噪声图（热力图格式）
          original_class: taskResult.original_prediction?.class_name || 'Unknown',
          adversarial_class: taskResult.adversarial_prediction?.class_name || 'Unknown',
          original_prediction: {
            ...taskResult.original_prediction,
            confidence: taskResult.original_prediction?.confidence || 
                       (taskResult.original_prediction?.top5?.[0]?.confidence) || 0,
            class_id: taskResult.original_prediction?.class_id || 0
          },
          adversarial_prediction: {
            ...taskResult.adversarial_prediction,
            confidence: taskResult.adversarial_prediction?.confidence || 
                       (taskResult.adversarial_prediction?.top5?.[0]?.confidence) || 0,
            class_id: taskResult.adversarial_prediction?.class_id || 0
          },
          confidence_chart: {
            labels: taskResult.original_prediction?.top5?.map(item => 
              item.class_name || `Class ${item.class_id}`
            ) || [],
            original: taskResult.original_prediction?.top5?.map(item => item.confidence) || [],
            adversarial: taskResult.adversarial_prediction?.top5?.map(item => item.confidence) || []
          },
          metadata: {
            l2_norm: taskResult.metadata?.l2_norm || 0,
            iterations: taskResult.metadata?.iterations || 0,
            time_elapsed: taskResult.time_elapsed,
            model_name: taskResult.metadata?.model_name || 'resnet100_imagenet',
            success: taskResult.success,
            // 添加额外的元数据
            final_c_value: taskResult.metadata?.final_c_value,
            targeted: taskResult.metadata?.targeted,
            noise_max_amplitude: taskResult.metadata?.noise_max_amplitude,
            original_label: taskResult.metadata?.original_label,
            adversarial_label: taskResult.metadata?.adversarial_label,
            original_confidence: taskResult.metadata?.original_confidence,
            adversarial_confidence: taskResult.metadata?.adversarial_confidence
          }
        };
        
        setResult(transformedResult);
        setLoading(false);
        setProgress(100);
        clearPoll();
        return true;
      } else if (status === 'FAILURE') {
        const errorMessage = data.error || data.exc_message?.[0] || '任务执行失败';
        setError(errorMessage);
        setLoading(false);
        setProgress(0);
        clearPoll();
        return true;
      } else if (status === 'PROGRESS') {
        // 处理进度更新
        const progress = data.meta?.progress || data.progress;
        if (progress) {
          setProgress(Math.min(progress, 95));
        } else {
          setProgress((prev) => {
            if (prev >= 90) return 95;
            return prev + Math.random() * 2; // 更平滑的进度
          });
        }
        return false;
      } else {
        // Still pending or processing
        setProgress((prev) => {
          if (prev >= 90) return 95;
          return prev + Math.random() * 2;
        });
        return false;
      }
    } catch (err) {
      console.error('轮询任务状态失败:', err);
      setError(err.message || '轮询任务状态失败');
      setLoading(false);
      clearPoll();
      return true;
    }
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

      // Handle C&W Attack with Celery
      if (algorithmId === 'cw') {
        // Handle image upload or use existing URL
        if (imageFiles instanceof Blob) {
          const uploadRes = await uploadService.uploadImage(imageFiles);
          if (uploadRes.data && uploadRes.data.url) {
            // Convert uploaded file to base64
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}${uploadRes.data.url}`);
            const blob = await response.blob();
            finalParams.image = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } else if (finalParams.image && typeof finalParams.image === 'string') {
          // If image is a URL (from uploaded files), convert to base64
          if (finalParams.image.startsWith('/uploads/') || finalParams.image.startsWith('http')) {
            const imageUrl = finalParams.image.startsWith('http') ? finalParams.image : `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}${finalParams.image}`;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            finalParams.image = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          // If it's already base64, keep as is
        }

        setProgress(30);
        // 使用Celery异步任务
        const taskResponse = await cwAttackService.runAsyncAttack(finalParams);
        const taskId = taskResponse.data?.task_id;
        
        if (!taskId) {
          throw new Error('未获取到任务ID');
        }

        setProgress(40);
        // Start polling for async task
        pollIntervalRef.current = setInterval(() => {
          pollCWTaskStatus(taskId);
        }, 2000);
        return;
      }

      // Handle other attacks with task system
      if (imageFiles) {
        if (Array.isArray(imageFiles) && imageFiles.length > 0 && imageFiles[0] instanceof Blob) {
          const uploadRes = await uploadService.uploadImages(imageFiles);
          if (uploadRes.data && uploadRes.data.urls) {
            finalParams.images = uploadRes.data.urls;
          }
        } else if (imageFiles instanceof Blob) {
          if (!finalParams.image || typeof finalParams.image !== 'string' || !finalParams.image.startsWith('/uploads/')) {
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
      }

    } catch (err) {
      console.error('Attack execution error:', err);
      const errorMessage = err.response?.data?.detail || err.message || '启动实验失败';
      setError(errorMessage);
      setLoading(false);
      setProgress(0);
      clearPoll();
    }
  }, [pollTaskStatus, pollCWTaskStatus, clearPoll]);

  return {
    executeAttack,
    result,
    setResult,
    loading,
    setLoading,  // 添加setLoading到返回对象
    error,
    setError,
    progress,
  };
};
