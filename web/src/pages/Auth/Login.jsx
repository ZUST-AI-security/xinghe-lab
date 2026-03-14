/**
 * 星河智安 (XingHe ZhiAn) - 登录页面
 * 用户登录界面
 */

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // 处理登录
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      console.log('🔐 开始登录:', values);
      await login(values);
      console.log('✅ 登录成功，准备跳转...');
      message.success('登录成功！');
      navigate('/');
    } catch (error) {
      console.error('❌ 登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 一键填充测试账号
  const handleFillTestAccount = () => {
    form.setFieldsValue({
      username: 'admin',
      password: 'admin123'
    });
    message.info('已填充测试账号信息');
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
        }}
        styles={{
          body: { padding: '40px' }
        }}
      >
        {/* Logo和标题 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            background: 'linear-gradient(45deg, #1890ff, #722ed1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            星河智安
          </div>
          <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
            AI安全攻击可视化平台
          </div>
        </div>

        {/* 登录表单 */}
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名或邮箱' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名或邮箱"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: '48px',
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #1890ff, #722ed1)',
                border: 'none',
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="default"
              onClick={handleFillTestAccount}
              block
              icon={<ExperimentOutlined />}
              style={{
                height: '40px',
                borderRadius: '8px',
                border: '1px dashed #d9d9d9',
                background: '#fafafa',
              }}
            >
              一键填充测试账号
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '24px 0' }} />

        {/* 底部链接 */}
        <div style={{ textAlign: 'center' }}>
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <Link to="/register" style={{ color: '#1890ff' }}>
              注册账号
            </Link>
            <a href="#" style={{ color: '#8c8c8c' }}>
              忘记密码
            </a>
          </Space>
        </div>

        {/* 演示账号提示 */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#52c41a',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <ThunderboltOutlined /> 演示账号
          </div>
          <div>管理员: admin (密码: admin123)</div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#8c8c8c' }}>
            💡 点击上方"一键填充测试账号"按钮可快速填充
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
