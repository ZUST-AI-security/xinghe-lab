/**
 * ImageLibrary — 用户图片库组件
 *
 * 展示用户历史上传的图片，支持选择复用，避免重复上传。
 * 对应 Requirement 19：上传图片复用机制。
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Image,
  Modal,
  Pagination,
  Row,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { deleteMyFile, getImageAsBase64, getMyUploads } from '../../api/files';

const { Text } = Typography;

/**
 * 将后端返回的相对路径转换为完整 URL
 * 开发环境下需要加上后端 host，生产环境下相对路径即可
 */
const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const backendBase = import.meta.env.VITE_API_BASE_URL || '';
  return `${backendBase}${url}`;
};
const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * ImageLibrary Modal
 *
 * @param {Object}   props
 * @param {boolean}  props.open       - 是否显示
 * @param {Function} props.onClose    - 关闭回调
 * @param {Function} props.onSelect   - 选择图片回调 (dataUrl: string) => void
 */
const ImageLibrary = ({ open, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(null); // 正在加载的 file_id
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });

  const fetchUploads = useCallback(async (page = 1, size = 12) => {
    setLoading(true);
    try {
      const data = await getMyUploads(page, size);
      setItems(data.items || []);
      setPagination({ current: data.page, pageSize: data.size, total: data.total });
    } catch {
      message.error('获取图片库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchUploads(1, 12);
    }
  }, [open, fetchUploads]);

  const handleSelect = async (fileId) => {
    setSelecting(fileId);
    try {
      const result = await getImageAsBase64(fileId);
      onSelect?.(result.data_url);
      onClose?.();
    } catch {
      message.error('图片加载失败，请重试');
    } finally {
      setSelecting(null);
    }
  };

  const handleDelete = async (fileId, e) => {
    e.stopPropagation();
    try {
      await deleteMyFile(fileId);
      message.success('已删除');
      fetchUploads(pagination.current, pagination.pageSize);
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Modal
      title={
        <span>
          <PictureOutlined style={{ marginRight: 8 }} />
          我的图片库
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty
            description="暂无上传记录，请先上传图片"
            style={{ padding: '32px 0' }}
          />
        ) : (
          <>
            <Row gutter={[12, 12]}>
              {items.map((item) => (
                <Col key={item.file_id} xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    size="small"
                    style={{ cursor: 'pointer', position: 'relative' }}
                    styles={{ body: { padding: 8 } }}
                    onClick={() => handleSelect(item.file_id)}
                  >
                    <Spin spinning={selecting === item.file_id} size="small">
                      <div
                        style={{
                          width: '100%',
                          height: 100,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f5f5f5',
                          borderRadius: 6,
                          overflow: 'hidden',
                          marginBottom: 6,
                        }}
                      >
                        <Image
                          src={toAbsoluteUrl(item.thumbnail_url)}
                          alt={item.filename}
                          style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }}
                          preview={false}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        />
                      </div>
                    </Spin>

                    <Tooltip title={item.filename}>
                      <Text
                        style={{
                          display: 'block',
                          fontSize: 11,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.filename}
                      </Text>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {formatSize(item.file_size)}
                    </Text>

                    {/* 删除按钮 */}
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: 0.7,
                        minHeight: 24,
                        minWidth: 24,
                        padding: 2,
                      }}
                      onClick={(e) => handleDelete(item.file_id, e)}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {pagination.total > pagination.pageSize && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  size="small"
                  onChange={(page) => fetchUploads(page, pagination.pageSize)}
                  showTotal={(total) => `共 ${total} 张`}
                />
              </div>
            )}
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default ImageLibrary;
