/**
 * C&W攻击图片上传组件
 * 支持拖拽上传、预览、格式验证
 */

import React, { useState, useCallback } from 'react';
import { Upload, message, Image, Progress, Typography, Button } from 'antd';
import { InboxOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import ImageLibrary from '../../../../components/upload/ImageLibrary';
import { uploadImage } from '../../../../api/files';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // 从图片库选择
  const handleLibrarySelect = (dataUrl) => {
    setPreviewUrl(dataUrl);
    const pseudoFile = new File([''], 'library-image.png', { type: 'image/png' });
    pseudoFile._dataUrl = dataUrl;
    setImageFile(pseudoFile);
    if (onImageChange) {
      onImageChange(pseudoFile, dataUrl);
    }
    if (onImageIdChange) {
      onImageIdChange(pseudoFile.name);
    }
  };

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
  }, [acceptTypes, maxSize]);

  // 处理文件上传
  const handleUpload = useCallback((file) => {
    if (!validateFile(file)) {
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setUploadProgress(50);

      // 记录到后端文件库（静默，不阻塞主流程）
      try {
        await uploadImage(dataUrl, file.name, file.type || 'image/png');
      } catch {
        // 上传记录失败不影响攻击流程
      }

      setUploadProgress(100);
      setPreviewUrl(dataUrl);
      setImageFile(file);

      if (onImageChange) {
        onImageChange(file, dataUrl);
      }
      if (onImageIdChange) {
        onImageIdChange(file.name);
      }

      setUploading(false);
      message.success('图片上传成功');
    };
    reader.readAsDataURL(file);

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

      {!disabled && !previewUrl && (
        <div style={{ marginTop: 8 }}>
          <Button
            type="dashed"
            icon={<FolderOpenOutlined />}
            size="small"
            onClick={() => setLibraryOpen(true)}
            style={{ width: '100%' }}
          >
            从图片库选择
          </Button>
        </div>
      )}

      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
};

export default ImageUploader;
