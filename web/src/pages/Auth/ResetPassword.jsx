import React, { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { LockOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resetPassword } from '../../api/auth';
import AuroraBackground from '../../components/Aceternity/AuroraBackground';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import FloatUp from '../../components/Aceternity/FloatUp';
import MagneticButton from '../../components/Aceternity/MagneticButton';
import Sparkles from '../../components/Aceternity/Sparkles';

const ResetPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleReset = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(values.email, values.code, values.new_password);
      message.success('密码重置成功，请使用新密码登录');
      navigate('/login');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground showRadialGradient={false} style={{ background: 'var(--xh-bg)' }}>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
        <Sparkles count={50} color="rgba(22,119,255,0.2)" />

        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ position: 'absolute', top: 28, left: 28, zIndex: 10 }}
        >
          <motion.div
            onClick={() => navigate('/forgot-password')}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>返回</span>
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
              <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.1), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)', pointerEvents: 'none' }} />

              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <img src="/logo.png" alt="星河智安" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12, boxShadow: '0 4px 20px rgba(22,119,255,0.2)' }} />
                </motion.div>
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
                  重置密码
                </motion.div>
              </div>

              <Form form={form} name="reset" onFinish={handleReset} size="large" layout="vertical"
                initialValues={{ email: emailFromUrl }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input prefix={<SafetyOutlined />} placeholder="注册邮箱" />
                </Form.Item>

                <Form.Item
                  name="code"
                  rules={[
                    { required: true, message: '请输入验证码' },
                    { len: 6, message: '验证码为6位数字' },
                  ]}
                >
                  <Input prefix={<SafetyOutlined />} placeholder="6位验证码" maxLength={6} style={{ letterSpacing: 4, fontWeight: 600 }} />
                </Form.Item>

                <Form.Item
                  name="new_password"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 8, message: '密码至少8位' },
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="新密码（至少8位，含大小写字母和数字）" />
                </Form.Item>

                <Form.Item
                  name="confirm_password"
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
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
                      {loading ? '重置中...' : '重置密码'}
                    </Button>
                  </MagneticButton>
                </Form.Item>
              </Form>
            </div>
          </SpotlightCard>
        </FloatUp>
      </div>
    </AuroraBackground>
  );
};

export default ResetPassword;
