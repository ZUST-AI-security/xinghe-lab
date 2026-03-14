/**
 * 星河智安 (XingHe ZhiAn) - C&W攻击逻辑自定义Hook
 * 封装C&W攻击的状态管理和API调用
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { runCWAttack, runCWAttackAsync, getTaskStatus } from '../api/attacks/cw';

const useCWAttack = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);

  // 运行同步攻击
  const runAttack = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 对于C&W这种耗时算法，优先使用同步模式进行演示
      const response = await runCWAttack(params);
      
      setResult({
        original_image: response.original_image,
        adversarial_image: response.adversarial_image,
        heatmap: response.heatmap,
        original_probs: response.original_probs,
        adversarial_probs: response.adversarial_probs,
        success: response.success,
        time_elapsed: response.time_elapsed,
        metadata: response.metadata,
        timestamp: new Date().toISOString(),
        params: params
      });

      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || '攻击执行失败';
      setError(errorMessage);
      console.error('C&W攻击执行失败:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 运行异步攻击
  const runAttackAsync = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runCWAttackAsync(params);
      setCurrentTask({
        id: response.task_id,
        status: 'pending',
        params: params
      });

      // 开始轮询任务状态
      await pollTaskStatus(response.task_id);

      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || '任务提交失败';
      setError(errorMessage);
      console.error('C&W异步攻击提交失败:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (taskId) => {
    const maxAttempts = 60; // 最多轮询60次（约5分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await getTaskStatus(taskId);
        
        setCurrentTask(prev => ({
          ...prev,
          status: status.status,
          progress: status.progress,
          error: status.error
        }));

        if (status.status === 'completed') {
          setResult({
            original_image: status.result.original_image,
            adversarial_image: status.result.adversarial_image,
            heatmap: status.result.heatmap,
            original_probs: status.result.original_probs,
            adversarial_probs: status.result.adversarial_probs,
            success: status.result.success,
            time_elapsed: status.result.time_elapsed,
            metadata: status.result.metadata,
            timestamp: new Date().toISOString(),
            params: currentTask?.params
          });
          
          setCurrentTask(null);
          message.success('异步攻击完成');
          return;
        }

        if (status.status === 'failed') {
          const errorMessage = status.error || '任务执行失败';
          setError(errorMessage);
          setCurrentTask(null);
          message.error(errorMessage);
          return;
        }

        // 继续轮询
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // 3秒轮询一次
        } else {
          setError('任务执行超时');
          setCurrentTask(null);
          message.error('任务执行超时');
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('获取任务状态失败');
          setCurrentTask(null);
        }
      }
    };

    setTimeout(poll, 1000); // 1秒后开始轮询
  }, [currentTask]);

  // 保存结果到历史
  const saveResult = useCallback(async (notes = '') => {
    if (!result) {
      throw new Error('没有可保存的结果');
    }

    try {
      // 这里可以调用保存历史记录的API
      // await saveAttackHistory({ ...result, notes });
      
      // 更新本地历史
      const historyItem = {
        ...result,
        notes,
        id: Date.now() // 临时ID，实际应该从服务器获取
      };
      
      setHistory(prev => [historyItem, ...prev]);
      message.success('结果已保存到历史记录');
    } catch (err) {
      throw new Error('保存失败: ' + err.message);
    }
  }, [result]);

  // 清空结果
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setCurrentTask(null);
  }, []);

  // 取消异步任务
  const cancelTask = useCallback(async () => {
    if (!currentTask) {
      return;
    }

    try {
      // 这里可以调用取消任务的API
      // await cancelTaskAPI(currentTask.id);
      
      setCurrentTask(null);
      setLoading(false);
      message.info('任务已取消');
    } catch (err) {
      console.error('取消任务失败:', err);
      message.error('取消任务失败');
    }
  }, [currentTask]);

  // 获取历史记录
  const getHistory = useCallback(() => {
    return history;
  }, [history]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    // 状态
    loading,
    result,
    error,
    history,
    currentTask,
    
    // 方法
    runAttack,
    runAttackAsync,
    saveResult,
    clearResult,
    cancelTask,
    getHistory,
    clearHistory,
  };
};

export default useCWAttack;
