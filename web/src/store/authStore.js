/**
 * 星河智安 (XingHe ZhiAn) - 认证状态管理
 * 使用Zustand进行用户认证状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginApi, register as registerApi, getCurrentUser, logout as logoutApi } from '../api/auth';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // 状态
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      isAuthenticated: false,

      // 登录
      login: async (credentials) => {
        set({ loading: true });
        try {
          const response = await loginApi(credentials);
          const { access_token, refresh_token } = response;

          // 先存储token到localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // 获取用户信息
          const user = await getCurrentUser();
          
          console.log('🔐 登录成功，用户信息:', user);
          console.log('🎫 Token:', access_token);

          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            loading: false,
            isAuthenticated: true,
          });

          return { success: true, user };
        } catch (error) {
          console.error('❌ 登录失败:', error);
          set({ loading: false });
          throw error;
        }
      },

      // 注册
      register: async (userData) => {
        set({ loading: true });
        try {
          const response = await registerApi(userData);
          const { access_token, refresh_token } = response;

          // 先存储token到localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          // 获取用户信息
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

      // 登出
      logout: async () => {
        try {
          await logoutApi();
        } catch (error) {
          console.warn('登出请求失败:', error);
        } finally {
          // 清除状态
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });

          // 清除localStorage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      },

      // 检查认证状态
      checkAuth: async () => {
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (!token || !refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        set({ loading: true });

        try {
          // 验证token并获取用户信息
          const user = await getCurrentUser();
          set({
            user,
            token,
            refreshToken,
            loading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('认证检查失败:', error);
          // 清除无效token
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

      // 更新用户信息
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // 清除错误状态
      clearError: () => {
        set({ error: null });
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
