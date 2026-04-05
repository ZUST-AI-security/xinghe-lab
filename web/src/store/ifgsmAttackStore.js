/**
 * I-FGSM攻击状态管理
 * 使用Zustand管理I-FGSM攻击历史、参数模板等全局状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useIFGSMAttackStore = create(
  persist(
    (set, get) => ({
      history: [],

      templates: [
        {
          id: 'default',
          name: '默认参数',
          description: '平衡的默认参数，适合大多数分类攻击场景',
          icon: '⚡',
          params: {
            eps: 8.0,
            alpha: 1.0,
            steps: 10,
            targeted: false,
            norm: 'inf'
          },
          tags: ['balanced', 'default']
        },
        {
          id: 'aggressive',
          name: '激进攻击',
          description: '高成功率，但扰动较大',
          icon: '🔥',
          params: {
            eps: 16.0,
            alpha: 2.0,
            steps: 20,
            targeted: false,
            norm: 'inf'
          },
          tags: ['aggressive', 'high-success']
        },
        {
          id: 'stealth',
          name: '隐蔽攻击',
          description: '小扰动，适合隐蔽与可视性要求高的场景',
          icon: '👻',
          params: {
            eps: 4.0,
            alpha: 0.5,
            steps: 5,
            targeted: false,
            norm: 'inf'
          },
          tags: ['stealth', 'low-perturbation']
        },
        {
          id: 'fast',
          name: '快速测试',
          description: '快速验证，适合调试和参数预览',
          icon: '⚡',
          params: {
            eps: 6.0,
            alpha: 1.5,
            steps: 5,
            targeted: false,
            norm: 'inf'
          },
          tags: ['fast', 'debug']
        },
        {
          id: 'targeted',
          name: '定向攻击',
          description: '针对特定目标类别的迭代FGSM攻击',
          icon: '🎯',
          params: {
            eps: 10.0,
            alpha: 1.0,
            steps: 15,
            targeted: true,
            norm: 'inf'
          },
          tags: ['targeted', 'specific-class']
        }
      ],

      settings: {
        defaultMode: 'async',
        autoSave: true,
        showAdvanced: false,
        maxHistoryItems: 50,
        defaultNorm: 'inf',
        enableNotifications: true
      },

      stats: {
        totalAttacks: 0,
        successfulAttacks: 0,
        failedAttacks: 0,
        avgTimeElapsed: 0,
        avgPerturbationNorm: 0,
        lastAttackTime: null
      },

      addHistory: (attackRecord) => {
        const record = {
          ...attackRecord,
          id: Date.now(),
          timestamp: new Date().toISOString(),
          params: attackRecord.params || {}
        };

        set((state) => {
          const newHistory = [record, ...state.history].slice(0, state.settings.maxHistoryItems);
          const newStats = {
            ...state.stats,
            totalAttacks: state.stats.totalAttacks + 1,
            successfulAttacks: state.stats.successfulAttacks + (record.success ? 1 : 0),
            failedAttacks: state.stats.failedAttacks + (record.success ? 0 : 1),
            lastAttackTime: record.timestamp
          };

          const successfulRecords = newHistory.filter(r => r.success && r.time_elapsed);
          if (successfulRecords.length > 0) {
            newStats.avgTimeElapsed = successfulRecords.reduce((sum, r) => sum + r.time_elapsed, 0) / successfulRecords.length;
          }

          const perturbationRecords = newHistory.filter(r => r.success && (r.perturbation_norm || r.eps || r.norm));
          if (perturbationRecords.length > 0) {
            newStats.avgPerturbationNorm = perturbationRecords.reduce((sum, r) => sum + (r.perturbation_norm ?? r.eps ?? 0), 0) / perturbationRecords.length;
          }

          return {
            history: newHistory,
            stats: newStats
          };
        });

        if (get().settings.autoSave) {
          console.log('I-FGSM攻击记录已自动保存');
        }
      },

      clearHistory: () => set({
        history: [],
        stats: {
          totalAttacks: 0,
          successfulAttacks: 0,
          failedAttacks: 0,
          avgTimeElapsed: 0,
          avgPerturbationNorm: 0,
          lastAttackTime: null
        }
      }),

      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter(item => item.id !== id)
      })),

      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, {
          ...template,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        }]
      })),

      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(template =>
          template.id === id ? { ...template, ...updates } : template
        )
      })),

      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(t => t.id !== templateId)
      })),

      getTemplate: (templateId) => {
        return get().templates.find(t => t.id === templateId);
      },

      getTemplatesByTag: (tag) => {
        return get().templates.filter(t => t.tags && t.tags.includes(tag));
      },

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      getSuccessRate: () => {
        const { stats } = get();
        if (stats.totalAttacks === 0) return 0;
        return (stats.successfulAttacks / stats.totalAttacks) * 100;
      },

      getRecentSuccesses: (limit = 5) => {
        const { history } = get();
        return history
          .filter(record => record.success)
          .slice(0, limit);
      },

      exportData: () => {
        const state = get();
        return {
          history: state.history,
          templates: state.templates,
          settings: state.settings,
          stats: state.stats,
          exportTime: new Date().toISOString()
        };
      },

      importData: (data) => {
        if (data.history) set((state) => ({ history: [...state.history, ...data.history] }));
        if (data.templates) set((state) => ({ templates: [...state.templates, ...data.templates] }));
        if (data.settings) set((state) => ({ settings: { ...state.settings, ...data.settings } }));
        if (data.stats) set((state) => ({ stats: { ...state.stats, ...data.stats } }));
      },

      resetAll: () => set({
        history: [],
        templates: get().templates.filter(t => ['default', 'aggressive', 'stealth', 'fast', 'targeted'].includes(t.id)),
        settings: {
          defaultMode: 'async',
          autoSave: true,
          showAdvanced: false,
          maxHistoryItems: 50,
          defaultNorm: 'inf',
          enableNotifications: true
        },
        stats: {
          totalAttacks: 0,
          successfulAttacks: 0,
          failedAttacks: 0,
          avgTimeElapsed: 0,
          avgPerturbationNorm: 0,
          lastAttackTime: null
        }
      })
    }),
    {
      name: 'ifgsm-attack-storage',
      partialize: (state) => ({
        templates: state.templates,
        history: state.history,
        settings: state.settings,
        stats: state.stats
      }),
      version: 1
    }
  )
);

export default useIFGSMAttackStore;
