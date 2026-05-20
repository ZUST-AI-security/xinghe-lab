/**
 * Attack page state store — persists per-algorithm state across navigation.
 * Uses sessionStorage (clears on tab close) for security.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ALGORITHM_DEFAULTS = {
  fgsm: {
    params: { epsilon: 0.03, targeted: false },
    useAsync: true,
  },
  ifgsm: {
    params: { epsilon: 0.03, alpha: 0.01, num_iterations: 10, targeted: false },
    useAsync: true,
  },
  pgd: {
    params: {
      epsilon: 0.03,
      alpha: 0.01,
      num_iter: 40,
      targeted: false,
      random_start: true,
      loss_type: 'ce',
      norm: 'linf',
    },
    useAsync: true,
  },
  cw: {
    params: {
      c: 0.1,
      kappa: 0,
      lr: 0.01,
      max_iter: 500,
      binary_search_steps: 5,
      init_const: 0.01,
      targeted: false,
      abort_early: true,
      early_stop_iters: 50,
    },
    useAsync: true,
  },
  deepfool: {
    params: { max_iter: 50, overshoot: 0.02, num_classes: 10 },
    useAsync: true,
  },
  compare: {
    params: {},
    useAsync: true,
  },
};

const createEmptySlice = (algorithm) => ({
  params: { ...(ALGORITHM_DEFAULTS[algorithm]?.params ?? {}) },
  useAsync: ALGORITHM_DEFAULTS[algorithm]?.useAsync ?? true,
  result: null,
  status: 'idle',
  error: null,
  progress: 0,
  _loading: false,
  _taskId: null,
  _statusMessage: '',
  // CompareMode 专用字段
  ...(algorithm === 'compare' ? { imageUrl: '', panels: [] } : {}),
});

const useAttackStore = create(
  persist(
    (set, get) => ({
      // Per-algorithm slices
      fgsm: createEmptySlice('fgsm'),
      ifgsm: createEmptySlice('ifgsm'),
      pgd: createEmptySlice('pgd'),
      cw: createEmptySlice('cw'),
      deepfool: createEmptySlice('deepfool'),
      compare: createEmptySlice('compare'),

      // Generic getter
      getSlice: (algorithm) => get()[algorithm] ?? createEmptySlice(algorithm),

      // Generic setter — merges partial update into the algorithm slice
      updateSlice: (algorithm, partial) =>
        set((state) => ({
          [algorithm]: { ...state[algorithm], ...partial },
        })),

      // Reset a single algorithm to defaults
      resetSlice: (algorithm) =>
        set((state) => ({
          [algorithm]: createEmptySlice(algorithm),
        })),
    }),
    {
      name: 'attack-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export { useAttackStore, ALGORITHM_DEFAULTS };
