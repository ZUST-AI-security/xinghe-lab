import React, { useEffect, useState } from 'react';
import { Layout, Spin, message } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';

import CaptchaModal from './components/CaptchaModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import MainLayout from './components/Layout/MainLayout';
import { setupAxiosInterceptors } from './api/client';
import { useAuthStore } from './store/authStore';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';
import TaskHistory from './pages/Dashboard/TaskHistory';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import AttackHistory from './pages/Admin/AttackHistory';
import SystemLogs from './pages/Admin/SystemLogs';
import SystemConfig from './pages/Admin/SystemConfig';
import CWAttack from './pages/Attacks/CWAttack';
import PGDAttack from './pages/Attacks/PGDAttack';
import FGSMAttack from './pages/Attacks/FGSMAttack';
import IFGSMAttack from './pages/Attacks/IFGSMAttack';
import DeepFoolAttack from './pages/Attacks/DeepFoolAttack';
import CompareMode from './pages/Attacks/CompareMode';

const FullPageSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <Spin size="large" />
  </div>
);

const EmptyState = ({ title, description }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 20,
      padding: 32,
      border: '1px solid #e5e7eb',
    }}
  >
    <h2 style={{ marginTop: 0 }}>{title}</h2>
    <p style={{ marginBottom: 0, color: '#64748b' }}>{description}</p>
  </div>
);

function App() {
  const { user, loading, checkAuth, isAuthenticated } = useAuthStore();
  const [captchaVisible, setCaptchaVisible] = useState(false);

  useEffect(() => {
    setupAxiosInterceptors();
    checkAuth();
    const handleCaptcha = () => setCaptchaVisible(true);
    window.addEventListener('showCaptcha', handleCaptcha);
    return () => window.removeEventListener('showCaptcha', handleCaptcha);
  }, [checkAuth]);

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
            path="/*"
            element={(
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                </MainLayout>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
