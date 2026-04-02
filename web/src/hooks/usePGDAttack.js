/**
 * 星河智安 (XingHe ZhiAn) - PGD攻击逻辑自定义Hook
 * 封装PGD攻击的状态管理和API调用
 */

import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { 
  runPGDAttack, 
  runPGDAttackAsync, 
  getTaskStatus, 
  cancelTask 
} from '../../../api/attacks/pgd';

const usePGDAttack = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const pollingIntervalRef = useRef(null);

  /**
   * 停止轮询
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * 开始轮询任务状态
   */
  const startPolling = useCallback((taskId, params) => {
    stopPolling();
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await getTaskStatus(taskId);
        
        setCurrentTask(prev => ({
          ...prev,
          status: status.status,
          progress: status.progress,
          error: status.error
        }));

        if (status.status === 'completed') {
          // 任务完成
          const attackResult = status.result;
          setResult({
            original_image: attackResult.original_image,
            adversarial_image: attackResult.adversarial_image,
            heatmap: attackResult.heatmap,
            original_probs: attackResult.original_probs,
            adversarial_probs: attackResult.adversarial_probs,
            success: attackResult.success,
            time_elapsed: attackResult.time_elapsed,
            metadata: attackResult.metadata,
            timestamp: new Date().toISOString(),
            params: params
          });
          
          setCurrentTask(null);
          stopPolling();
          setLoading(false);
          message.success('PGD攻击完成！');
        } else if (status.status === 'failed') {
          // 任务失败
          const errorMessage = status.error || '任务执行失败';
          setError(errorMessage);
          setCurrentTask(null);
          stopPolling();
          setLoading(false);
          message.error(errorMessage);
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err);
        // 不立即停止，继续尝试
      }
    }, 2000); // 2秒轮询一次
  }, [stopPolling]);

  /**
   * 运行同步攻击
   */
  const runAttack = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runPGDAttack(params);
      
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
        params: params.params
      });

      message.success('PGD攻击完成！');
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || '攻击执行失败';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('PGD攻击执行失败:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 运行异步攻击
   */
  const runAttackAsync = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);
    stopPolling();

    try {
      const response = await runPGDAttackAsync(params);
      const taskInfo = {
        id: response.task_id,
        status: 'pending',
        progress: 0,
        params: params.params
      };
      setCurrentTask(taskInfo);
      
      // 开始轮询
      startPolling(response.task_id, params);
      
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || '任务提交失败';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('PGD异步攻击提交失败:', err);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, [startPolling, stopPolling]);

  /**
   * 保存结果到历史
   */
  const saveResult = useCallback(async (notes = '') => {
    if (!result) {
      message.warning('没有可保存的结果');
      return;
    }

    try {
      // 构建历史记录项
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        success: result.success,
        time_elapsed: result.time_elapsed,
        l2_norm: result.metadata?.avg_l2_norm,
        linf_norm: result.metadata?.avg_linf_norm,
        original_class: result.metadata?.original_class_name || 'Unknown',
        adversarial_class: result.metadata?.adversarial_class_name || 'Unknown',
        params: result.params,
        notes: notes,
        thumbnail: result.original_image // 缩略图使用原图
      };
      
      setHistory(prev => [historyItem, ...prev]);
      message.success('结果已保存到历史记录');
      
      // 可以调用后端API保存
      // await saveAttackHistory(historyItem);
    } catch (err) {
      message.error('保存失败: ' + err.message);
    }
  }, [result]);

  /**
   * 清空结果
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    stopPolling();
  }, [stopPolling]);

  /**
   * 取消异步任务
   */
  const cancelCurrentTask = useCallback(async () => {
    if (!currentTask) {
      return;
    }

    try {
      await cancelTask(currentTask.id);
      stopPolling();
      setCurrentTask(null);
      setLoading(false);
      message.info('任务已取消');
    } catch (err) {
      console.error('取消任务失败:', err);
      message.error('取消任务失败');
    }
  }, [currentTask, stopPolling]);

  /**
   * 获取历史记录
   */
  const getHistory = useCallback(() => {
    return history;
  }, [history]);

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    message.success('历史记录已清空');
  }, []);

  /**
   * 删除单条历史记录
   */
  const removeHistoryItem = useCallback((id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    message.success('已删除');
  }, []);

  /**
   * 重新运行攻击（使用历史参数）
   */
  const rerunAttack = useCallback(async (historyItem, imageBase64) => {
    const params = {
      image: imageBase64,
      model_name: 'resnet100_imagenet',
      params: historyItem.params
    };
    
    return await runAttack(params);
  }, [runAttack]);

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
    cancelTask: cancelCurrentTask,
    getHistory,
    clearHistory,
    removeHistoryItem,
    rerunAttack
  };
};

export default usePGDAttack;