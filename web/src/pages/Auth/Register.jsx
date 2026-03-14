/**
 * 星河智安 (XingHe ZhiAn) - 注册页面
 * 用户注册界面
 */

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  // 处理注册
  const handleRegister = async (values) => {
    setLoading(true);
    try {
      await register(values);
      message.success('注册成功！');
      navigate('/');
    } catch (error) {
      // 错误信息已在API拦截器中处理
      console.error('注册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card
        style={{
          width: 450,
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
            创建您的AI安全研究账号
          </div>
        </div>

        {/* 注册表单 */}
        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱地址"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="full_name"
            rules={[
              { required: true, message: '请输入姓名' },
              { max: 50, message: '姓名最多50个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="姓名"
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8个字符' },
              {
                validator: (_, value) => {
                  if (!value || /\d/.test(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('密码必须包含至少一个数字'));
                },
              },
              {
                validator: (_, value) => {
                  if (!value || /[a-z]/.test(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('密码必须包含至少一个小写字母'));
                },
              },
              {
                validator: (_, value) => {
                  if (!value || /[A-Z]/.test(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('密码必须包含至少一个大写字母'));
                },
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              autoComplete="new-password"
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
              {loading ? '注册中...' : '注册账号'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '24px 0' }} />

        {/* 底部链接 */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#1890ff' }}>
            已有账号？立即登录
          </Link>
        </div>

        {/* 注册说明 */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f8ff',
          border: '1px solid #91d5ff',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#1890ff',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <UserAddOutlined /> 注册说明
          </div>
          <div>• 密码需包含大小写字母和数字</div>
          <div>• 邮箱将用于账号验证和找回密码</div>
          <div>• 注册后即可使用所有AI安全功能</div>
        </div>
      </Card>
    </div>
  );
};

export default Register;
