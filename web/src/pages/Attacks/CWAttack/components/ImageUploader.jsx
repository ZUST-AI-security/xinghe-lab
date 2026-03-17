/**
 * C&W攻击图片上传组件
 * 支持拖拽上传、预览、格式验证
 */

import React, { useState, useCallback } from 'react';
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

/**
 * @typedef {Object} ImageUploaderProps
 * @property {function} onImageChange - 图片变化回调
 * @property {function} onImageIdChange - 图片ID变化回调
 * @property {boolean} disabled - 是否禁用
 * @property {number} maxSize - 最大文件大小(MB)
 * @property {string[]} acceptTypes - 接受的文件类型
 * @property {string} placeholder - 占位文本
 */

/**
 * 图片上传组件
 * @param {ImageUploaderProps} props
 */
const ImageUploader = ({
  onImageChange,
  onImageIdChange,
  disabled = false,
  maxSize = 10,
  acceptTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = '点击或拖拽图片到此区域上传'
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // 验证文件
  const validateFile = (file) => {
    // 检查文件类型
    if (!acceptTypes.includes(file.type)) {
      message.error('只支持 JPEG、PNG、WebP 格式的图片');
      return false;
    }

    // 检查文件大小
    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }

    return true;
  };

  // 生成预览URL
  const generatePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // 生成图片ID
  const generateImageId = (file) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `img_${timestamp}_${random}`;
  };

  // 处理文件上传
  const handleUpload = useCallback((file) => {
    if (!validateFile(file)) {
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    // 模拟上传完成
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // 生成预览
      generatePreview(file);
      
      // 生成图片ID
      const imageId = generateImageId(file);
      
      // 保存文件信息
      setImageFile(file);
      
      // 回调父组件
      if (onImageChange) {
        onImageChange(file);
      }
      if (onImageIdChange) {
        onImageIdChange(imageId);
      }
      
      setUploading(false);
      message.success('图片上传成功');
    }, 1500);

    return false; // 阻止默认上传行为
  }, [onImageChange, onImageIdChange, maxSize, acceptTypes]);

  // 删除图片
  const handleDelete = () => {
    setPreviewUrl(null);
    setImageFile(null);
    setUploadProgress(0);
    
    if (onImageChange) {
      onImageChange(null);
    }
    if (onImageIdChange) {
      onImageIdChange(null);
    }
    
    message.info('图片已删除');
  };

  // 转换为base64（用于API调用）
  const getBase64 = useCallback(() => {
    if (!imageFile) return null;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(imageFile);
    });
  }, [imageFile]);

  // 暴露给父组件的方法
  React.useImperativeHandle(null, () => ({
    getBase64,
    clear: handleDelete
  }));

  return (
    <UploadContainer>
      {previewUrl ? (
        <div className="preview-container">
          <Image
            src={previewUrl}
            alt="预览图片"
            style={{ 
              maxWidth: '100%', 
              maxHeight: 300, 
              objectFit: 'contain',
              borderRadius: 8
            }}
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
          accept={acceptTypes.join(',')}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            {placeholder}
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            正在上传图片...
          </Text>
        </div>
      )}
    </UploadContainer>
  );
};

export default ImageUploader;
