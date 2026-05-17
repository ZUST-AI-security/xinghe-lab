import React, { useState } from 'react';
import { Form, Input, Button, Divider, Space, App } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import CaptchaInput from '../../components/Captcha/CaptchaInput';
import AuroraBackground from '../../components/Aceternity/AuroraBackground';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import FloatUp from '../../components/Aceternity/FloatUp';
import MagneticButton from '../../components/Aceternity/MagneticButton';
import Sparkles from '../../components/Aceternity/Sparkles';

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleCaptchaChange = (id) => setCaptchaId(id);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await login({
        ...values,
        captcha_id: captchaId,
        captcha_code: values.captcha_code,
      });
      message.success('登录成功！');
      navigate('/');
    } catch {
      // error handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground showRadialGradient={false} style={{ background: 'var(--xh-bg)' }}>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
        <Sparkles count={50} color="rgba(22,119,255,0.2)" />

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ position: 'absolute', top: 28, left: 28, zIndex: 10 }}
        >
          <motion.div
            onClick={() => navigate('/')}
            whileHover={{ x: -4, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '8px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: 14, color: '#1677ff' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #1677ff, #7c3aed)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 10 }}>X</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>星河智安</span>
            </div>
          </motion.div>
        </motion.div>

        <FloatUp duration={0.7}>
          <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24, width: '100%', maxWidth: 420 }}>
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 24,
              padding: 'clamp(32px, 5vw, 48px)',
              boxShadow: '0 8px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.6)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative orbs */}
              <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.1), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)', pointerEvents: 'none' }} />

              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ fontSize: 38, fontWeight: 900, color: 'var(--xh-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  星河智安
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  style={{ color: 'var(--xh-text-secondary)', fontSize: 14, marginTop: 8 }}
                >
                  AI安全攻击可视化平台
                </motion.div>
              </div>

              {/* Form */}
              <Form form={form} name="login" onFinish={handleLogin} size="large" layout="vertical">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名或邮箱' }]}>
                  <Input prefix={<UserOutlined />} placeholder="用户名或邮箱" autoComplete="username" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                  name="captcha_code"
                  rules={[{ required: true, message: '请输入验证码' }, { len: 5, message: '验证码为5位字符' }]}
                >
                  <CaptchaInput placeholder="验证码" onCaptchaIdChange={handleCaptchaChange} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 16 }}>
                  <MagneticButton style={{ width: '100%' }} strength={0.15} maxDistance={30}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      style={{
                        height: 52,
                        borderRadius: 14,
                        fontWeight: 700,
                        fontSize: 16,
                        border: 'none',
                        background: 'linear-gradient(135deg, #1677ff 0%, #7c3aed 100%)',
                        boxShadow: '0 4px 20px rgba(22,119,255,0.35)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {loading ? '登录中...' : '登 录'}
                    </Button>
                  </MagneticButton>
                </Form.Item>
              </Form>

              <Divider style={{ margin: '20px 0' }} />

              <div style={{ textAlign: 'center' }}>
                <Space split={<span style={{ color: 'var(--xh-border)' }}>|</span>}>
                  <Link to="/register" style={{ color: 'var(--xh-primary)', fontWeight: 500 }}>注册账号</Link>
                  <span style={{ color: 'var(--xh-text-secondary)' }}>忘记密码</span>
                </Space>
              </div>
            </div>
          </SpotlightCard>
        </FloatUp>
      </div>
    </AuroraBackground>
  );
};

export default Login;
