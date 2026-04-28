/**
 * C&W攻击图片上传组件
 * 支持拖拽上传、预览、格式验证
 */

import React, { useState, useCallback } from 'react';
import { Upload, Image, Progress, Typography, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

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
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // 验证文件
  const validateFile = useCallback((file) => {
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
  }, [acceptTypes, maxSize, message]);

  // 生成预览URL
  const generatePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
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
      
      // 保存文件信息
      setImageFile(file);
      
      // 回调父组件
      if (onImageChange) {
        onImageChange(file);
      }
      if (onImageIdChange) {
        onImageIdChange(file.name);
      }
      
      setUploading(false);
      message.success('图片上传成功');
    }, 1500);

    return false; // 阻止默认上传行为
  }, [onImageChange, onImageIdChange, validateFile]);

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

  return (
    <div>
      {previewUrl ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
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
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#ff4d4f',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
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
          style={{
            border: '2px dashed #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
            padding: '40px 20px',
          }}
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
    </div>
  );
};

export default ImageUploader;
