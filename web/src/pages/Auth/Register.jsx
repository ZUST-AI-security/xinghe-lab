import React, { useState } from 'react';
import { Form, Input, Button, Divider, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import CaptchaInput from '../../components/Captcha/CaptchaInput';
import AuroraBackground from '../../components/Aceternity/AuroraBackground';
import SpotlightCard from '../../components/Aceternity/SpotlightCard';
import FloatUp from '../../components/Aceternity/FloatUp';
import MagneticButton from '../../components/Aceternity/MagneticButton';
import Sparkles from '../../components/Aceternity/Sparkles';

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleCaptchaChange = (id) => setCaptchaId(id);

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      await register({
        ...values,
        captcha_id: captchaId,
        captcha_code: values.captcha_code,
      });
      message.success('注册成功！');
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
        <Sparkles count={40} color="rgba(124,58,237,0.18)" />

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
            <ArrowLeftOutlined style={{ fontSize: 14, color: '#7c3aed' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #1677ff, #7c3aed)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 10 }}>X</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>星河智安</span>
            </div>
          </motion.div>
        </motion.div>

        <FloatUp duration={0.7}>
          <SpotlightCard spotlightColor="rgba(124,58,237,0.04)" style={{ borderRadius: 24, width: '100%', maxWidth: 460 }}>
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
              <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.08), transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ fontSize: 38, fontWeight: 900, color: 'var(--xh-primary)', letterSpacing: '-0.03em' }}
                >
                  星河智安
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  style={{ color: 'var(--xh-text-secondary)', fontSize: 14, marginTop: 8 }}
                >
                  创建您的AI安全研究账号
                </motion.div>
              </div>

              <Form form={form} name="register" onFinish={handleRegister} size="large" layout="vertical">
                <Form.Item name="username" rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}>
                  <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
                </Form.Item>
                <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}>
                  <Input prefix={<MailOutlined />} placeholder="邮箱地址" autoComplete="email" />
                </Form.Item>
                <Form.Item name="full_name" rules={[{ required: true, message: '请输入姓名' }, { max: 50, message: '姓名最多50个字符' }]}>
                  <Input prefix={<UserOutlined />} placeholder="姓名" autoComplete="name" />
                </Form.Item>
                <Form.Item name="password" rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8个字符' },
                  { validator: (_, v) => (!v || /\d/.test(v)) ? Promise.resolve() : Promise.reject(new Error('密码必须包含至少一个数字')) },
                  { validator: (_, v) => (!v || /[a-z]/.test(v)) ? Promise.resolve() : Promise.reject(new Error('密码必须包含至少一个小写字母')) },
                  { validator: (_, v) => (!v || /[A-Z]/.test(v)) ? Promise.resolve() : Promise.reject(new Error('密码必须包含至少一个大写字母')) },
                ]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="new-password" />
                </Form.Item>
                <Form.Item name="confirm_password" dependencies={['password']} rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({ validator(_, v) { if (!v || getFieldValue('password') === v) return Promise.resolve(); return Promise.reject(new Error('两次输入的密码不一致')); } }),
                ]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="确认密码" autoComplete="new-password" />
                </Form.Item>
                <Form.Item name="captcha_code" rules={[{ required: true, message: '请输入验证码' }, { len: 5, message: '验证码为5位字符' }]}>
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
                        background: 'linear-gradient(135deg, #7c3aed 0%, #1677ff 100%)',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {loading ? '注册中...' : '注册账号'}
                    </Button>
                  </MagneticButton>
                </Form.Item>
              </Form>

              <Divider style={{ margin: '20px 0' }} />

              <div style={{ textAlign: 'center' }}>
                <Link to="/login" style={{ color: 'var(--xh-primary)', fontWeight: 500 }}>已有账号？立即登录</Link>
              </div>

              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: 'var(--xh-primary-soft)',
                border: '1px solid var(--xh-primary)',
                borderRadius: 12, fontSize: 12, color: 'var(--xh-primary)',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 6 }}><UserAddOutlined /> 注册说明</div>
                <div>• 密码需包含大小写字母和数字</div>
                <div>• 邮箱将用于账号验证和找回密码</div>
                <div>• 注册后即可使用所有AI安全功能</div>
              </div>
            </div>
          </SpotlightCard>
        </FloatUp>
      </div>
    </AuroraBackground>
  );
};

export default Register;
