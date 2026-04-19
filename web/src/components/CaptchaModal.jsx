import React, { useState } from 'react';
import { Modal, Input, message, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../api/client';

const CaptchaModal = ({ open, onVerify, onCancel }) => {
    const [captchaId, setCaptchaId] = useState('');
    const [captchaImage, setCaptchaImage] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const loadCaptcha = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/v1/captcha/');
            setCaptchaId(res.data.captcha_id);
            setCaptchaImage(res.data.image);
        } catch (error) {
            message.error("获取验证码失败");
        } finally {
            setLoading(false);
        }
    };

    // Load captcha when modal opens
    React.useEffect(() => {
        if (open) {
            loadCaptcha();
            setCode('');
        }
    }, [open]);

    const handleOk = () => {
        if (!code) {
            message.warning("请输入验证码");
            return;
        }
        onVerify({ captcha_id: captchaId, captcha_code: code });
    };

    return (
        <Modal
            title="频繁操作，请输入验证码"
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            okText="提交"
            cancelText="取消"
            maskClosable={false}
        >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {loading ? <Spin /> : (
                    <img 
                        src={captchaImage} 
                        alt="captcha" 
                        style={{ cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: 4 }}
                        onClick={loadCaptcha}
                        title="点击刷新"
                    />
                )}
                <div style={{ marginTop: 8 }}>
                    <a onClick={loadCaptcha}><ReloadOutlined /> 看不清？换一张</a>
                </div>
            </div>
            <Input 
                size="large"
                placeholder="请输入上方验证码字母或数字" 
                value={code}
                onChange={e => setCode(e.target.value)}
                onPressEnter={handleOk}
                maxLength={4}
            />
        </Modal>
    );
};

export default CaptchaModal;
