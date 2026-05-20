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
});

// ── Compare Mode defaults ──────────────────────────────────────────────────
const COMPARE_ALGORITHM_DEFAULTS = {
  fgsm: { epsilon: 0.03, targeted: false },
  ifgsm: { epsilon: 0.03, alpha: 0.007, num_iter: 10, targeted: false },
  pgd: { epsilon: 0.03, alpha: 0.01, num_iter: 40, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' },
  cw: { c: 0.1, kappa: 0, lr: 0.01, max_iter: 500, binary_search_steps: 5, init_const: 0.01, targeted: false, abort_early: true, early_stop_iters: 50 },
  deepfool: { overshoot: 0.02, max_iter: 50, num_classes: 10 },
};

const createComparePanelState = (algorithm) => ({
  algorithm,
  paramsText: JSON.stringify(COMPARE_ALGORITHM_DEFAULTS[algorithm] ?? {}, null, 2),
  taskId: null,
  status: 'idle',
  progress: 0,
  message: '',
  result: null,
});

const DEFAULT_COMPARE_STATE = {
  imageUrl: '',
  panels: [createComparePanelState('fgsm'), createComparePanelState('cw')],
};

// ── Store ──────────────────────────────────────────────────────────────────
const useAttackStore = create(
  persist(
    (set, get) => ({
      // Per-algorithm slices
      fgsm: createEmptySlice('fgsm'),
      ifgsm: createEmptySlice('ifgsm'),
      pgd: createEmptySlice('pgd'),
      cw: createEmptySlice('cw'),
      deepfool: createEmptySlice('deepfool'),

      // Compare mode slice
      compareMode: { ...DEFAULT_COMPARE_STATE },

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

      // Compare mode helpers
      updateCompareMode: (partial) =>
        set((state) => ({
          compareMode: { ...state.compareMode, ...partial },
        })),

      updateComparePanel: (index, updater) =>
        set((state) => {
          const newPanels = [...state.compareMode.panels];
          newPanels[index] = typeof updater === 'function'
            ? updater(newPanels[index])
            : { ...newPanels[index], ...updater };
          return { compareMode: { ...state.compareMode, panels: newPanels } };
        }),

      resetCompareMode: () =>
        set(() => ({
          compareMode: {
            imageUrl: '',
            panels: [createComparePanelState('fgsm'), createComparePanelState('cw')],
          },
        })),
    }),
    {
      name: 'attack-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export { useAttackStore, ALGORITHM_DEFAULTS, createComparePanelState };

