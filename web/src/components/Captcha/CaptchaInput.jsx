/**
 * 星河智安 (XingHe ZhiAn) - 验证码组件
 * 图形验证码输入和显示
 */

import React, { useState, useEffect } from 'react';
import { Input, Space, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getCaptcha } from '../../api/captcha';

const CaptchaInput = ({ value, onChange, onCaptchaIdChange, placeholder = '验证码' }) => {
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);

  // 获取验证码
  const fetchCaptcha = async () => {
    setLoading(true);
    try {
      const response = await getCaptcha();
      const newCaptchaId = response.captcha_id;
      setCaptchaId(newCaptchaId);
      setCaptchaImage(response.image);

      // 通知父组件验证码ID变化
      if (onCaptchaIdChange) {
        onCaptchaIdChange(newCaptchaId);
      }

      // 清空输入
      if (onChange) {
        onChange('');
      }
    } catch (error) {
      message.error('获取验证码失败');
      console.error('获取验证码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  // 验证码输入变化
  const handleChange = (e) => {
    const code = e.target.value;
    if (onChange) {
      onChange(code);
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        maxLength={4}
        style={{ flex: 1 }}
      />
      <div
        onClick={fetchCaptcha}
        style={{
          cursor: 'pointer',
          border: '1px solid #d9d9d9',
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          position: 'relative',
          width: '120px',
          height: '32px',
        }}
        title="点击刷新验证码"
      >
        {captchaImage ? (
          <img
            src={captchaImage}
            alt="验证码"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <span style={{ color: '#999', fontSize: '12px' }}>加载中...</span>
        )}
        <ReloadOutlined
          style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            fontSize: '12px',
            color: '#1890ff',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '50%',
            padding: '2px',
          }}
        />
      </div>
    </Space.Compact>
  );
};

export default CaptchaInput;
