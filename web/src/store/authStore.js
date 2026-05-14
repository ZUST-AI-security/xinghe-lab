import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from '../api/auth';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: true,   // 初始为 true，避免认证检查完成前短暂渲染受保护内容
      isAuthenticated: false,

      login: async (credentials) => {
        set({ loading: true });
        try {
          const response = await loginApi(credentials);
          const { access_token, refresh_token } = response;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          const user = await getCurrentUser();
          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            loading: false,
            isAuthenticated: true,
          });
          return { success: true, user };
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ loading: true });
        try {
          await registerApi(userData);
          const result = await useAuthStore.getState().login({
            username: userData.username,
            password: userData.password,
          });
          set({ loading: false });
          return result;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await logoutApi();
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (!token || !refreshToken) {
          set({ isAuthenticated: false, loading: false });
          return;
        }

        set({ loading: true });
        try {
          const user = await getCurrentUser();
          set({
            user,
            token,
            refreshToken,
            loading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({
            user: null,
            token: null,
            refreshToken: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : userData,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
