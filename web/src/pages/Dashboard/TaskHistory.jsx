import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Image,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';

import { getMyTaskHistory } from '../../api/tasks';
import { API_BASE_URL } from '../../api/client';
import PerturbationViewer from '../../components/Visualization/PerturbationViewer';

/**
 * 将相对路径（如 "outputs/tasks/abc/img.png"）转换为可访问的 HTTP URL。
 * 后端通过 StaticFiles 在 /outputs 路径下提供文件服务。
 */
const toStaticUrl = (relativePath) => {
  if (!relativePath) return null;
  const path = relativePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${API_BASE_URL}/${path}`;
};

const { Title, Text } = Typography;

const statusColorMap = {
  success: 'green',
  completed: 'green',
  failed: 'red',
  running: 'processing',
  pending: 'gold',
};

const isCompleted = (status) => status === 'completed' || status === 'success';

/**
 * 从任务结果中提取图像和指标数据。
 * 优先使用 base64 data URL（实时结果），否则从存储的文件路径构造静态文件 URL（历史记录）。
 */
const extractResultData = (record) => {
  const result = record.result || {};
  const outputDir = result.output_dir || null;

  const originalImage =
    result.original_image || result.original_img ||
    toStaticUrl(result.original_image_path) ||
    (outputDir ? toStaticUrl(`${outputDir}/original_image.png`) : null);

  const adversarialImage =
    result.adversarial_image || result.adv_image || result.adversarial_img ||
    toStaticUrl(result.adversarial_image_path) ||
    (outputDir ? toStaticUrl(`${outputDir}/adversarial_image.png`) : null);

  const heatmap =
    result.heatmap ||
    toStaticUrl(result.heatmap_path) ||
    (outputDir ? toStaticUrl(`${outputDir}/heatmap.png`) : null);

  // amplified_diff / fft_diff 未保存到磁盘，仅在实时结果中有 base64
  const amplifiedDiff = result.amplified_diff || null;
  const fftDiff = result.fft_diff || null;

  return {
    originalImage,
    adversarialImage,
    heatmap,
    amplifiedDiff,
    fftDiff,
    metadata: result.metadata || {},
    error: result.error || record.error || null,
    timeElapsed: result.time_elapsed || null,
  };
};

/**
 * 展开行：显示完整攻击结果
 */
const ExpandedResult = ({ record }) => {
  const data = extractResultData(record);
  const meta = data.metadata;

  if (record.status === 'failed') {
    return (
      <Card size="small" style={{ margin: '8px 0', background: '#fff2f0', border: '1px solid #ffccc7' }}>
        <Text type="danger" strong>任务失败原因：</Text>
        <br />
        <Text type="danger">{data.error || '未知错误'}</Text>
      </Card>
    );
  }

  if (!isCompleted(record.status)) {
    return (
      <Card size="small" style={{ margin: '8px 0' }}>
        <Text type="secondary">任务尚未完成，结果暂不可查看。</Text>
      </Card>
    );
  }

  return (
    <Card size="small" style={{ margin: '8px 0' }}>
      <Row gutter={[16, 16]}>
        {/* 图像对比区域 */}
        <Col xs={24} md={14}>
          <Row gutter={[8, 8]}>
            {data.originalImage && (
              <Col xs={12}>
                <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>原始图像</Text>
                <Image
                  src={data.originalImage}
                  alt="原始图像"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb' }}
                  preview={{ mask: '预览' }}
                />
              </Col>
            )}
            {data.adversarialImage && (
              <Col xs={12}>
                <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>对抗样本</Text>
                <Image
                  src={data.adversarialImage}
                  alt="对抗样本"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb' }}
                  preview={{ mask: '预览' }}
                />
              </Col>
            )}
          </Row>

          {/* 扰动可视化 */}
          {(data.heatmap || data.amplifiedDiff || data.fftDiff) && (
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>扰动可视化</Text>
              <PerturbationViewer
                heatmap={data.heatmap}
                amplifiedDiff={data.amplifiedDiff}
                fftDiff={data.fftDiff}
                width="100%"
                height={180}
              />
            </div>
          )}
        </Col>

        {/* 指标区域 */}
        <Col xs={24} md={10}>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>攻击指标</Text>
          <Row gutter={[8, 8]}>
            <Col xs={12}>
              <Statistic
                title="攻击成功率"
                value={meta.success_rate != null ? (meta.success_rate * 100).toFixed(1) : '-'}
                suffix={meta.success_rate != null ? '%' : ''}
                valueStyle={{ fontSize: 16, color: meta.success_rate > 0.5 ? '#52c41a' : '#fa8c16' }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="执行耗时"
                value={data.timeElapsed != null ? data.timeElapsed.toFixed(2) : '-'}
                suffix={data.timeElapsed != null ? 's' : ''}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
            {meta.l2_norm != null && (
              <Col xs={12}>
                <Statistic
                  title="L2 范数"
                  value={meta.l2_norm.toFixed(4)}
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
            )}
            {meta.linf_norm != null && (
              <Col xs={12}>
                <Statistic
                  title="Linf 范数"
                  value={meta.linf_norm.toFixed(4)}
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
            )}
            {meta.original_confidence != null && (
              <Col xs={12}>
                <Statistic
                  title="原始置信度"
                  value={(meta.original_confidence * 100).toFixed(1)}
                  suffix="%"
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
            )}
            {meta.adversarial_confidence != null && (
              <Col xs={12}>
                <Statistic
                  title="对抗置信度"
                  value={(meta.adversarial_confidence * 100).toFixed(1)}
                  suffix="%"
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
            )}
          </Row>

          {/* 预测标签 */}
          {(meta.original_label || meta.adversarial_label) && (
            <div style={{ marginTop: 12 }}>
              <Descriptions size="small" column={1} bordered>
                {meta.original_label && (
                  <Descriptions.Item label="原始预测">{meta.original_label}</Descriptions.Item>
                )}
                {meta.adversarial_label && (
                  <Descriptions.Item label="对抗预测">
                    <Text type={meta.original_label !== meta.adversarial_label ? 'danger' : 'secondary'}>
                      {meta.adversarial_label}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}
        </Col>
      </Row>
    </Card>
  );
};

const TaskHistory = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [algorithm, setAlgorithm] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [expandedKeys, setExpandedKeys] = useState([]);

  const fetchHistory = useCallback(async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const response = await getMyTaskHistory({ page, size, algorithm, status });
      setData(response.items || []);
      setPagination({
        current: response.page,
        pageSize: response.size,
        total: response.total,
      });
    } catch {
      message.error('获取任务历史失败');
    } finally {
      setLoading(false);
    }
  }, [algorithm, status]);

  useEffect(() => {
    fetchHistory(1, 10);
  }, [fetchHistory]);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      className: 'xh-hide-mobile',
    },
    {
      title: '算法',
      dataIndex: 'algorithm_name',
      key: 'algorithm_name',
      render: (value) => <Tag color="blue">{(value || '-').toUpperCase()}</Tag>,
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      key: 'model_name',
      className: 'xh-hide-mobile',
      render: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={statusColorMap[value] || 'default'}>{value || '-'}</Tag>,
    },
    {
      title: '成功率',
      dataIndex: 'success_rate',
      key: 'success_rate',
      className: 'xh-hide-mobile',
      render: (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`),
    },
    {
      title: '耗时',
      dataIndex: 'execution_time',
      key: 'execution_time',
      className: 'xh-hide-mobile',
      render: (value) => (value == null ? '-' : `${value.toFixed(2)} s`),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const canView = isCompleted(record.status) || record.status === 'failed';
        const isExpanded = expandedKeys.includes(record.id);
        return (
          <Button
            icon={<EyeOutlined />}
            size="small"
            type={isExpanded ? 'primary' : 'default'}
            disabled={!canView}
            onClick={() => {
              setExpandedKeys((prev) =>
                prev.includes(record.id)
                  ? prev.filter((k) => k !== record.id)
                  : [...prev, record.id],
              );
            }}
          >
            {isExpanded ? '收起' : '查看结果'}
          </Button>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card style={{ borderRadius: 20 }}>
        <Space direction="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>我的攻击任务</Title>
          <Text type="secondary">查看历史任务、完成状态、模型输出和错误详情。</Text>
        </Space>
      </Card>

      <Card style={{ borderRadius: 20 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="按算法筛选"
              style={{ width: 140 }}
              onChange={(value) => setAlgorithm(value || '')}
              options={[
                { label: 'FGSM', value: 'fgsm' },
                { label: 'I-FGSM', value: 'ifgsm' },
                { label: 'PGD', value: 'pgd' },
                { label: 'C&W', value: 'cw' },
                { label: 'DeepFool', value: 'deepfool' },
              ]}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              style={{ width: 140 }}
              onChange={(value) => setStatus(value || '')}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Running', value: 'running' },
                { label: 'Completed', value: 'completed' },
                { label: 'Failed', value: 'failed' },
              ]}
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchHistory()}>
            刷新
          </Button>
        </Space>

        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 600 }}
          locale={{ emptyText: <Empty description="暂无任务历史" /> }}
          expandable={{
            expandedRowKeys: expandedKeys,
            showExpandColumn: false,
            expandedRowRender: (record) => <ExpandedResult record={record} />,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => fetchHistory(page, pageSize),
          }}
        />
      </Card>
    </Space>
  );
};

export default TaskHistory;
