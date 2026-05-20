import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from '../api/auth';

// 根据 remember_me 选择存储位置
const getTokenStorage = (rememberMe) => {
  if (rememberMe) return localStorage;
  return sessionStorage;
};

// 获取当前存储 token 的 storage（优先 localStorage，其次 sessionStorage）
const getActiveStorage = () => {
  if (localStorage.getItem('access_token')) return localStorage;
  if (sessionStorage.getItem('access_token')) return sessionStorage;
  return localStorage; // fallback
};

// 清除两个存储中的 token
const clearAllTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      isAuthenticated: false,
      rememberMe: false,

      login: async (credentials) => {
        set({ loading: true });
        try {
          const rememberMe = credentials.remember_me || false;
          const response = await loginApi(credentials);
          const { access_token, refresh_token } = response;

          const storage = getTokenStorage(rememberMe);
          storage.setItem('access_token', access_token);
          storage.setItem('refresh_token', refresh_token);

          const user = await getCurrentUser();
          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            loading: false,
            isAuthenticated: true,
            rememberMe,
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
          // 注册接口直接返回 token
          const response = await registerApi(userData);
          const { access_token, refresh_token } = response;

          // 注册默认不记住登录
          const storage = getTokenStorage(false);
          storage.setItem('access_token', access_token);
          storage.setItem('refresh_token', refresh_token);

          const user = await getCurrentUser();
          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            loading: false,
            isAuthenticated: true,
            rememberMe: false,
          });
          return { success: true, user };
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await logoutApi();
        } finally {
          clearAllTokens();
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            rememberMe: false,
          });
        }
      },

      checkAuth: async () => {
        const storage = getActiveStorage();
        const token = storage.getItem('access_token');
        const refreshToken = storage.getItem('refresh_token');
        if (!token || !refreshToken) {
          clearAllTokens();
          set({ isAuthenticated: false, loading: false });
          return;
        }

        // 判断当前是 localStorage 还是 sessionStorage
        const isRememberMe = !!localStorage.getItem('access_token');

        set({ loading: true });
        try {
          const user = await getCurrentUser();
          set({
            user,
            token,
            refreshToken,
            loading: false,
            isAuthenticated: true,
            rememberMe: isRememberMe,
          });
        } catch (error) {
          clearAllTokens();
          set({
            user: null,
            token: null,
            refreshToken: null,
            loading: false,
            isAuthenticated: false,
            rememberMe: false,
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
        rememberMe: state.rememberMe,
      }),
    }
  )
);

export { useAuthStore };
