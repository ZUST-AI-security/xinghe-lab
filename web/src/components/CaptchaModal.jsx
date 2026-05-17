import React, { useState } from 'react';
import { Modal, Input, Spin, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getCaptcha } from '../api/captcha';

const CaptchaModal = ({ open, onVerify, onCancel }) => {
    const { message } = App.useApp();
    const [captchaId, setCaptchaId] = useState('');
    const [captchaImage, setCaptchaImage] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const loadCaptcha = async () => {
        setLoading(true);
        try {
            const data = await getCaptcha();
            setCaptchaId(data.captcha_id);
            setCaptchaImage(data.image);
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
                        alt="图形验证码，点击刷新"
                        style={{ cursor: 'pointer', border: '1px solid var(--xh-border)', borderRadius: 4 }}
                        onClick={loadCaptcha}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            loadCaptcha();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="点击刷新验证码"
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
                maxLength={5}
            />
        </Modal>
    );
};

export default CaptchaModal;
