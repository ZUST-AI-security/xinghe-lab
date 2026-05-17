import React, { useState, useCallback } from 'react';
import { Upload, Image, Progress, Typography, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Dragger } = Upload;
const { Text } = Typography;

const S = {
  previewWrap: { position: 'relative', display: 'inline-block' },
  previewImage: { maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--xh-border)' },
  deleteBtn: {
    position: 'absolute', top: -8, right: -8,
    background: 'var(--xh-error)', color: '#fff', border: 'none', borderRadius: '50%',
    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  fileInfo: { marginTop: 8, textAlign: 'center' },
  smallText: { fontSize: 12 },
  dragger: {
    border: '2px dashed var(--xh-border)', borderRadius: 12,
    background: 'var(--xh-bg)', padding: '40px 20px',
    transition: 'border-color 0.3s, background 0.3s',
  },
  draggerHover: {
    borderColor: 'var(--xh-primary)',
    background: 'var(--xh-primary-soft)',
  },
  uploadIcon: { fontSize: 48, color: 'var(--xh-primary)' },
  progressWrap: { marginTop: 16 },
};

const ImageUploader = ({
  onImageChange, onImageIdChange, disabled = false, maxSize = 10,
  acceptTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = '点击或拖拽图片到此区域上传',
}) => {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = useCallback((file) => {
    if (!acceptTypes.includes(file.type)) {
      message.error('只支持 JPEG、PNG、WebP 格式的图片');
      return false;
    }
    if (file.size / 1024 / 1024 >= maxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }
    return true;
  }, [acceptTypes, maxSize, message]);

  const generatePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = useCallback((file) => {
    if (!validateFile(file)) return false;
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + 10;
      });
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      generatePreview(file);
      setImageFile(file);
      onImageChange?.(file);
      onImageIdChange?.(file.name);
      setUploading(false);
      message.success('图片上传成功');
    }, 1500);

    return false;
  }, [onImageChange, onImageIdChange, validateFile]);

  const handleDelete = () => {
    setPreviewUrl(null);
    setImageFile(null);
    setUploadProgress(0);
    onImageChange?.(null);
    onImageIdChange?.(null);
    message.info('图片已删除');
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={S.previewWrap}
          >
            <Image src={previewUrl} alt="已上传的攻击目标图片预览" style={S.previewImage} />
            <button
              type="button" onClick={handleDelete} disabled={disabled}
              aria-label="删除已上传图片"
              style={{ ...S.deleteBtn, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              <DeleteOutlined />
            </button>
            {imageFile && (
              <div style={S.fileInfo}>
                <Text type="secondary" style={S.smallText}>
                  {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                </Text>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="uploader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dragger
              name="image" multiple={false} beforeUpload={handleUpload}
              disabled={disabled || uploading} showUploadList={false}
              accept={acceptTypes.join(',')}
              style={{ ...S.dragger, ...(isDragOver ? S.draggerHover : {}) }}
              onDragEnter={() => setIsDragOver(true)}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={() => setIsDragOver(false)}
            >
              <p className="ant-upload-drag-icon">
                <motion.div
                  animate={isDragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <InboxOutlined style={S.uploadIcon} />
                </motion.div>
              </p>
              <p className="ant-upload-text">{placeholder}</p>
              <p className="ant-upload-hint">
                支持 JPEG、PNG、WebP 格式，单个文件不超过 {maxSize}MB
              </p>
            </Dragger>
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={S.progressWrap}
        >
          <Progress percent={uploadProgress} status={uploadProgress === 100 ? 'success' : 'active'} size="small" strokeColor={{ from: '#1677ff', to: '#7c3aed' }} />
          <Text type="secondary" style={S.smallText}>正在上传图片...</Text>
        </motion.div>
      )}
    </div>
  );
};

export default ImageUploader;
