import { useCallback, useEffect, useMemo, useRef } from 'react';
import { App } from 'antd';
import { useAttackStore } from '../../../store/attackStore';

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
  algorithmKey,
  runSync,
  submitAsync,
  getTaskStatus,
  cancelTask,
  pauseTask,
  resumeTask,
  searchClassesApi,
  historyStorageKey,
}) => {
  const { message } = App.useApp();
  const updateSlice = useAttackStore((s) => s.updateSlice);

  // Persisted fields — read directly from store, write via updateSlice
  const result = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?.result : null)) ?? null;
  const status = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?.status : 'idle')) ?? 'idle';
  const error = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?.error : null)) ?? null;
  const progress = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?.progress : 0)) ?? 0;

  const setResult = useCallback(
    (val) => updateSlice(algorithmKey, { result: typeof val === 'function' ? val(result) : val }),
    [algorithmKey, updateSlice, result]
  );
  const setStatus = useCallback(
    (val) => updateSlice(algorithmKey, { status: typeof val === 'function' ? val(status) : val }),
    [algorithmKey, updateSlice, status]
  );
  const setError = useCallback(
    (val) => updateSlice(algorithmKey, { error: typeof val === 'function' ? val(error) : val }),
    [algorithmKey, updateSlice, error]
  );
  const setProgress = useCallback(
    (val) => updateSlice(algorithmKey, { progress: typeof val === 'function' ? val(progress) : val }),
    [algorithmKey, updateSlice, progress]
  );

  const pollingRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // We need loading/taskId/statusMessage to trigger re-renders, so use store for these too
  const loading = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?._loading : false)) ?? false;
  const taskId = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?._taskId : null)) ?? null;
  const statusMessage = useAttackStore((s) => (algorithmKey ? s[algorithmKey]?._statusMessage : '')) ?? '';

  const setLoading = useCallback(
    (val) => updateSlice(algorithmKey, { _loading: val }),
    [algorithmKey, updateSlice]
  );
  const setTaskId = useCallback(
    (val) => updateSlice(algorithmKey, { _taskId: val }),
    [algorithmKey, updateSlice]
  );
  const setStatusMessage = useCallback(
    (val) => updateSlice(algorithmKey, { _statusMessage: val }),
    [algorithmKey, updateSlice]
  );

  const reset = useCallback(() => {
    stopPolling();
    if (algorithmKey) {
      updateSlice(algorithmKey, {
        _loading: false,
        progress: 0,
        result: null,
        error: null,
        _taskId: null,
        status: 'idle',
        _statusMessage: '',
      });
    }
  }, [stopPolling, algorithmKey, updateSlice]);

  const finishWithResult = useCallback((response, params, nextStatus = COMPLETED_STATUS) => {
    if (algorithmKey) {
      updateSlice(algorithmKey, {
        result: normalizeResult(response, params),
        _loading: false,
        progress: 100,
        _taskId: null,
        status: nextStatus,
        _statusMessage: 'Completed',
      });
    }
  }, [algorithmKey, updateSlice]);

  const pollTask = useCallback((currentTaskId, requestData) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const task = await getTaskStatus(currentTaskId);
        const taskStatus = task.status || 'pending';
        const taskProgress = task.progress ? Math.round(task.progress) : taskStatus === COMPLETED_STATUS ? 100 : 0;

        updateSlice(algorithmKey, {
          status: taskStatus,
          _statusMessage: task.message || '',
          progress: taskProgress,
        });

        if (taskStatus === COMPLETED_STATUS) {
          stopPolling();
          finishWithResult(task.result, requestData.params);
          message.success(`${attackName}攻击完成`);
          return;
        }

        if (taskStatus === FAILED_STATUS) {
          stopPolling();
          updateSlice(algorithmKey, {
            _loading: false,
            _taskId: null,
            error: task.error || '任务执行失败',
            status: FAILED_STATUS,
          });
          message.error(task.error || `${attackName}攻击失败`);
        }
      } catch (pollError) {
        stopPolling();
        updateSlice(algorithmKey, {
          _loading: false,
          _taskId: null,
          status: FAILED_STATUS,
          _statusMessage: '',
          error: pollError.response?.data?.detail || pollError.message || '获取任务状态失败',
        });
      }
    }, 2000);
  }, [attackName, algorithmKey, finishWithResult, getTaskStatus, stopPolling, updateSlice, message]);

  const runSyncAttack = useCallback(async (requestData) => {
    stopPolling();
    updateSlice(algorithmKey, {
      _loading: true,
      progress: 20,
      result: null,
      error: null,
      _taskId: null,
      status: 'processing',
      _statusMessage: 'Running synchronously...',
    });

    try {
      const response = await runSync(requestData);
      finishWithResult(response, requestData.params);
      message.success(`${attackName}攻击完成`);
      return response;
    } catch (requestError) {
      updateSlice(algorithmKey, {
        _loading: false,
        progress: 0,
        status: FAILED_STATUS,
        _statusMessage: '',
        error: getRequestErrorMessage(requestError, `${attackName}攻击执行失败`, {
          preferAsync: true,
        }),
      });
      throw requestError;
    }
  }, [attackName, algorithmKey, finishWithResult, runSync, stopPolling, updateSlice, message]);

  const runAttack = useCallback(async (requestData) => {
    stopPolling();
    updateSlice(algorithmKey, {
      _loading: true,
      progress: 0,
      result: null,
      error: null,
      status: 'pending',
      _statusMessage: 'Task submitted, waiting for worker...',
    });

    try {
      const response = await submitAsync(requestData);
      updateSlice(algorithmKey, { _taskId: response.task_id });
      pollTask(response.task_id, requestData);
      return response;
    } catch (requestError) {
      updateSlice(algorithmKey, {
        _loading: false,
        status: FAILED_STATUS,
        _statusMessage: '',
        error: getRequestErrorMessage(requestError, `${attackName}任务提交失败`),
      });
      throw requestError;
    }
  }, [attackName, algorithmKey, pollTask, stopPolling, submitAsync, updateSlice, message]);

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
  }, [cancelTask, reset, taskId, message]);

  const pause = useCallback(async () => {
    if (!taskId || !pauseTask) {
      return;
    }

    try {
      await pauseTask(taskId);
      message.info('任务已暂停');
    } catch (err) {
      message.error('暂停任务失败');
    }
  }, [pauseTask, taskId, message]);

  const resume = useCallback(async () => {
    if (!taskId || !resumeTask) {
      return;
    }

    try {
      await resumeTask(taskId);
      message.info('任务已恢复');
    } catch (err) {
      message.error('恢复任务失败');
    }
  }, [resumeTask, taskId, message]);

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
  }, [historyStorageKey, result, message]);

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
    pause,
    resume,
    reset,
    saveResult,
    exportData,
    searchClasses,
    isRunning,
    isPaused: statusMessage?.includes('Paused'),
    canCancel: Boolean(taskId) && isRunning,
    canPause: Boolean(taskId) && isRunning && !statusMessage?.includes('Paused'),
    canResume: Boolean(taskId) && statusMessage?.includes('Paused'),
    canRetry: status === FAILED_STATUS,
    hasResult: Boolean(result),
    isSuccess: status === COMPLETED_STATUS && Boolean(result?.success),
  };
};
