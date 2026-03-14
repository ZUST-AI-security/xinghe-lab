/**
 * 星河智安 (XingHe ZhiAn) - 模型状态管理
 * 使用Zustand进行模型相关状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getAvailableModels, getModelStats } from '../api/models';

const useModelStore = create(
  devtools(
    (set, get) => ({
      // 状态
      models: [],
      modelStats: null,
      loading: false,
      error: null,
      selectedModel: null,

      // 获取所有模型
      fetchModels: async () => {
        set({ loading: true, error: null });
        try {
          const models = await getAvailableModels();
          set({ models, loading: false });
          
          // 设置默认选中模型
          const defaultModel = models.find(m => m.name === 'resnet100_imagenet') || models[0];
          if (defaultModel) {
            set({ selectedModel: defaultModel });
          }
          
          return models;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 获取模型统计信息
      fetchModelStats: async () => {
        try {
          const stats = await getModelStats();
          set({ modelStats: stats });
          return stats;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // 选择模型
      selectModel: (model) => {
        set({ selectedModel: model });
      },

      // 根据名称获取模型
      getModelByName: (name) => {
        const { models } = get();
        return models.find(m => m.name === name);
      },

      // 按类型过滤模型
      getModelsByType: (type) => {
        const { models } = get();
        return models.filter(m => m.type === type);
      },

      // 搜索模型
      searchModels: (query) => {
        const { models } = get();
        if (!query) return models;
        
        const lowerQuery = query.toLowerCase();
        return models.filter(m => 
          m.name.toLowerCase().includes(lowerQuery) ||
          m.display_name.toLowerCase().includes(lowerQuery) ||
          m.description.toLowerCase().includes(lowerQuery)
        );
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 重置状态
      reset: () => {
        set({
          models: [],
          modelStats: null,
          loading: false,
          error: null,
          selectedModel: null,
        });
      },
    }),
    {
      name: 'model-store',
    }
  )
);

export { useModelStore };
