import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Layout, Spin, App as AntApp } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';

import CaptchaModal from './components/CaptchaModal';
import ErrorBoundary from './components/Common/ErrorBoundary';
import MainLayout from './components/Layout/MainLayout';
import { setupAxiosInterceptors, setGlobalMessage } from './api/client';
import { useAuthStore } from './store/authStore';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TaskHistory = lazy(() => import('./pages/Dashboard/TaskHistory'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const AttackHistory = lazy(() => import('./pages/Admin/AttackHistory'));
const SystemLogs = lazy(() => import('./pages/Admin/SystemLogs'));
const SystemConfig = lazy(() => import('./pages/Admin/SystemConfig'));
const CWAttack = lazy(() => import('./pages/Attacks/CWAttack'));
const PGDAttack = lazy(() => import('./pages/Attacks/PGDAttack'));
const FGSMAttack = lazy(() => import('./pages/Attacks/FGSMAttack'));
const IFGSMAttack = lazy(() => import('./pages/Attacks/IFGSMAttack'));
const DeepFoolAttack = lazy(() => import('./pages/Attacks/DeepFoolAttack'));
const CompareMode = lazy(() => import('./pages/Attacks/CompareMode'));

const FullPageSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <Spin size="large" />
  </div>
);

const EmptyState = ({ title, description }) => (
  <div
    style={{
      background: 'var(--xh-surface)',
      borderRadius: 20,
      padding: 32,
      border: '1px solid var(--xh-border)',
    }}
  >
    <h2 style={{ marginTop: 0 }}>{title}</h2>
    <p style={{ marginBottom: 0, color: 'var(--xh-text-secondary)' }}>{description}</p>
  </div>
);

const PageSpinner = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
    <Spin size="large" />
  </div>
);

function App() {
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const { message } = AntApp.useApp();

  useEffect(() => {
    setGlobalMessage(message);
    setupAxiosInterceptors();
    checkAuth();
    const handleCaptcha = () => setCaptchaVisible(true);
    window.addEventListener('showCaptcha', handleCaptcha);
    return () => window.removeEventListener('showCaptcha', handleCaptcha);
  }, [checkAuth, message]);

  const handleCaptchaVerify = ({ captcha_id, captcha_code }) => {
    sessionStorage.setItem('captcha_id', captcha_id);
    sessionStorage.setItem('captcha_code', captcha_code);
    setCaptchaVisible(false);
    message.success('验证码通过，请重试刚才的操作。');
  };

  const ProtectedRoute = ({ children }) => {
    if (!user || !isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const AdminRoute = ({ children }) => {
    if (!user || !isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <ErrorBoundary>
      <Layout className="app-layout">
        <CaptchaModal
          open={captchaVisible}
          onVerify={handleCaptchaVerify}
          onCancel={() => setCaptchaVisible(false)}
        />

        <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route
            path="/login"
            element={user && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/"
            element={<Landing />}
          />

          <Route
            path="/*"
            element={(
              <ProtectedRoute>
                <MainLayout>
                  <Suspense fallback={<PageSpinner />}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks/history" element={<TaskHistory />} />

                    <Route path="/attacks/fgsm" element={<FGSMAttack />} />
                    <Route path="/attacks/ifgsm" element={<IFGSMAttack />} />
                    <Route path="/attacks/pgd" element={<PGDAttack />} />
                    <Route path="/attacks/cw" element={<CWAttack />} />
                    <Route path="/attacks/deepfool" element={<DeepFoolAttack />} />
                    <Route path="/attacks/compare" element={<CompareMode />} />

                    <Route
                      path="/admin/dashboard"
                      element={(
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      )}
                    />
                    <Route
                      path="/admin/users"
                      element={(
                        <AdminRoute>
                          <UserManagement />
                        </AdminRoute>
                      )}
                    />
                    <Route
                      path="/admin/attack-history"
                      element={(
                        <AdminRoute>
                          <AttackHistory />
                        </AdminRoute>
                      )}
                    />
                    <Route
                      path="/admin/logs"
                      element={(
                        <AdminRoute>
                          <SystemLogs />
                        </AdminRoute>
                      )}
                    />
                    <Route
                      path="/admin/config"
                      element={(
                        <AdminRoute>
                          <SystemConfig />
                        </AdminRoute>
                      )}
                    />

                    <Route
                      path="*"
                      element={(
                        <EmptyState
                          title="页面未找到"
                          description="当前地址没有对应内容，请从左侧导航重新进入。"
                        />
                      )}
                    />
                  </Routes>
                  </Suspense>
                </MainLayout>
              </ProtectedRoute>
            )}
          />
        </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
