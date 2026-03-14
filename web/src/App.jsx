/**
 * 星河智安 (XingHe ZhiAn) - 主应用组件
 * AI安全攻击可视化平台的核心应用
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { useAuthStore } from './store/authStore';

// 布局组件
import MainLayout from './components/Layout/MainLayout';

// 页面组件
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';
import CWAttack from './pages/Attacks/CWAttack';

// API客户端
import { setupAxiosInterceptors } from './api/client';

const { Content } = Layout;

function App() {
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();

  // 应用初始化
  useEffect(() => {
    console.log('🚀 App初始化，检查认证状态...');
    // 设置Axios拦截器
    setupAxiosInterceptors();
    
    // 检查用户认证状态
    checkAuth();
  }, [checkAuth]);

  // 显示加载状态
  if (loading) {
    console.log('⏳ 显示加载状态...');
    return (
      <div className="flex-center full-height">
        <Spin size="large" />
      </div>
    );
  }

  console.log('📊 App状态:', { user: user?.username, isAuthenticated, loading });

  // 受保护的路由组件
  const ProtectedRoute = ({ children }) => {
    console.log('🛡️ ProtectedRoute检查:', { user: user?.username, isAuthenticated });
    if (!user || !isAuthenticated) {
      console.log('🔄 重定向到登录页');
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <ErrorBoundary>
      <Layout className="app-layout">
        <Routes>
          {/* 公开路由 */}
          <Route 
            path="/login" 
            element={
              user && isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              user && isAuthenticated ? <Navigate to="/" replace /> : <Register />
            } 
          />

          {/* 受保护的路由 */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Content>
                    <Routes>
                      {/* 默认路由重定向到Dashboard */}
                      <Route 
                        path="/" 
                        element={<Navigate to="/dashboard" replace />} 
                      />
                      
                      {/* Dashboard主页 */}
                      <Route 
                        path="/dashboard" 
                        element={<Dashboard />} 
                      />
                      
                      {/* 攻击算法页面 */}
                      <Route 
                        path="/attacks/cw" 
                        element={<CWAttack />} 
                      />
                      
                      {/* 其他攻击算法页面（预留） */}
                      <Route 
                        path="/attacks/*" 
                        element={
                          <div className="content-card">
                            <h2>功能开发中</h2>
                            <p>更多攻击算法正在开发中，敬请期待...</p>
                          </div>
                        } 
                      />
                      
                      {/* 404页面 */}
                      <Route 
                        path="*" 
                        element={
                          <div className="content-card text-center">
                            <h2>页面未找到</h2>
                            <p>您访问的页面不存在</p>
                          </div>
                        } 
                      />
                    </Routes>
                  </Content>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
