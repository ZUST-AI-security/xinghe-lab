import React from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

const ImageUploader = ({ value, onChange, disabled = false }) => {
  const props = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return Upload.LIST_IGNORE;
      }
      
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过5MB!');
        return Upload.LIST_IGNORE;
      }
      
      onChange(file);
      return false; // 阻止自动上传
    },
    disabled
  };
  
  return (
    <div>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
        <p className="ant-upload-hint">
          支持单张图片上传，大小不超过5MB
        </p>
        </Dragger>
        {value && (
          <div style={{ marginTop: 16 }}>
            <img 
              src={URL.createObjectURL(value)} 
              alt="Uploaded"
              style={{ width: '100%' }}
            />
          </div>
        )}      
    </div>
  );
};

export default ImageUploader;