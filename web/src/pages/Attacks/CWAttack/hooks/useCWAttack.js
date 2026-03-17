/**
 * C&W攻击自定义Hook (改进版)
 * 封装攻击任务的完整生命周期，支持轮询、取消、重置
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { 
  runCWAttack,
  startCWAttack, 
  getCWAttackStatus, 
  getCWAttackResult,
  searchImageNetClasses 
} from '../../../../api/attacks/cw';

/**
 * @typedef {Object} AttackState
 * @property {boolean} loading - 是否加载中
 * @property {number} progress - 进度 (0-100)
 * @property {Object|null} result - 攻击结果
 * @property {string|null} error - 错误信息
 * @property {string|null} taskId - 任务ID
 */

/**
 * C&W攻击Hook (改进版)
 * @returns {Object} 攻击状态和方法
 */
const useCWAttack = () => {
  // const { user } = useAuthStore(); // 暂时注释掉，如果需要用户信息可以启用
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, pending, processing, completed, failed
  
  // 轮询引用
  const pollingRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (currentTaskId) => {
    try {
      // 创建新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const statusData = await getCWAttackStatus(currentTaskId, {
        signal: controller.signal
      });
      
      switch (statusData.status) {
        case 'completed':
          setStatus('completed');
          setProgress(100);
          
          // 获取完整结果
          try {
            const resultData = await getCWAttackResult(currentTaskId);
            setResult(resultData);
            message.success('攻击完成！');
          } catch (resultError) {
            console.error('获取结果失败:', resultError);
            setError('获取攻击结果失败');
            message.error('获取攻击结果失败');
          }
          
          stopPolling();
          break;
          
        case 'failed':
          setStatus('failed');
          setError(statusData.error || '攻击失败');
          stopPolling();
          message.error('攻击失败：' + (statusData.error || '未知错误'));
          break;
          
        case 'processing':
          setStatus('processing');
          setProgress(statusData.progress || 0);
          break;
          
        case 'pending':
          setStatus('pending');
          setProgress(0);
          break;
          
        default:
          console.log('Unknown status:', statusData.status);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被取消');
        return;
      }
      
      console.error('Polling error:', error);
      stopPolling();
      setError(error.message || '查询任务状态失败');
      message.error('查询任务状态失败');
    }
  }, [stopPolling]);

  // 启动攻击
  const runAttack = useCallback(async (params) => {
    // 验证登录
    // if (!user) {
    //   message.warning('请先登录');
    //   return;
    // } // 暂时注释掉登录验证

    // 验证参数
    if (!params.image_id) {
      message.error('请先上传图片');
      return;
    }

    // 重置状态
    setLoading(true);
    setProgress(0);
    setResult(null);
    setError(null);
    setStatus('pending');
    stopPolling();

    try {
      // 启动攻击任务
      const response = await startCWAttack(params);
      
      if (response.task_id) {
        setTaskId(response.task_id);
        setStatus('pending');
        message.success('攻击任务已启动');
        
        // 开始轮询（每2秒）
        pollingRef.current = setInterval(() => {
          pollTaskStatus(response.task_id);
        }, 2000);
      } else {
        throw new Error('未获取到任务ID');
      }
    } catch (error) {
      console.error('Start attack error:', error);
      const errorMsg = error.response?.data?.detail || error.message || '启动攻击失败';
      setError(errorMsg);
      setStatus('failed');
      message.error('启动攻击失败：' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [/* user, */ pollTaskStatus, stopPolling]); // 暂时注释掉user依赖

  // 运行同步攻击（用于快速测试）
  const runSyncAttack = useCallback(async (params) => {
    // 验证登录
    // if (!user) {
    //   message.warning('请先登录');
    //   return;
    // } // 暂时注释掉登录验证

    // 验证参数
    if (!params.image) {
      message.error('请先上传图片');
      return;
    }

    // 重置状态
    setLoading(true);
    setProgress(0);
    setResult(null);
    setError(null);
    setStatus('processing');
    stopPolling();

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 调用同步API
      const response = await runCWAttack(params);
      
      clearInterval(progressInterval);
      setProgress(100);
      setStatus('completed');
      setResult(response);
      message.success('攻击完成！');
      
    } catch (error) {
      console.error('Sync attack error:', error);
      const errorMsg = error.response?.data?.detail || error.message || '攻击执行失败';
      setError(errorMsg);
      setStatus('failed');
      message.error('攻击失败：' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [/* user, */ stopPolling]); // 暂时注释掉user依赖

  // 取消任务
  const cancel = useCallback(() => {
    stopPolling();
    setLoading(false);
    setStatus('idle');
    setTaskId(null);
    message.info('攻击任务已取消');
  }, [stopPolling]);

  // 重置状态
  const reset = useCallback(() => {
    stopPolling();
    setLoading(false);
    setProgress(0);
    setResult(null);
    setError(null);
    setTaskId(null);
    setStatus('idle');
  }, [stopPolling]);

  // 保存结果
  const saveResult = useCallback(async (resultData) => {
    try {
      // 这里可以调用保存API
      console.log('保存结果:', resultData);
      message.success('结果已保存');
    } catch (error) {
      console.error('保存结果失败:', error);
      message.error('保存结果失败');
    }
  }, []);

  // 导出数据
  const exportData = useCallback(async (resultData) => {
    try {
      const dataStr = JSON.stringify(resultData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cw_attack_result_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('数据已导出');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  }, []);

  // 搜索ImageNet类别
  const searchClasses = useCallback(async (query, limit = 20) => {
    try {
      const result = await searchImageNetClasses(query, limit);
      return result.results || [];
    } catch (error) {
      console.error('搜索类别失败:', error);
      return [];
    }
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // 状态
    loading,
    progress,
    result,
    error,
    setError,
    taskId,
    status,
    
    // 方法
    runAttack,
    runSyncAttack,
    cancel,
    reset,
    saveResult,
    exportData,
    searchClasses,
    
    // 计算属性
    isRunning: loading || status === 'processing',
    canCancel: status === 'pending' || status === 'processing',
    canRetry: status === 'failed',
    hasResult: result !== null,
    isSuccess: status === 'completed' && result?.success
  };
};

export default useCWAttack;
