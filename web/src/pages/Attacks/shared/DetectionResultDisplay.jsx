/**
 * 检测任务（YOLOv8）攻击结果展示
 * 与分类的 Top-5 概率不同，这里展示：
 *  - 原图 / 对抗图（带 bbox 绘制）对比
 *  - 检测框消失 / 新增 / 类别变化 diff
 *  - 客观指标（vanish_rate、L2/Linf）
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Image,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AimOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * 在 canvas 上绘制 bbox
 * @param {HTMLCanvasElement} canvas
 * @param {string} imageDataUrl
 * @param {Array<{bbox:number[], class_name:string, confidence:number}>} detections
 * @param {string} color
 */
const drawDetections = (canvas, imageDataUrl, detections, color = '#52c41a') => {
  if (!canvas || !imageDataUrl) return;
  const ctx = canvas.getContext('2d');
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    if (!detections?.length) return;

    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 200));
    ctx.font = `${Math.max(14, Math.round(canvas.width / 40))}px sans-serif`;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox || [];
      if (x1 == null) return;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = `${det.class_name || det.class_id} ${(det.confidence * 100).toFixed(0)}%`;
      const textW = ctx.measureText(label).width + 8;
      const textH = 18;
      ctx.fillRect(x1, Math.max(0, y1 - textH), textW, textH);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 4, Math.max(textH - 4, y1 - 4));
      ctx.fillStyle = color;
    });
  };
  img.src = imageDataUrl;
};

const DetectionCanvas = ({ src, detections, color, title }) => {
  const ref = useRef(null);
  useEffect(() => {
    drawDetections(ref.current, src, detections || [], color);
  }, [src, detections, color]);

  return (
    <Card size="small" variant="borderless" title={title}>
      {src ? (
        <canvas
          ref={ref}
          style={{ width: '100%', height: 'auto', borderRadius: 8, background: '#0f172a' }}
        />
      ) : (
        <Empty description="无图像" />
      )}
    </Card>
  );
};

/**
 * 计算检测框 diff
 * 用 IoU > 0.5 + class 一致 来判定"匹配"
 */
const iou = (a, b) => {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
};

const computeDiff = (origDets = [], advDets = []) => {
  const matchedAdv = new Set();
  const vanished = [];
  const classChanged = [];
  origDets.forEach((o) => {
    let matched = null;
    let bestIou = 0;
    advDets.forEach((a, i) => {
      if (matchedAdv.has(i)) return;
      const v = iou(o.bbox, a.bbox);
      if (v > bestIou) {
        bestIou = v;
        matched = { i, a };
      }
    });
    if (!matched || bestIou < 0.5) {
      vanished.push(o);
    } else {
      matchedAdv.add(matched.i);
      if (matched.a.class_id !== o.class_id) {
        classChanged.push({ from: o, to: matched.a });
      }
    }
  });
  const newBoxes = advDets.filter((_, i) => !matchedAdv.has(i));
  return { vanished, classChanged, newBoxes };
};

const DetectionResultDisplay = ({ result, originalImageUrl, onSaveResult, onExportData }) => {
  if (!result) {
    return (
      <Card title="攻击结果" variant="borderless">
        <Empty
          image={<AimOutlined style={{ fontSize: 48, color: '#ccc' }} />}
          description="请上传图片并运行攻击"
        />
      </Card>
    );
  }

  const meta = result.metadata || {};
  const origImg = result.original_image || originalImageUrl;
  const advImg = result.adversarial_image;
  const origDets = meta.original_detections || [];
  const advDets = meta.adversarial_detections || [];

  const diff = computeDiff(origDets, advDets);
  const successRate = meta.success_rate ?? meta.vanish_rate ?? 0;

  const buildRows = (dets, prefix = '') => dets.map((d, i) => ({
    key: `${prefix}_${i}`,
    class_name: d.class_name,
    confidence: d.confidence,
    bbox: d.bbox?.map((v) => Math.round(v)).join(', '),
  }));

  const detColumns = [
    { title: '#', dataIndex: 'idx', width: 40, render: (_, _r, i) => i + 1 },
    { title: '类别', dataIndex: 'class_name' },
    {
      title: '置信度',
      dataIndex: 'confidence',
      width: 100,
      render: (v) => (v != null ? `${(v * 100).toFixed(1)}%` : '—'),
    },
    { title: 'BBox', dataIndex: 'bbox', ellipsis: true },
  ];

  const actions = (
    <Space>
      <Button icon={<DownloadOutlined />} onClick={() => onExportData?.(result)}>
        导出
      </Button>
      <Button icon={<ShareAltOutlined />} onClick={() => onSaveResult?.(result)}>
        保存
      </Button>
    </Space>
  );

  return (
    <Card title="检测攻击结果" variant="borderless" extra={actions}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 摘要指标 */}
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Statistic
              title="检测框消失率"
              value={successRate * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: successRate > 0.5 ? '#ff4d4f' : '#1677ff' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="原图检出"
              value={meta.orig_box_count ?? origDets.length}
              suffix="个"
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="对抗后检出"
              value={meta.adv_box_count ?? advDets.length}
              suffix="个"
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="L∞ 扰动"
              value={meta.linf_norm}
              precision={4}
            />
          </Col>
        </Row>

        {/* 双图对比 */}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <DetectionCanvas
              title={<><Tag color="blue">原图</Tag>{origDets.length} 个检测框</>}
              src={origImg}
              detections={origDets}
              color="#1677ff"
            />
          </Col>
          <Col xs={24} md={12}>
            <DetectionCanvas
              title={<><Tag color="red">对抗图</Tag>{advDets.length} 个检测框</>}
              src={advImg}
              detections={advDets}
              color="#fa541c"
            />
          </Col>
        </Row>

        {/* Diff 摘要 */}
        <Card
          size="small"
          title={
            <Space>
              <span>检测框变化</span>
              <Tooltip title="基于 IoU≥0.5 匹配原图与对抗图的检测框，统计消失/类别变化/新增">
                <InfoCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </Space>
          }
        >
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Alert
                message={`消失 ${diff.vanished.length} 个`}
                type="error"
                description={
                  diff.vanished.length
                    ? diff.vanished.map((d) => d.class_name).join(', ')
                    : '无'
                }
                showIcon
              />
            </Col>
            <Col xs={24} md={8}>
              <Alert
                message={`类别变化 ${diff.classChanged.length} 个`}
                type="warning"
                description={
                  diff.classChanged.length
                    ? diff.classChanged.map((c) => `${c.from.class_name} → ${c.to.class_name}`).join('; ')
                    : '无'
                }
                showIcon
              />
            </Col>
            <Col xs={24} md={8}>
              <Alert
                message={`新增误报 ${diff.newBoxes.length} 个`}
                type="info"
                description={
                  diff.newBoxes.length
                    ? diff.newBoxes.map((d) => d.class_name).join(', ')
                    : '无'
                }
                showIcon
              />
            </Col>
          </Row>
        </Card>

        {/* 详细列表 */}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Card size="small" title="原图检测列表">
              {origDets.length ? (
                <Table size="small" pagination={false} columns={detColumns} dataSource={buildRows(origDets, 'o')} />
              ) : (
                <Empty description="未检出物体" />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="对抗图检测列表">
              {advDets.length ? (
                <Table size="small" pagination={false} columns={detColumns} dataSource={buildRows(advDets, 'a')} />
              ) : (
                <Empty description="未检出物体（攻击成功）" />
              )}
            </Card>
          </Col>
        </Row>

        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small" bordered>
          <Descriptions.Item label="算法">{meta.algorithm}</Descriptions.Item>
          <Descriptions.Item label="模型">{meta.model_name}</Descriptions.Item>
          <Descriptions.Item label="L2 扰动">{meta.l2_norm?.toFixed(4)}</Descriptions.Item>
          <Descriptions.Item label="耗时">{result.time_elapsed?.toFixed(2)}s</Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
};

export default DetectionResultDisplay;
