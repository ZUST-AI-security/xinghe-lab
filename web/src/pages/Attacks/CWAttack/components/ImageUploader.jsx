import React, { useState, useCallback } from 'react';
import { Upload, Image, Progress, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Dragger } = Upload;

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
            style={{ position: 'relative', display: 'inline-block', width: '100%' }}
          >
            <Image
              src={previewUrl} alt="已上传的攻击目标图片预览"
              style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--xh-border)' }}
            />
            <motion.button
              type="button" onClick={handleDelete} disabled={disabled}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              style={{
                position: 'absolute', top: -8, right: -8,
                background: '#ef4444', color: '#fff', border: '2px solid #fff',
                borderRadius: '50%', width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer', zIndex: 10,
                boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              }}
            >
              <DeleteOutlined style={{ fontSize: 12 }} />
            </motion.button>
            {imageFile && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--xh-text-tertiary)' }}>
                  {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
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
              style={{
                border: `2px dashed ${isDragOver ? '#1677ff' : 'var(--xh-border)'}`,
                borderRadius: 14, background: isDragOver ? 'rgba(22,119,255,0.03)' : 'var(--xh-bg)',
                padding: '36px 20px', transition: 'all 0.3s ease',
              }}
              onDragEnter={() => setIsDragOver(true)}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={() => setIsDragOver(false)}
            >
              <motion.div
                animate={isDragOver ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <InboxOutlined style={{ fontSize: 40, color: isDragOver ? '#1677ff' : 'var(--xh-text-tertiary)', transition: 'color 0.3s' }} />
              </motion.div>
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: 'var(--xh-text)' }}>{placeholder}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--xh-text-tertiary)' }}>
                支持 JPEG、PNG、WebP 格式，单个文件不超过 {maxSize}MB
              </div>
            </Dragger>
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginTop: 12 }}
        >
          <Progress percent={uploadProgress} status={uploadProgress === 100 ? 'success' : 'active'} size="small" strokeColor={{ from: '#1677ff', to: '#7c3aed' }} />
          <div style={{ fontSize: 12, color: 'var(--xh-text-tertiary)', marginTop: 4 }}>正在上传图片...</div>
        </motion.div>
      )}
    </div>
  );
};

export default ImageUploader;
