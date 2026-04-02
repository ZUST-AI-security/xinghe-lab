/**
 * 星河智安 (XingHe ZhiAn) - 图片上传组件
 * 支持拖拽上传的图片上传组件，支持外部内容注入
 */

import React, { useState, useCallback } from 'react';
import { Upload, message, Image, Button, Card, Spin } from 'antd';
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
  children, // 新增：支持外部内容注入
  previewHeight = 160, // 新增：可配置预览高度
  loading = false, // 新增：外部loading状态
}) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      setUploading(true);
      
      // 转换为base64
      const base64 = await getBase64FromFile(file);
      
      // 设置预览
      if (showPreview) {
        setPreviewImage(base64);
      }
      
      // 通知外部组件
      onChange?.(base64);
      
      message.success('图片上传成功');
      return false; // 阻止默认上传行为
    } catch (error) {
      console.error('图片处理失败:', error);
      message.error('图片处理失败');
      return false;
    } finally {
      setUploading(false);
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
    disabled: disabled || uploading,
    beforeUpload: handleUpload,
    showUploadList: false,
    className: 'upload-area',
  };

  return (
    <div className="image-uploader-container">
      {value ? (
        // 已上传图片显示 - 使用Card布局
        <Card
          hoverable
          bodyStyle={{ 
            padding: '8px',
            background: '#fafafa',
            borderRadius: '8px'
          }}
          cover={
            <div style={{ 
              height: previewHeight, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <Spin spinning={uploading || loading}>
                <Image
                  src={value}
                  alt="上传的图片"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: `${previewHeight - 20}px`, // 减去padding
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                  preview={showPreview}
                />
              </Spin>
            </div>
          }
          actions={[
            <Button
              key="view"
              size="small"
              icon={<EyeOutlined />}
              onClick={handlePreview}
              type="default"
            >
              预览
            </Button>,
            <Button
              key="delete"
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClear}
              danger
              disabled={disabled}
            >
              删除
            </Button>
          ]}
        >
          {/* 关键：用于放置外部注入的内容（如分类标签） */}
          <div className="uploader-extra-content" style={{ 
            textAlign: 'center', 
            padding: '8px 0',
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa'
          }}>
            {children}
          </div>
        </Card>
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
          {(uploading || loading) && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Spin size="large" tip="正在处理图片..." />
            </div>
          )}
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
