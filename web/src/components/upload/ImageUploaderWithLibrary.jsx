/**
 * ImageUploaderWithLibrary — 带图片库入口的图片上传组件
 *
 * 在原有 ImageUploader 基础上，在上传区域下方添加「从图片库选择」按钮。
 * 选择后将图片 base64 填充到上传区域，效果与直接上传相同。
 *
 * 对应 Requirement 19：上传图片复用机制。
 */

import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import ImageUploader from '../../pages/Attacks/CWAttack/components/ImageUploader';
import ImageLibrary from './ImageLibrary';

/**
 * @param {Object}   props
 * @param {Function} props.onImageChange  - 图片变化回调（与 ImageUploader 相同）
 * @param {boolean}  props.disabled       - 是否禁用
 * @param {number}   props.maxSize        - 最大文件大小 MB
 */
const ImageUploaderWithLibrary = ({ onImageChange, disabled = false, maxSize = 10 }) => {
  const [libraryOpen, setLibraryOpen] = useState(false);

  /**
   * 从图片库选择后，将 data URL 转换为 File 对象传给父组件
   */
  const handleLibrarySelect = (dataUrl) => {
    // 直接将 dataUrl 传给父组件（父组件通常直接使用 base64）
    // 同时构造一个伪 File 对象以兼容需要 File 的场景
    if (onImageChange) {
      // 创建一个伪 File 对象，携带 dataUrl 属性供父组件读取
      const pseudoFile = new File([''], 'library-image.png', { type: 'image/png' });
      pseudoFile._dataUrl = dataUrl;

      // 覆盖 FileReader 行为：父组件调用 reader.readAsDataURL(file) 时直接返回 dataUrl
      // 由于父组件通常用 FileReader，我们直接传 dataUrl 更可靠
      // 这里直接调用 onImageChange 并传入一个特殊对象
      onImageChange(pseudoFile, dataUrl);
    }
  };

  return (
    <div>
      <ImageUploader
        onImageChange={onImageChange}
        disabled={disabled}
        maxSize={maxSize}
      />

      {!disabled && (
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

export default ImageUploaderWithLibrary;
