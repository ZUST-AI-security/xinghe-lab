/**
 * PGD攻击状态管理
 * 使用Zustand管理攻击历史、参数模板等全局状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { message } from 'antd';

const usePGDAttackStore = create(
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
            epsilon: 0.03,
            alpha: 0.01,
            num_iter: 40,
            targeted: false,
            random_start: true,
            loss_type: 'ce',
            norm: 'linf'
          },
          tags: ['balanced', 'default']
        },
        {
          id: 'aggressive',
          name: '激进攻击',
          description: '高成功率，但扰动较大',
          icon: '🔥',
          params: {
            epsilon: 0.1,
            alpha: 0.02,
            num_iter: 100,
            targeted: false,
            random_start: true,
            loss_type: 'dlr',
            norm: 'linf'
          },
          tags: ['aggressive', 'high-success']
        },
        {
          id: 'stealth',
          name: '隐蔽攻击',
          description: '小扰动，适合隐蔽场景',
          icon: '👻',
          params: {
            epsilon: 0.008,
            alpha: 0.002,
            num_iter: 20,
            targeted: false,
            random_start: false,
            loss_type: 'ce',
            norm: 'linf'
          },
          tags: ['stealth', 'low-perturbation']
        },
        {
          id: 'fast',
          name: '快速测试',
          description: '快速验证，适合调试',
          icon: '⚡',
          params: {
            epsilon: 0.03,
            alpha: 0.01,
            num_iter: 10,
            targeted: false,
            random_start: false,
            loss_type: 'ce',
            norm: 'linf'
          },
          tags: ['fast', 'debug']
        },
        {
          id: 'targeted',
          name: '定向攻击',
          description: '针对特定类别的攻击',
          icon: '🎯',
          params: {
            epsilon: 0.03,
            alpha: 0.01,
            num_iter: 60,
            targeted: true,
            random_start: true,
            loss_type: 'ce',
            norm: 'linf'
          },
          tags: ['targeted', 'specific-class']
        },
        {
          id: 'l2_attack',
          name: 'L2范数攻击',
          description: '使用L2范数约束，产生更平滑的扰动',
          icon: '📐',
          params: {
            epsilon: 0.5,
            alpha: 0.05,
            num_iter: 50,
            targeted: false,
            random_start: true,
            loss_type: 'ce',
            norm: 'l2'
          },
          tags: ['l2', 'smooth']
        }
      ],

      // 用户设置
      settings: {
        defaultMode: 'sync', // 'async' | 'sync' - PGD很快，默认用同步
        autoSave: true,
        showAdvanced: false,
        maxHistoryItems: 50,
        defaultNorm: 'linf',
        enableNotifications: true,
        defaultEpsilon: 0.03,
        defaultAlpha: 0.01,
        defaultIterations: 40
      },

      // 统计信息
      stats: {
        totalAttacks: 0,
        successfulAttacks: 0,
        failedAttacks: 0,
        avgTimeElapsed: 0,
        avgL2Norm: 0,
        avgLinfNorm: 0,
        lastAttackTime: null
      },

      // 当前选中的模板
      currentTemplateId: 'default',

      /**
       * 添加攻击历史
       */
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
          const successfulCount = newHistory.filter(r => r.success).length;
          const totalCount = newHistory.length;
          
          // 计算平均耗时
          const avgTime = newHistory
            .filter(r => r.time_elapsed)
            .reduce((sum, r) => sum + r.time_elapsed, 0) / totalCount || 0;
          
          // 计算平均L2范数
          const avgL2 = newHistory
            .filter(r => r.l2_norm)
            .reduce((sum, r) => sum + r.l2_norm, 0) / totalCount || 0;
          
          // 计算平均L∞范数
          const avgLinf = newHistory
            .filter(r => r.linf_norm)
            .reduce((sum, r) => sum + r.linf_norm, 0) / totalCount || 0;

          return {
            history: newHistory,
            stats: {
              totalAttacks: totalCount,
              successfulAttacks: successfulCount,
              failedAttacks: totalCount - successfulCount,
              avgTimeElapsed: avgTime,
              avgL2Norm: avgL2,
              avgLinfNorm: avgLinf,
              lastAttackTime: record.timestamp
            }
          };
        });
      },

      /**
       * 清除历史
       */
      clearHistory: () => set({ 
        history: [],
        stats: {
          totalAttacks: 0,
          successfulAttacks: 0,
          failedAttacks: 0,
          avgTimeElapsed: 0,
          avgL2Norm: 0,
          avgLinfNorm: 0,
          lastAttackTime: null
        }
      }),

      /**
       * 删除单个历史记录
       */
      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter(item => item.id !== id)
      })),

      /**
       * 添加模板
       */
      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, {
          ...template,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        }]
      })),

      /**
       * 更新模板
       */
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(template => 
          template.id === id ? { ...template, ...updates } : template
        )
      })),

      /**
       * 删除模板
       */
      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(t => t.id !== templateId)
      })),

      /**
       * 获取模板
       */
      getTemplate: (templateId) => {
        return get().templates.find(t => t.id === templateId);
      },

      /**
       * 设置当前模板
       */
      setCurrentTemplate: (templateId) => set({ currentTemplateId: templateId }),

      /**
       * 获取当前模板参数
       */
      getCurrentTemplateParams: () => {
        const { templates, currentTemplateId } = get();
        const template = templates.find(t => t.id === currentTemplateId);
        return template ? template.params : templates[0].params;
      },

      /**
       * 按标签搜索模板
       */
      getTemplatesByTag: (tag) => {
        return get().templates.filter(t => t.tags && t.tags.includes(tag));
      },

      /**
       * 更新设置
       */
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      /**
       * 获取成功率
       */
      getSuccessRate: () => {
        const { stats } = get();
        if (stats.totalAttacks === 0) return 0;
        return (stats.successfulAttacks / stats.totalAttacks) * 100;
      },

      /**
       * 获取最近的成功记录
       */
      getRecentSuccesses: (limit = 5) => {
        const { history } = get();
        return history
          .filter(record => record.success)
          .slice(0, limit);
      },

      /**
       * 导出数据
       */
      exportData: () => {
        const state = get();
        return {
          history: state.history,
          templates: state.templates,
          settings: state.settings,
          stats: state.stats,
          exportTime: new Date().toISOString(),
          version: '1.0'
        };
      },

      /**
       * 导入数据
       */
      importData: (data) => {
        if (data.history) {
          set((state) => ({ 
            history: [...state.history, ...data.history].slice(0, state.settings.maxHistoryItems) 
          }));
        }
        if (data.templates) {
          set((state) => ({ 
            templates: [...state.templates, ...data.templates] 
          }));
        }
        if (data.settings) {
          set((state) => ({ 
            settings: { ...state.settings, ...data.settings } 
          }));
        }
        message.success('数据导入成功');
      },

      /**
       * 重置所有数据
       */
      resetAll: () => {
        const defaultTemplates = get().templates.filter(t => 
          ['default', 'aggressive', 'stealth', 'fast', 'targeted', 'l2_attack'].includes(t.id)
        );
        
        set({
          history: [],
          templates: defaultTemplates,
          currentTemplateId: 'default',
          settings: {
            defaultMode: 'sync',
            autoSave: true,
            showAdvanced: false,
            maxHistoryItems: 50,
            defaultNorm: 'linf',
            enableNotifications: true,
            defaultEpsilon: 0.03,
            defaultAlpha: 0.01,
            defaultIterations: 40
          },
          stats: {
            totalAttacks: 0,
            successfulAttacks: 0,
            failedAttacks: 0,
            avgTimeElapsed: 0,
            avgL2Norm: 0,
            avgLinfNorm: 0,
            lastAttackTime: null
          }
        });
        message.success('已重置所有数据');
      }
    }),
    {
      name: 'pgd-attack-storage', // localStorage key
      partialize: (state) => ({ 
        templates: state.templates,
        history: state.history,
        settings: state.settings,
        stats: state.stats,
        currentTemplateId: state.currentTemplateId
      }),
      version: 1
    }
  )
);

export default usePGDAttackStore;