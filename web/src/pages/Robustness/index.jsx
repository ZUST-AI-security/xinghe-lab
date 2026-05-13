/**
 * 鲁棒性评估页面
 * 关联需求：Requirement 7
 *
 * 功能：
 * - 上传图片
 * - 多选攻击算法
 * - 提交评估任务并轮询状态
 * - 以矩阵热力图（行=攻击算法，列=防御方法）展示结果
 * - 任务失败时显示错误信息并提供重新提交按钮
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ExperimentOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

import ImageUploader from '../../components/business/ImageUploader';
import { getRobustnessResult, submitRobustnessEvaluation } from '../../api/robustness';

const { Title, Paragraph, Text } = Typography;

// ─── 常量 ────────────────────────────────────────────────────────────────────

const ALGORITHM_OPTIONS = [
  { label: 'FGSM', value: 'fgsm', description: '快速梯度符号法（单步）' },
  { label: 'I-FGSM', value: 'ifgsm', description: '迭代快速梯度符号法' },
  { label: 'PGD', value: 'pgd', description: '投影梯度下降攻击' },
  { label: 'C&W', value: 'cw', description: 'Carlini & Wagner 优化攻击' },
  { label: 'DeepFool', value: 'deepfool', description: '最小扰动寻找攻击' },
];

const DEFENSE_LABELS = {
  gaussian_blur: '高斯模糊',
  jpeg_compression: 'JPEG 压缩',
  bit_depth_reduction: '位深度压缩',
};

const POLL_INTERVAL_MS = 2000;

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 根据成功率（0–1）计算热力图背景色
 * 低成功率（防御效果好）→ 绿色；高成功率（防御效果差）→ 红色
 */
const getHeatmapStyle = (rate) => {
  if (rate === null || rate === undefined) {
    return { background: '#f5f5f5', color: '#999' };
  }
  // rate: 0 → green (#52c41a), 1 → red (#ff4d4f)
  const r = Math.round(82 + (255 - 82) * rate);
  const g = Math.round(196 + (77 - 196) * rate);
  const b = Math.round(26 + (79 - 26) * rate);
  const textColor = rate > 0.5 ? '#fff' : '#1a1a1a';
  return {
    background: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
    fontWeight: 600,
    textAlign: 'center',
    borderRadius: 6,
    padding: '6px 4px',
  };
};

// ─── RobustnessMatrix 子组件 ──────────────────────────────────────────────────

const RobustnessMatrix = ({ matrix, algorithms, defenses }) => {
  if (!matrix || !algorithms || !defenses) return null;

  const defenseColumns = [
    {
      title: '攻击算法',
      dataIndex: 'algorithm',
      key: 'algorithm',
      fixed: 'left',
      width: 120,
      render: (val) => <Text strong>{val.toUpperCase()}</Text>,
    },
    ...defenses.map((defense) => ({
      title: (
        <Tooltip title={`防御方法：${DEFENSE_LABELS[defense] || defense}`}>
          <span>{DEFENSE_LABELS[defense] || defense}</span>
        </Tooltip>
      ),
      dataIndex: defense,
      key: defense,
      width: 140,
      render: (rate) => (
        <div style={getHeatmapStyle(rate)}>
          {rate !== null && rate !== undefined ? `${(rate * 100).toFixed(1)}%` : '—'}
        </div>
      ),
    })),
  ];

  const dataSource = algorithms.map((alg) => ({
    key: alg,
    algorithm: alg,
    ...defenses.reduce((acc, defense) => {
      acc[defense] = matrix[alg]?.[defense] ?? null;
      return acc;
    }, {}),
  }));

  return (
    <Card
      title={
        <Space>
          <SafetyOutlined />
          <span>攻防矩阵热力图</span>
          <Tooltip title="单元格颜色表示攻击成功率：绿色（低成功率，防御有效）→ 红色（高成功率，防御无效）">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }
      variant="borderless"
      style={{ marginTop: 24 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Space size={4}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgb(82,196,26)' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>低成功率（防御有效）</Text>
          </Space>
          <Space size={4}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgb(255,77,79)' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>高成功率（防御无效）</Text>
          </Space>
        </Space>
      </div>
      <Table
        columns={defenseColumns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="middle"
        bordered
      />
    </Card>
  );
};

// ─── 主页面组件 ───────────────────────────────────────────────────────────────

const RobustnessPage = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['fgsm']);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState('idle'); // idle | pending | running | completed | failed
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pollTimerRef = useRef(null);

  // ── 清理轮询定时器 ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── 轮询任务状态 ────────────────────────────────────────────────────────────
  const startPolling = useCallback((id) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await getRobustnessResult(id);
        setTaskStatus(data.status);

        if (data.status === 'completed') {
          setResult(data);
          stopPolling();
        } else if (data.status === 'failed') {
          setError(data.error || '任务执行失败，请重试');
          stopPolling();
        }
      } catch (err) {
        console.error('轮询鲁棒性评估结果失败:', err);
        // 网络错误时不停止轮询，继续重试
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // ── 图片上传处理 ────────────────────────────────────────────────────────────
  const handleImageUpload = useCallback((file, dataUrl) => {
    setImagePreview(dataUrl);
    setImageBase64(dataUrl);
  }, []);

  // ── 提交评估任务 ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!imageBase64) return;
    if (selectedAlgorithms.length === 0) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    setTaskId(null);
    setTaskStatus('pending');

    try {
      const response = await submitRobustnessEvaluation({
        image: imageBase64,
        algorithms: selectedAlgorithms,
      });
      setTaskId(response.task_id);
      setTaskStatus(response.status || 'pending');
      startPolling(response.task_id);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || '提交失败，请重试';
      setError(errMsg);
      setTaskStatus('failed');
    } finally {
      setSubmitting(false);
    }
  }, [imageBase64, selectedAlgorithms, startPolling]);

  // ── 重置状态 ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopPolling();
    setImagePreview(null);
    setImageBase64(null);
    setSelectedAlgorithms(['fgsm']);
    setTaskId(null);
    setTaskStatus('idle');
    setResult(null);
    setError(null);
    setSubmitting(false);
  }, [stopPolling]);

  // ── 重新提交（失败后） ──────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(null);
    setTaskStatus('idle');
    setResult(null);
    handleSubmit();
  }, [handleSubmit]);

  // ── 状态标签 ────────────────────────────────────────────────────────────────
  const statusTag = {
    idle: null,
    pending: <Tag color="processing">排队中</Tag>,
    running: <Tag color="processing">评估中</Tag>,
    completed: <Tag color="success">已完成</Tag>,
    failed: <Tag color="error">失败</Tag>,
  }[taskStatus];

  const isRunning = taskStatus === 'pending' || taskStatus === 'running';
  const canSubmit = !!imageBase64 && selectedAlgorithms.length > 0 && !isRunning;

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <Space>
              <ExperimentOutlined />
              对抗样本鲁棒性评估
            </Space>
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            对生成的对抗样本施加防御变换（高斯模糊、JPEG 压缩、位深度压缩），评估攻击算法在防御场景下的鲁棒性。
          </Paragraph>
        </div>
        {statusTag && <div style={{ marginTop: 4 }}>{statusTag}</div>}
      </div>

      <Row gutter={24}>
        {/* 左侧：配置区域 */}
        <Col xs={24} lg={10}>
          <Card
            title="评估配置"
            variant="borderless"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={isRunning}
                size="small"
              >
                重置
              </Button>
            }
          >
            {/* 图片上传 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                待评估图片
              </Text>
              <ImageUploader
                onUpload={handleImageUpload}
                preview={imagePreview}
              />
            </div>

            {/* 攻击算法多选 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                攻击算法
                <Tooltip title="选择一种或多种攻击算法，系统将对每种算法生成对抗样本并评估防御效果">
                  <InfoCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
              </Text>
              <Checkbox.Group
                value={selectedAlgorithms}
                onChange={setSelectedAlgorithms}
                disabled={isRunning}
              >
                <Space direction="vertical" size={8}>
                  {ALGORITHM_OPTIONS.map((opt) => (
                    <Checkbox key={opt.value} value={opt.value}>
                      <Space size={6}>
                        <Text strong>{opt.label}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {opt.description}
                        </Text>
                      </Space>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
              {selectedAlgorithms.length === 0 && (
                <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  请至少选择一种攻击算法
                </Text>
              )}
            </div>

            {/* 防御方法说明 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                防御方法（固定）
              </Text>
              <Space wrap>
                {Object.values(DEFENSE_LABELS).map((label) => (
                  <Tag key={label} color="blue">{label}</Tag>
                ))}
              </Space>
            </div>

            {/* 提交按钮 */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              icon={<ExperimentOutlined />}
            >
              {isRunning ? '评估中...' : '开始评估'}
            </Button>

            {/* 进度指示器 */}
            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={taskStatus === 'running' ? 60 : 20}
                  status="active"
                  format={() => taskStatus === 'running' ? '评估中' : '排队中'}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {taskStatus === 'pending'
                    ? '任务已提交，等待执行...'
                    : '正在对每种攻击算法施加防御变换并评估成功率...'}
                </Text>
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <Alert
                message="评估失败"
                description={error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                action={
                  <Button
                    size="small"
                    type="primary"
                    danger
                    onClick={handleRetry}
                    disabled={!imageBase64 || selectedAlgorithms.length === 0}
                  >
                    重新提交
                  </Button>
                }
              />
            )}
          </Card>
        </Col>

        {/* 右侧：结果区域 */}
        <Col xs={24} lg={14}>
          {/* 等待状态 */}
          {isRunning && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '48px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  正在评估 {selectedAlgorithms.length} 种攻击算法 × 3 种防御方法的组合...
                </Text>
              </div>
              {taskId && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    任务 ID：{taskId}
                  </Text>
                </div>
              )}
            </Card>
          )}

          {/* 结果矩阵 */}
          {taskStatus === 'completed' && result && (
            <>
              <Card variant="borderless">
                <Space>
                  <Tag color="success">评估完成</Tag>
                  {result.time_elapsed && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      耗时：{result.time_elapsed.toFixed(2)} 秒
                    </Text>
                  )}
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                  下表展示每种攻击算法在各防御方法下的攻击成功率。
                  成功率越低（绿色）表示防御越有效；成功率越高（红色）表示攻击越鲁棒。
                </Paragraph>
              </Card>

              <RobustnessMatrix
                matrix={result.matrix}
                algorithms={result.algorithms}
                defenses={result.defenses}
              />
            </>
          )}

          {/* 初始空状态 */}
          {taskStatus === 'idle' && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '48px 0' }}>
              <SafetyOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  上传图片并选择攻击算法后，点击「开始评估」查看攻防矩阵
                </Text>
              </div>
            </Card>
          )}

          {/* 失败空状态（无重试按钮，已在左侧 Alert 中提供） */}
          {taskStatus === 'failed' && !isRunning && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '48px 0' }}>
              <Text type="danger" style={{ fontSize: 16 }}>
                评估任务失败，请在左侧查看错误详情并重新提交
              </Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default RobustnessPage;
