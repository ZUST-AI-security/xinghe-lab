import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, login, logout, loading, checkAuth } = useAuthStore();
  
  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    loading,
    checkAuth
  };
};
