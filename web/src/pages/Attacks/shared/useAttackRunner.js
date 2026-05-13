import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';

const COMPLETED_STATUS = 'completed';
const FAILED_STATUS = 'failed';
const RUNNING_STATUSES = new Set(['pending', 'running', 'processing']);

const isTimeoutError = (error) =>
  error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout');

const getRequestErrorMessage = (requestError, fallbackMessage, options = {}) => {
  if (options.preferAsync && isTimeoutError(requestError)) {
    return '同步请求超时，建议切换到异步 submit 模式后通过任务轮询查看进度。';
  }

  return requestError.response?.data?.detail || requestError.message || fallbackMessage;
};

const normalizeResult = (response, params) => ({
  ...response,
  params,
  timestamp: new Date().toISOString(),
});

export const useAttackRunner = ({
  attackName,
  runSync,
  submitAsync,
  getTaskStatus,
  cancelTask,
  searchClassesApi,
  historyStorageKey,
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const pollingRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setLoading(false);
    setProgress(0);
    setResult(null);
    setError(null);
    setTaskId(null);
    setStatus('idle');
    setStatusMessage('');
  }, [stopPolling]);

  const finishWithResult = useCallback((response, params, nextStatus = COMPLETED_STATUS) => {
    setResult(normalizeResult(response, params));
    setLoading(false);
    setProgress(100);
    setTaskId(null);
    setStatus(nextStatus);
    setStatusMessage('Completed');
  }, []);

  const pollTask = useCallback((currentTaskId, requestData) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const task = await getTaskStatus(currentTaskId);
        const taskStatus = task.status || 'pending';
        setStatus(taskStatus);
        setStatusMessage(task.message || '');
        setProgress(task.progress ? Math.round(task.progress) : taskStatus === COMPLETED_STATUS ? 100 : 0);

        if (taskStatus === COMPLETED_STATUS) {
          stopPolling();
          finishWithResult(task.result, requestData.params);
          message.success(`${attackName}攻击完成`);
          return;
        }

        if (taskStatus === FAILED_STATUS) {
          stopPolling();
          setLoading(false);
          setTaskId(null);
          setError(task.error || '任务执行失败');
          setStatus(FAILED_STATUS);
          message.error(task.error || `${attackName}攻击失败`);
        }
      } catch (pollError) {
        stopPolling();
        setLoading(false);
        setTaskId(null);
        setStatus(FAILED_STATUS);
        setStatusMessage('');
        setError(pollError.response?.data?.detail || pollError.message || '获取任务状态失败');
      }
    }, 2000);
  }, [attackName, finishWithResult, getTaskStatus, stopPolling]);

  const runSyncAttack = useCallback(async (requestData) => {
    stopPolling();
    setLoading(true);
    setProgress(20);
    setResult(null);
    setError(null);
    setTaskId(null);
    setStatus('processing');
    setStatusMessage('Running synchronously...');

    try {
      const response = await runSync(requestData);
      finishWithResult(response, requestData.params);
      message.success(`${attackName}攻击完成`);
      return response;
    } catch (requestError) {
      setLoading(false);
      setProgress(0);
      setStatus(FAILED_STATUS);
      setStatusMessage('');
      setError(
        getRequestErrorMessage(requestError, `${attackName}攻击执行失败`, {
          preferAsync: true,
        })
      );
      throw requestError;
    }
  }, [attackName, finishWithResult, runSync, stopPolling]);

  const runAttack = useCallback(async (requestData) => {
    stopPolling();
    setLoading(true);
    setProgress(0);
    setResult(null);
    setError(null);
    setStatus('pending');
    setStatusMessage('Task submitted, waiting for worker...');

    try {
      const response = await submitAsync(requestData);
      setTaskId(response.task_id);

      // 若后端因队列繁忙自动限制了参数，向用户展示警告提示
      if (response.param_limited) {
        const reason = response.param_limit_reason || '部分参数已被自动限制';
        message.warning(`${attackName} 参数已被自动限制：${reason}`);
      }

      pollTask(response.task_id, requestData);
      return response;
    } catch (requestError) {
      setLoading(false);
      setStatus(FAILED_STATUS);
      setStatusMessage('');

      // HTTP 429：并发任务数超限
      if (requestError.response?.status === 429) {
        const responseData = requestError.response?.data || {};
        const activeTasks = responseData.active_tasks;
        const detail = responseData.detail || '';
        const tipMsg = activeTasks !== undefined
          ? `当前已有 ${activeTasks} 个任务在运行，请等待任务完成后再提交`
          : detail || '当前任务数已达上限，请等待任务完成后再提交';
        setError(tipMsg);
        message.warning(tipMsg);
        throw requestError;
      }

      setError(getRequestErrorMessage(requestError, `${attackName}任务提交失败`));
      throw requestError;
    }
  }, [attackName, pollTask, stopPolling, submitAsync]);

  const cancel = useCallback(async () => {
    if (!taskId) {
      return;
    }

    try {
      await cancelTask(taskId);
      message.info('任务已取消');
    } finally {
      reset();
    }
  }, [cancelTask, reset, taskId]);

  const saveResult = useCallback((notes = '') => {
    if (!result) {
      throw new Error('没有可保存的结果');
    }

    const savedItem = {
      ...result,
      notes,
      savedAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem(historyStorageKey) || '[]');
    localStorage.setItem(historyStorageKey, JSON.stringify([savedItem, ...existing].slice(0, 50)));
    message.success('结果已保存');
  }, [historyStorageKey, result]);

  const exportData = useCallback((resultData = result) => {
    if (!resultData) {
      return;
    }
    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${attackName.toLowerCase()}_attack_result_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [attackName, result]);

  const searchClasses = useCallback(async (query, limit = 20) => {
    if (!searchClassesApi || !query) {
      return [];
    }
    const response = await searchClassesApi(query, limit);
    return response.results || [];
  }, [searchClassesApi]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const isRunning = useMemo(() => RUNNING_STATUSES.has(status), [status]);

  return {
    loading,
    progress,
    result,
    error,
    setError,
    taskId,
    status,
    statusMessage,
    runAttack,
    runSyncAttack,
    cancel,
    reset,
    saveResult,
    exportData,
    searchClasses,
    isRunning,
    canCancel: Boolean(taskId) && isRunning,
    canRetry: status === FAILED_STATUS,
    hasResult: Boolean(result),
    isSuccess: status === COMPLETED_STATUS && Boolean(result?.success),
  };
};
