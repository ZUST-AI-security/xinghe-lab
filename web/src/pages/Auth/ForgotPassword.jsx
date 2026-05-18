import React, { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forgotPassword } from '../../api/auth';
import AuroraBackground from '../../components/Aceternity/AuroraBackground';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import FloatUp from '../../components/Aceternity/FloatUp';
import MagneticButton from '../../components/Aceternity/MagneticButton';
import Sparkles from '../../components/Aceternity/Sparkles';

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { message } = App.useApp();

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setEmail(values.email);
      setSent(true);
      message.success('验证码已发送到您的邮箱');
      startCountdown();
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await forgotPassword(email);
      message.success('验证码已重新发送');
      startCountdown();
    } catch { /* */ } finally {
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
            onClick={() => navigate('/login')}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>返回登录</span>
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
                  忘记密码
                </motion.div>
              </div>

              {!sent ? (
                <Form form={form} name="forgot" onFinish={handleSubmit} size="large" layout="vertical">
                  <div style={{ fontSize: 14, color: 'var(--xh-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                    输入您注册时使用的邮箱，我们将发送验证码到该邮箱。
                  </div>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: '请输入注册邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" autoComplete="email" />
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
                        {loading ? '发送中...' : '发送验证码'}
                      </Button>
                    </MagneticButton>
                  </Form.Item>
                </Form>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                      background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <CheckCircleOutlined style={{ fontSize: 28, color: '#16a34a' }} />
                    </div>
                  </motion.div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--xh-text)', marginBottom: 8 }}>
                    验证码已发送
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--xh-text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                    验证码已发送至 <span style={{ fontWeight: 600, color: 'var(--xh-text)' }}>{email}</span>，
                    请查收邮件并输入验证码。
                  </div>

                  <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)',
                    fontSize: 12, color: '#92400e', lineHeight: 1.6, marginBottom: 24,
                    textAlign: 'left',
                  }}>
                    没有收到邮件？请检查垃圾邮件文件夹，或点击下方按钮重新发送。
                  </div>

                  <MagneticButton style={{ width: '100%' }} strength={0.15} maxDistance={30}>
                    <Button
                      type="primary"
                      onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
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
                      输入验证码
                    </Button>
                  </MagneticButton>

                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="link"
                      disabled={countdown > 0}
                      onClick={handleResend}
                      loading={loading}
                      style={{ fontSize: 13 }}
                    >
                      {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SpotlightCard>
        </FloatUp>
      </div>
    </AuroraBackground>
  );
};

export default ForgotPassword;
