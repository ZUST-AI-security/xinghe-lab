/**
 * C&W攻击状态管理
 * 使用Zustand管理攻击历史、参数模板等全局状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCWAttackStore = create(
  persist(
    (set, get) => ({
      // 攻击历史
      history: [],
      
      // 常用参数模板
      templates: [
        {
          id: 'default',
          name: '默认参数',
          description: '平衡的默认参数，适合大多数场景',
          icon: '⚡',
          params: {
            c: 0.1,
            kappa: 0,
            lr: 0.01,
            max_iter: 2000,
            norm: '2',
            binary_search_steps: 9,
            init_const: 0.01,
            targeted: false,
            abort_early: true,
            early_stop_iters: 50
          },
          tags: ['balanced', 'default']
        },
        {
          id: 'aggressive',
          name: '激进攻击',
          description: '高成功率，但扰动较大',
          icon: '🔥',
          params: {
            c: 10,
            kappa: 10,
            lr: 0.05,
            max_iter: 5000,
            norm: '2',
            binary_search_steps: 15,
            init_const: 0.1,
            targeted: false,
            abort_early: false,
            early_stop_iters: 100
          },
          tags: ['aggressive', 'high-success']
        },
        {
          id: 'stealth',
          name: '隐蔽攻击',
          description: '小扰动，适合隐蔽场景',
          icon: '👻',
          params: {
            c: 0.01,
            kappa: 0,
            lr: 0.001,
            max_iter: 1000,
            norm: 'inf',
            binary_search_steps: 5,
            init_const: 0.001,
            targeted: false,
            abort_early: true,
            early_stop_iters: 25
          },
          tags: ['stealth', 'low-perturbation']
        },
        {
          id: 'fast',
          name: '快速测试',
          description: '快速验证，适合调试',
          icon: '⚡',
          params: {
            c: 1.0,
            kappa: 0,
            lr: 0.02,
            max_iter: 500,
            norm: '2',
            binary_search_steps: 3,
            init_const: 0.1,
            targeted: false,
            abort_early: true,
            early_stop_iters: 20
          },
          tags: ['fast', 'debug']
        },
        {
          id: 'targeted',
          name: '定向攻击',
          description: '针对特定类别的攻击',
          icon: '🎯',
          params: {
            c: 1.0,
            kappa: 5,
            lr: 0.01,
            max_iter: 3000,
            norm: '2',
            binary_search_steps: 10,
            init_const: 0.05,
            targeted: true,
            abort_early: true,
            early_stop_iters: 50
          },
          tags: ['targeted', 'specific-class']
        }
      ],

      // 用户设置
      settings: {
        defaultMode: 'async', // 'async' | 'sync'
        autoSave: true,
        showAdvanced: false,
        maxHistoryItems: 50,
        defaultNorm: '2',
        enableNotifications: true
      },

      // 统计信息
      stats: {
        totalAttacks: 0,
        successfulAttacks: 0,
        failedAttacks: 0,
        avgTimeElapsed: 0,
        avgPerturbationNorm: 0,
        lastAttackTime: null
      },

      // 添加攻击历史
      addHistory: (attackRecord) => {
        const record = {
          ...attackRecord,
          id: Date.now(),
          timestamp: new Date().toISOString(),
          params: attackRecord.params || {}
        };

        set((state) => {
          const newHistory = [record, ...state.history].slice(0, state.settings.maxHistoryItems);
          
          // 更新统计信息
          const newStats = {
            ...state.stats,
            totalAttacks: state.stats.totalAttacks + 1,
            successfulAttacks: state.stats.successfulAttacks + (record.success ? 1 : 0),
            failedAttacks: state.stats.failedAttacks + (record.success ? 0 : 1),
            lastAttackTime: record.timestamp
          };

          // 计算平均值
          const successfulRecords = newHistory.filter(r => r.success && r.time_elapsed);
          if (successfulRecords.length > 0) {
            newStats.avgTimeElapsed = successfulRecords.reduce((sum, r) => sum + r.time_elapsed, 0) / successfulRecords.length;
          }

          const perturbationRecords = newHistory.filter(r => r.success && r.perturbation_norm);
          if (perturbationRecords.length > 0) {
            newStats.avgPerturbationNorm = perturbationRecords.reduce((sum, r) => sum + r.perturbation_norm, 0) / perturbationRecords.length;
          }

          return {
            history: newHistory,
            stats: newStats
          };
        });

        // 自动保存到本地存储
        const { autoSave } = get().settings;
        if (autoSave) {
          console.log('Attack record auto-saved');
        }
      },

      // 清除历史
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

      // 删除单个历史记录
      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter(item => item.id !== id)
      })),

      // 添加模板
      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, {
          ...template,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        }]
      })),

      // 更新模板
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(template => 
          template.id === id ? { ...template, ...updates } : template
        )
      })),

      // 删除模板
      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(t => t.id !== templateId)
      })),

      // 获取模板
      getTemplate: (templateId) => {
        return get().templates.find(t => t.id === templateId);
      },

      // 按标签搜索模板
      getTemplatesByTag: (tag) => {
        return get().templates.filter(t => t.tags && t.tags.includes(tag));
      },

      // 更新设置
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      // 获取成功率
      getSuccessRate: () => {
        const { stats } = get();
        if (stats.totalAttacks === 0) return 0;
        return (stats.successfulAttacks / stats.totalAttacks) * 100;
      },

      // 获取最近的成功记录
      getRecentSuccesses: (limit = 5) => {
        const { history } = get();
        return history
          .filter(record => record.success)
          .slice(0, limit);
      },

      // 导出数据
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

      // 导入数据
      importData: (data) => {
        if (data.history) set((state) => ({ history: [...state.history, ...data.history] }));
        if (data.templates) set((state) => ({ templates: [...state.templates, ...data.templates] }));
        if (data.settings) set((state) => ({ settings: { ...state.settings, ...data.settings } }));
        if (data.stats) set((state) => ({ stats: { ...state.stats, ...data.stats } }));
      },

      // 重置所有数据
      resetAll: () => set({
        history: [],
        templates: get().templates.filter(t => ['default', 'aggressive', 'stealth', 'fast', 'targeted'].includes(t.id)),
        settings: {
          defaultMode: 'async',
          autoSave: true,
          showAdvanced: false,
          maxHistoryItems: 50,
          defaultNorm: '2',
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
      name: 'cw-attack-storage', // localStorage key
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

export default useCWAttackStore;
