/**
 * 星河智安 (XingHe ZhiAn) - I-FGSM攻击逻辑自定义Hook
 * 封装I-FGSM攻击的状态管理和API调用
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import {
  runIFGSMAttack, // 同步攻击接口
  runIFGSMAttackAsync, // 异步攻击接口
  getTaskStatus,
  cancelTask as cancelTaskApi,
} from '../api/attacks/ifgsm';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const useIFGSMAttack = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const pollActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      pollActiveRef.current = false;
    };
  }, []);

  const normalizeResult = useCallback((payload, params) => {
    const mainSample = payload.per_sample_results?.[0] || payload;

    // 提取原始分类信息，确保标签显示正确
    const originalClass = mainSample.original_class_name || payload.metadata?.original_class_name;
    const originalConfidence = mainSample.original_confidence || 
                              payload.original_probs?.[0]?.max() || 
                              payload.original_confidence || 0;
    
    // 提取对抗分类信息
    const adversarialClass = mainSample.adversarial_class_name || payload.metadata?.adversarial_class_name;
    const adversarialConfidence = mainSample.adversarial_confidence || 
                                payload.adversarial_probs?.[0]?.max() || 
                                payload.adversarial_confidence || 0;

return {
      // 图像处理 - 优先使用 per_sample_results 中的 base64
      original_image: params.image || payload.original_image || "",
      adversarial_image: mainSample.adv_image_base64 
        ? `data:image/png;base64,${mainSample.adv_image_base64}` 
        : payload.adversarial_image,
      heatmap: mainSample.heatmap_base64 
        ? `data:image/png;base64,${mainSample.heatmap_base64}` 
        : payload.heatmap,
      
      // 分类信息映射 - 优先使用 per_sample_results 中的数据
      original_probs: payload.original_probs?.[0] || payload.original_probs || [],
      adversarial_probs: payload.adversarial_probs?.[0] || payload.adversarial_probs || [],
      
      // 状态与元数据
      success: mainSample.success ?? payload.success,
      time_elapsed: payload.execution_time || payload.time_elapsed || 0,
      
      // 完整的 per_sample_results 供前端使用
      per_sample_results: payload.per_sample_results || [],
      
      // 增强的元数据，确保分类标签信息完整
      metadata: {
        ...payload.metadata,
        // 从 per_sample_results 提取的分类标签
        original_label: mainSample.original_label ?? payload.metadata?.original_label,
        original_class_name: originalClass,
        original_confidence: originalConfidence,
        adversarial_label: mainSample.adversarial_label ?? payload.metadata?.adversarial_label,
        adversarial_class_name: adversarialClass,
        adversarial_confidence: adversarialConfidence,
        perturbation_norm: mainSample.perturbation_norm ?? payload.metadata?.perturbation_norm,
      },
      timestamp: new Date().toISOString(),
      params,
    };
  }, []);
//运行同步攻击
  const runAttack = useCallback(async (params) => {
    pollActiveRef.current = false;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentTask(null);

    try {
      const response = await runIFGSMAttack(params);
      setResult(normalizeResult(response, params));
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || '攻击执行失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [normalizeResult]);

  const pollTaskStatus = useCallback(async (taskId, params) => {
    let attempts = 0;
    let consecutiveErrors = 0;

    while (pollActiveRef.current && attempts < MAX_POLL_ATTEMPTS) {
      try {
        const status = await getTaskStatus(taskId);

        setCurrentTask((prev) => {
          if (!prev || prev.id !== taskId) return prev;
          return {
            ...prev,
            status: status.status,
            progress: status.progress,
            error: status.error,
          };
        });

        if (status.status === 'completed') {
          setResult(normalizeResult(status.result, params));
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.success('异步攻击完成');
          return;
        }

        if (status.status === 'failed') {
          const errorMessage = status.error || '任务执行失败';
          setError(errorMessage);
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.error(errorMessage);
          return;
        }

        consecutiveErrors = 0;
      } catch (err) {
        const errorMessage = err.response?.data?.detail || err.message || '获取任务状态失败';
        attempts += 1;
        consecutiveErrors += 1;

        if (err.response?.status === 500) {
          setError('后端服务运行异常，请检查Celery Worker日志');
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.error('后端服务运行异常，请检查Celery Worker日志', 6);
          return;
        }

        if (err.message?.includes('Redis') ||
            err.message?.includes('reconnect to Celery') ||
            err.message?.includes('Connection refused') ||
            err.response?.data?.detail?.includes('Retry limit')) {
          setError('后端任务队列(Redis)连接异常，请检查Redis服务状态');
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.error('后端任务队列(Redis)连接异常，请检查Redis服务状态', 5);
          return;
        }

        if (consecutiveErrors >= 5 && !window.navigator.onLine) {
          setError('网络连接已断开，请检查网络连接');
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.error('网络连接已断开，请检查网络连接');
          return;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setError(errorMessage);
          setCurrentTask(null);
          setLoading(false);
          pollActiveRef.current = false;
          message.error(errorMessage);
          return;
        }

        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      attempts += 1;
      if (attempts < MAX_POLL_ATTEMPTS && pollActiveRef.current) {
        await sleep(POLL_INTERVAL_MS);
      }
    }

    if (pollActiveRef.current) {
      setError('任务执行超时');
      setCurrentTask(null);
      setLoading(false);
      pollActiveRef.current = false;
      message.error('任务执行超时');
    }
  }, [normalizeResult]);

  const runAttackAsync = useCallback(async (params) => {
    if (loading) {
      message.warning('任务正在执行中，请勿重复点击');
      return;
    }

    pollActiveRef.current = false;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runIFGSMAttackAsync(params);
      const task = {
        id: response.task_id,
        status: response.status || 'pending',
        progress: 0,
        params,
      };
      setCurrentTask(task);

      pollActiveRef.current = true;
      void pollTaskStatus(response.task_id, params);

      return response;
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      let errorMessage = '任务提交失败';

      if (detail.includes('Retry limit exceeded') ||
          detail.includes('reconnect to Celery') ||
          detail.includes('Connection refused') ||
          err.message?.includes('ECONNREFUSED') ||
          err.message?.includes('Network Error')) {
        errorMessage = '后端任务队列(Redis)连接异常，请检查Redis服务是否启动';
        message.error(errorMessage, 6);
      } else {
        errorMessage = detail || err.message || errorMessage;
        message.error(errorMessage);
      }

      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, [loading, pollTaskStatus]);

  const saveResult = useCallback(async (notes = '') => {
    if (!result) {
      throw new Error('没有可保存的结果');
    }

    try {
      const historyItem = {
        ...result,
        notes,
        id: Date.now(),
      };


      setHistory((prev) => [historyItem, ...prev]);
      message.success('结果已保存到历史记录');
    } catch (err) {
      throw new Error('保存失败: ' + err.message);
    }
  }, [result]);

  const clearResult = useCallback(() => {
    pollActiveRef.current = false;
    setResult(null);
    setError(null);
    setCurrentTask(null);
    setLoading(false);
  }, []);

  const cancelTask = useCallback(async () => {
    if (!currentTask) {
      return;
    }

    try {
      pollActiveRef.current = false;
      await cancelTaskApi(currentTask.id);
      setCurrentTask(null);
      setLoading(false);
      message.info('任务已取消');
    } catch (err) {
      pollActiveRef.current = false;
      setCurrentTask(null);
      setLoading(false);
      const errorMessage = err.response?.data?.detail || err.message || '取消任务失败';
      setError(errorMessage);
      message.error(errorMessage);
    }
  }, [currentTask]);

  const getHistory = useCallback(() => history, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    loading,
    setLoading,
    result,
    error,
    history,
    currentTask,
    runAttack,
    runAttackAsync,
    saveResult,
    clearResult,
    cancelTask,
    getHistory,
    clearHistory,
  };
};

export default useIFGSMAttack;
