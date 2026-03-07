import React, { useRef } from 'react';
import { Card, Typography, Space, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

const ImageUploader = ({ onUpload, preview }) => {
  const fileInputRef = useRef(null);
  const { token } = useToken();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(file, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${token.colorBorderSecondary}`,
        borderRadius: 20,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = token.colorPrimary;
        e.currentTarget.style.background = `${token.colorPrimary}05`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = token.colorBorderSecondary;
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      }}
    >
      {preview ? (
        <div style={{ width: '100%', maxWidth: 300, aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
          <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
        </div>
      ) : (
        <Space direction="vertical" align="center" size={16}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justify: 'center' }}>
            <InboxOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>点击或拖拽上传图片</Text>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>支持 PNG, JPG (最大 5MB)</Paragraph>
          </div>
        </Space>
      )}
      
      <input 
        ref={fileInputRef}
        type="file" 
        style={{ display: 'none' }} 
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;
