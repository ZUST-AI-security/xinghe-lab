/**
 * 星河智安 (XingHe ZhiAn) - 图片上传组件
 * 支持拖拽上传的图片上传组件
 */

import React, { useState, useCallback } from 'react';
import { Upload, message, Image, Button } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { getBase64FromFile } from '../../utils/formatters';

const { Dragger } = Upload;

const ImageUploader = ({ 
  value, 
  onChange, 
  description = "点击或拖拽图片到此区域上传",
  maxSize = 10, // MB
  accept = "image/*",
  showPreview = true,
  disabled = false,
}) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 处理文件上传
  const handleUpload = useCallback(async (file) => {
    // 检查文件大小
    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }

    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return false;
    }

    try {
      // 转换为base64
      const base64 = await getBase64FromFile(file);
      onChange?.(base64);
      
      // 设置预览
      if (showPreview) {
        setPreviewImage(base64);
      }
      
      message.success('图片上传成功');
      return false; // 阻止默认上传行为
    } catch (error) {
      message.error('图片处理失败');
      return false;
    }
  }, [maxSize, onChange, showPreview]);

  // 清除图片
  const handleClear = () => {
    onChange?.(null);
    setPreviewImage(null);
    setPreviewVisible(false);
  };

  // 预览图片
  const handlePreview = () => {
    setPreviewVisible(true);
  };

  // 上传组件配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept,
    disabled,
    beforeUpload: handleUpload,
    showUploadList: false,
    className: 'upload-area',
  };

  return (
    <div className="image-uploader">
      {value ? (
        // 已上传图片显示
        <div style={{ position: 'relative' }}>
          <div 
            style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '8px',
              padding: '8px',
              backgroundColor: '#fafafa',
            }}
          >
            <Image
              src={value}
              alt="上传的图片"
              style={{ 
                width: '100%', 
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
              preview={showPreview}
            />
          </div>
          
          {/* 操作按钮 */}
          <div style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px',
            display: 'flex',
            gap: '8px',
          }}>
            {showPreview && (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                type="primary"
              />
            )}
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClear}
              danger
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        // 上传区域
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 500 }}>
            点击或拖拽图片到此区域上传
          </p>
          <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
            {description}
          </p>
          <p className="ant-upload-hint" style={{ color: '#8c8c8c', fontSize: '12px' }}>
            支持 JPG、PNG、GIF、BMP 格式，最大 {maxSize}MB
          </p>
        </Dragger>
      )}

      {/* 预览弹窗 */}
      {previewVisible && (
        <Image
          style={{ display: 'none' }}
          preview={{
            visible: previewVisible,
            src: previewImage || value,
            onVisibleChange: (visible) => setPreviewVisible(visible),
          }}
        />
      )}
    </div>
  );
};

export default ImageUploader;
