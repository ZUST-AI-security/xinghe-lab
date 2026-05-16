/**
 * 鲁棒性评估 - 单元格详情 Modal
 * 展示原图 / 对抗图 / 防御后图三联对比 + Top-5 概率分布 + 客观指标
 */

import React from 'react';
import {
  Card,
  Col,
  Descriptions,
  Empty,
  Image,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const DEFENSE_LABELS = {
  gaussian_blur: '高斯模糊',
  jpeg_compression: 'JPEG 压缩',
  bit_depth_reduction: '位深度压缩',
};

// 同 ImageLibrary：相对路径加 backend host 前缀（生产为空）
const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}${url}`;
};

const TopFiveTable = ({ rows, highlight }) => {
  if (!rows || !rows.length) return <Empty description="无预测数据" />;
  const data = rows.slice(0, 5).map((r, i) => ({
    key: i,
    rank: i + 1,
    label: r.label || r.class_name || `class_${r.class_id}`,
    confidence: r.confidence ?? r.probability,
    is_top: i === 0,
  }));
  return (
    <Table
      size="small"
      dataSource={data}
      pagination={false}
      columns={[
        {
          title: '#',
          dataIndex: 'rank',
          width: 40,
        },
        {
          title: '类别',
          dataIndex: 'label',
          render: (val, row) => (
            <Text strong={row.is_top} style={{ color: row.is_top ? highlight : undefined }}>
              {val}
            </Text>
          ),
        },
        {
          title: '置信度',
          dataIndex: 'confidence',
          width: 100,
          align: 'right',
          render: (val) => (val != null ? `${(val * 100).toFixed(2)}%` : '—'),
        },
      ]}
    />
  );
};

const formatMetric = (val, digits = 4) => {
  if (val === null || val === undefined) return '—';
  if (Number.isFinite(val)) return val.toFixed(digits);
  return String(val);
};

const ImagePanel = ({ title, src, label, confidence, accent, fallbackBase64 }) => (
  <Card
    size="small"
    variant="borderless"
    style={{
      borderTop: `3px solid ${accent}`,
      background: '#fafbfd',
      height: '100%',
    }}
  >
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Text strong style={{ color: accent }}>{title}</Text>
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: '#0f172a',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {src ? (
          <Image
            src={src}
            fallback={fallbackBase64}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            preview={{ mask: '点击放大' }}
          />
        ) : (
          <Empty description="暂无图片" />
        )}
      </div>
      {label != null && (
        <div style={{ background: '#fff', padding: 8, borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>预测：</Text>
          <Text strong style={{ display: 'block', wordBreak: 'break-word' }}>{label}</Text>
          {confidence != null && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              置信度 {(confidence * 100).toFixed(2)}%
            </Text>
          )}
        </div>
      )}
    </Space>
  </Card>
);

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.algorithm  攻击算法名，如 'fgsm'
 * @param {string} props.defense    防御名，如 'gaussian_blur'
 * @param {object} props.algoDetails  details[algorithm]，包含 .adversarial 与 .defenses[defense]
 * @param {object} props.meta         全局 meta（原图 url + Top-5 + 标签）
 */
const CellDetailModal = ({ open, onClose, algorithm, defense, algoDetails, meta }) => {
  if (!open || !algorithm || !defense) return null;

  const algoErr = algoDetails?.error;
  const adv = algoDetails?.adversarial;
  const defended = algoDetails?.defenses?.[defense];
  const defenseErr = defended?.error;

  const origUrl = toAbsoluteUrl(meta?.original_image_url);
  const advUrl = toAbsoluteUrl(adv?.image_url);
  const defUrl = toAbsoluteUrl(defended?.defended_image_url);

  const successText = defended?.success ? '攻击成功（防御未阻止）' : '防御有效（攻击被阻止）';
  const successColor = defended?.success ? '#ff4d4f' : '#52c41a';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      title={
        <Space>
          <Tag color="blue">{algorithm.toUpperCase()}</Tag>
          <span>×</span>
          <Tag color="purple">{DEFENSE_LABELS[defense] || defense}</Tag>
          <Text type="secondary">详细结果</Text>
        </Space>
      }
      destroyOnClose
    >
      {algoErr ? (
        <Empty description={`算法执行失败：${algoErr}`} />
      ) : defenseErr ? (
        <Empty description={`防御执行失败：${defenseErr}`} />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 顶部摘要条 */}
          <Card variant="borderless" size="small" style={{ background: '#f8fbff' }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Statistic
                  title="单元格成功率"
                  value={(defended?.success_rate ?? 0) * 100}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: successColor }}
                />
                <Tag color={defended?.success ? 'red' : 'green'}>{successText}</Tag>
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <Space size={4}>
                      <span>PSNR (原图 vs 防御后)</span>
                      <Tooltip title="峰值信噪比，越高表示防御后图像越接近原图">
                        <InfoCircleOutlined style={{ color: '#999' }} />
                      </Tooltip>
                    </Space>
                  }
                  value={formatMetric(defended?.metrics?.psnr, 2)}
                  suffix="dB"
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <Space size={4}>
                      <span>SSIM (原图 vs 防御后)</span>
                      <Tooltip title="结构相似度，1 表示完全相同">
                        <InfoCircleOutlined style={{ color: '#999' }} />
                      </Tooltip>
                    </Space>
                  }
                  value={formatMetric(defended?.metrics?.ssim, 4)}
                />
              </Col>
            </Row>
          </Card>

          {/* 三联图 */}
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <ImagePanel
                title="① 原始图像"
                src={origUrl}
                label={meta?.original_prediction?.class_name || meta?.original_prediction?.label}
                confidence={meta?.original_prediction?.confidence}
                accent="#1677ff"
              />
            </Col>
            <Col xs={24} md={8}>
              <ImagePanel
                title="② 对抗样本"
                src={advUrl}
                label={adv?.prediction?.class_name || adv?.prediction?.label}
                confidence={adv?.top1_confidence}
                accent="#fa541c"
              />
            </Col>
            <Col xs={24} md={8}>
              <ImagePanel
                title="③ 防御后图像"
                src={defUrl}
                label={defended?.defended_prediction?.class_name || defended?.defended_prediction?.label}
                confidence={defended?.defended_top1_confidence}
                accent={successColor}
              />
            </Col>
          </Row>

          {/* Top-5 对比 */}
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Card size="small" title="原图 Top-5">
                <TopFiveTable rows={meta?.original_top5} highlight="#1677ff" />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="对抗样本 Top-5">
                <TopFiveTable rows={adv?.top5} highlight="#fa541c" />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="防御后 Top-5">
                <TopFiveTable rows={defended?.defended_top5} highlight={successColor} />
              </Card>
            </Col>
          </Row>

          {/* 客观指标表格（用于"看不出差别时用数字说明"） */}
          <Card size="small" title="客观指标对比">
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              <Descriptions.Item label="L2 (原图 vs 对抗)">
                {formatMetric(adv?.metrics?.l2)}
              </Descriptions.Item>
              <Descriptions.Item label="L∞ (原图 vs 对抗)">
                {formatMetric(adv?.metrics?.linf)}
              </Descriptions.Item>
              <Descriptions.Item label="PSNR (原图 vs 对抗)">
                {formatMetric(adv?.metrics?.psnr, 2)} dB
              </Descriptions.Item>
              <Descriptions.Item label="SSIM (原图 vs 对抗)">
                {formatMetric(adv?.metrics?.ssim, 4)}
              </Descriptions.Item>
              <Descriptions.Item label="L2 (原图 vs 防御后)">
                {formatMetric(defended?.metrics?.l2_orig_vs_defended)}
              </Descriptions.Item>
              <Descriptions.Item label="L2 (对抗 vs 防御后)">
                {formatMetric(defended?.metrics?.l2_adv_vs_defended)}
              </Descriptions.Item>
            </Descriptions>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
              当肉眼看不出三张图差别时，可以参考 PSNR 和 SSIM：
              防御方法对原图扰动越小（PSNR 越高、SSIM 越接近 1），同时仍能纠正对抗扰动，则说明该防御越优。
              对抗 vs 防御后的 L2 距离反映防御对扰动的"擦除"力度。
            </Paragraph>
          </Card>

          {/* 防御参数 */}
          {defended?.params && (
            <Card size="small" title="防御方法参数">
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                {Object.entries(defended.params).map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </Space>
      )}
    </Modal>
  );
};

export default CellDetailModal;
