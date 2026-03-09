import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 定义一个持久化的 Store
export const useTestStore = create(
  persist(
    (set, get) => ({
      // 状态定义
      savedRecords: [],
      lastFormState: {
        experimentName: '',
        owner: null,
        difficulty: 50,
        status: true,
        date: null,
      },

      // 操作方法
      addRecord: (record) => {
        const { savedRecords } = get();
        set({ 
          savedRecords: [
            ...savedRecords, 
            { ...record, id: Date.now(), timestamp: new Date().toLocaleString() }
          ] 
        });
      },

      setLastFormState: (state) => {
        set({ lastFormState: { ...get().lastFormState, ...state } });
      },

      clearAll: () => {
        set({ 
          savedRecords: [], 
          lastFormState: { 
            experimentName: '', 
            owner: null, 
            difficulty: 50, 
            status: true, 
            date: null 
          } 
        });
      },
    }),
    {
      name: 'xinghe-lab-test-storage', // 存储在 localStorage 中的键名
      storage: createJSONStorage(() => localStorage), // 指定存储介质
    }
  )
);
