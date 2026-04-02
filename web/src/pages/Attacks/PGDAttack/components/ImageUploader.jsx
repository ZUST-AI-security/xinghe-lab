/**
 * PGD攻击图片上传组件
 * 支持拖拽上传、预览、格式验证
 */

import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Upload, message, Image, Progress, Typography } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Dragger } = Upload;
const { Text } = Typography;

const UploadContainer = styled.div`
  .ant-upload-drag {
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    background: #fafafa;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.3s;
    
    &:hover {
      border-color: #1890ff;
    }
    
    &.ant-upload-drag-hover {
      border-color: #1890ff;
    }
  }
  
  .preview-container {
    position: relative;
    display: inline-block;
    width: 100%;
    
    .delete-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff4d4f;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      
      &:hover {
        background: #ff7875;
      }
    }
  }
`;

const ImageUploader = forwardRef(({ onImageChange, disabled = false, maxSize = 10 }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // 验证文件
  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      message.error('只支持 JPEG、PNG、WebP 格式的图片');
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }

    return true;
  };

  // 转换为Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理上传
  const handleUpload = useCallback(async (file) => {
    if (!validateFile(file)) {
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    // 模拟进度
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      // 转换Base64
      const base64 = await fileToBase64(file);
      
      clearInterval(interval);
      setUploadProgress(100);
      
      // 设置预览
      setPreviewUrl(URL.createObjectURL(file));
      setImageFile(file);
      
      // 回调
      if (onImageChange) {
        onImageChange(file, base64);
      }
      
      message.success('图片上传成功');
    } catch (error) {
      clearInterval(interval);
      message.error('图片处理失败');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }

    return false;
  }, [onImageChange, maxSize]);

  // 删除图片
  const handleDelete = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setImageFile(null);
    if (onImageChange) {
      onImageChange(null, null);
    }
    message.info('图片已删除');
  };

  // 暴露方法
  useImperativeHandle(ref, () => ({
    clear: handleDelete,
    getFile: () => imageFile
  }));

  return (
    <UploadContainer>
      {previewUrl ? (
        <div className="preview-container">
          <Image
            src={previewUrl}
            alt="预览图片"
            style={{ 
              width: '100%', 
              maxHeight: 300, 
              objectFit: 'contain',
              borderRadius: 8
            }}
            preview={false}
          />
          <button 
            className="delete-btn"
            onClick={handleDelete}
            disabled={disabled}
          >
            <DeleteOutlined />
          </button>
          
          {imageFile && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
              </Text>
            </div>
          )}
        </div>
      ) : (
        <Dragger
          name="image"
          multiple={false}
          beforeUpload={handleUpload}
          disabled={disabled || uploading}
          showUploadList={false}
          accept="image/jpeg,image/png,image/jpg,image/webp"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            点击或拖拽图片到此区域上传
          </p>
          <p className="ant-upload-hint">
            支持 JPEG、PNG、WebP 格式，单个文件不超过 {maxSize}MB
          </p>
        </Dragger>
      )}
      
      {uploading && (
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={uploadProgress} 
            status={uploadProgress === 100 ? 'success' : 'active'}
            size="small"
          />
        </div>
      )}
    </UploadContainer>
  );
});

ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;