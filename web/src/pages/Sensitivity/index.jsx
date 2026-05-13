/**
 * 攻击参数敏感性分析页面
 * 关联需求：Requirement 9
 *
 * 功能：
 * - 选择攻击算法（单选）
 * - 上传图片
 * - 配置扫描参数：参数名（根据算法自动填充）、最小值、最大值、步数（1–20）
 * - 提交扫描任务并轮询进度
 * - 折线图展示攻击成功率和 L2 扰动大小随参数变化的规律
 * - 失败步骤跳过并在图表下方列出错误信息
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import {
  DotChartOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ImageUploader from '../../components/business/ImageUploader';
import { getSensitivityResult, submitSensitivityScan } from '../../api/sensitivity';

const { Title, Paragraph, Text } = Typography;

// ─── 常量 ────────────────────────────────────────────────────────────────────

/** 算法列表及其可扫描参数 */
const ALGORITHM_OPTIONS = [
  { value: 'fgsm', label: 'FGSM', description: '快速梯度符号法（单步）', scanParam: 'epsilon' },
  { value: 'ifgsm', label: 'I-FGSM', description: '迭代快速梯度符号法', scanParam: 'epsilon' },
  { value: 'pgd', label: 'PGD', description: '投影梯度下降攻击', scanParam: 'epsilon' },
  { value: 'cw', label: 'C&W', description: 'Carlini & Wagner 优化攻击', scanParam: 'c' },
  { value: 'deepfool', label: 'DeepFool', description: '最小扰动寻找攻击', scanParam: 'overshoot' },
];

/** 每种算法的扫描参数默认范围 */
const PARAM_DEFAULTS = {
  epsilon: { min: 0.01, max: 0.3, label: 'epsilon（扰动幅度）' },
  c: { min: 0.1, max: 5.0, label: 'c（正则化系数）' },
  overshoot: { min: 0.001, max: 0.1, label: 'overshoot（过冲量）' },
};

const POLL_INTERVAL_MS = 2000;

// ─── SensitivityChart 子组件 ──────────────────────────────────────────────────

/**
 * 折线图：X 轴为参数取值，Y 轴为攻击成功率（左）和 L2 扰动大小（右）
 * 仅展示 status === 'ok' 的数据点；失败步骤在图表下方列出
 */
const SensitivityChart = ({ dataPoints, scanParam, algorithm }) => {
  if (!dataPoints || dataPoints.length === 0) return null;

  // 过滤出成功的数据点用于绘图
  const chartData = dataPoints
    .filter((p) => p.status === 'ok' && p.success_rate !== null && p.l2_norm !== null)
    .map((p) => ({
      paramValue: parseFloat(p.param_value.toFixed(5)),
      successRate: parseFloat((p.success_rate * 100).toFixed(2)),
      l2Norm: parseFloat(p.l2_norm.toFixed(4)),
    }));

  // 失败的步骤
  const failedPoints = dataPoints.filter((p) => p.status === 'failed');

  const paramLabel = PARAM_DEFAULTS[scanParam]?.label || scanParam;

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        style={{
          background: 'rgba(30,30,40,0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 6, color: '#aaa' }}>
          {paramLabel}：<strong style={{ color: '#fff' }}>{label}</strong>
        </div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 2 }}>
            {entry.name}：<strong>{entry.value}</strong>
            {entry.dataKey === 'successRate' ? '%' : ''}
          </div>
        ))}
      </div>
    );
  };

  // 自定义数据点标注
  const CustomDot = (props) => {
    const { cx, cy, value, stroke } = props;
    if (cx === undefined || cy === undefined) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill={stroke} stroke="#fff" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill={stroke}
          fontSize={10}
          fontWeight={600}
        >
          {value}
        </text>
      </g>
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>敏感性分析结果</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              算法：{algorithm?.toUpperCase()} · 扫描参数：{paramLabel}
            </Text>
          </Space>
        }
        variant="borderless"
        style={{ marginTop: 24 }}
      >
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
            <DotChartOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <div>暂无成功的数据点可供绘图</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="paramValue"
                label={{
                  value: paramLabel,
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#aaa',
                  fontSize: 12,
                }}
                tick={{ fill: '#aaa', fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                label={{
                  value: '攻击成功率 (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#60a5fa',
                  fontSize: 12,
                }}
                tick={{ fill: '#60a5fa', fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: 'L2 扰动大小',
                  angle: 90,
                  position: 'insideRight',
                  offset: 10,
                  fill: '#34d399',
                  fontSize: 12,
                }}
                tick={{ fill: '#34d399', fontSize: 11 }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
                formatter={(value) => (
                  <span style={{ color: '#ccc' }}>{value}</span>
                )}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="successRate"
                name="攻击成功率 (%)"
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 7, stroke: '#60a5fa', strokeWidth: 2 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="l2Norm"
                name="L2 扰动大小"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 7, stroke: '#34d399', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* 失败步骤错误信息列表 */}
        {failedPoints.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              以下步骤执行失败（已在图表中跳过）：
            </Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {failedPoints.map((p, idx) => (
                <Alert
                  key={idx}
                  type="warning"
                  showIcon
                  message={
                    <span>
                      <Text strong>{PARAM_DEFAULTS[scanParam]?.label || scanParam} = {p.param_value.toFixed(5)}</Text>
                      {' — '}
                      <Text type="secondary">{p.error || '任务执行失败'}</Text>
                    </span>
                  }
                  style={{ padding: '4px 12px' }}
                />
              ))}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── 主页面组件 ───────────────────────────────────────────────────────────────

const SensitivityPage = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('fgsm');
  const [paramMin, setParamMin] = useState(0.01);
  const [paramMax, setParamMax] = useState(0.3);
  const [steps, setSteps] = useState(5);

  const [scanId, setScanId] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // idle | running | completed | partial | failed
  const [scanResult, setScanResult] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pollTimerRef = useRef(null);

  // 当前算法的可扫描参数
  const currentAlgo = ALGORITHM_OPTIONS.find((a) => a.value === selectedAlgorithm);
  const scanParam = currentAlgo?.scanParam || 'epsilon';
  const paramInfo = PARAM_DEFAULTS[scanParam] || { min: 0, max: 1, label: scanParam };

  // 切换算法时重置参数范围
  useEffect(() => {
    const info = PARAM_DEFAULTS[currentAlgo?.scanParam] || { min: 0.01, max: 0.3 };
    setParamMin(info.min);
    setParamMax(info.max);
  }, [selectedAlgorithm]);

  // ── 清理轮询定时器 ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── 轮询扫描结果 ────────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (id) => {
      stopPolling();
      pollTimerRef.current = setInterval(async () => {
        try {
          const data = await getSensitivityResult(id);
          setScanStatus(data.status);
          setScanResult(data);
          setCompletedSteps(data.completed + data.failed);
          setTotalSteps(data.steps);

          if (data.status === 'completed') {
            stopPolling();
          }
        } catch (err) {
          console.error('轮询敏感性分析结果失败:', err);
          // 网络错误时不停止轮询，继续重试
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  // ── 图片上传处理 ────────────────────────────────────────────────────────────
  const handleImageUpload = useCallback((file, dataUrl) => {
    setImagePreview(dataUrl);
    setImageBase64(dataUrl);
  }, []);

  // ── 提交扫描任务 ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!imageBase64) return;

    // 前端校验
    if (paramMin >= paramMax) {
      setError('参数最小值必须小于最大值');
      return;
    }
    if (steps < 1 || steps > 20) {
      setError('步数必须在 1 到 20 之间');
      return;
    }

    setSubmitting(true);
    setError(null);
    setScanResult(null);
    setScanId(null);
    setScanStatus('running');
    setCompletedSteps(0);
    setTotalSteps(steps);

    try {
      const response = await submitSensitivityScan({
        algorithm: selectedAlgorithm,
        image: imageBase64,
        scan_param: scanParam,
        param_min: paramMin,
        param_max: paramMax,
        steps,
      });
      setScanId(response.scan_id);
      setTotalSteps(response.steps);
      startPolling(response.scan_id);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const errMsg =
        typeof detail === 'object'
          ? detail?.message || JSON.stringify(detail)
          : detail || err?.message || '提交失败，请重试';
      setError(errMsg);
      setScanStatus('failed');
    } finally {
      setSubmitting(false);
    }
  }, [imageBase64, selectedAlgorithm, scanParam, paramMin, paramMax, steps, startPolling]);

  // ── 重置状态 ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopPolling();
    setImagePreview(null);
    setImageBase64(null);
    setSelectedAlgorithm('fgsm');
    setScanId(null);
    setScanStatus('idle');
    setScanResult(null);
    setCompletedSteps(0);
    setTotalSteps(0);
    setError(null);
    setSubmitting(false);
  }, [stopPolling]);

  const isRunning = scanStatus === 'running' || scanStatus === 'partial';
  const canSubmit = !!imageBase64 && !isRunning && paramMin < paramMax && steps >= 1 && steps <= 20;

  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <Space>
            <LineChartOutlined />
            攻击参数敏感性分析
          </Space>
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          固定图片，自动扫描某个参数的多个取值，观察攻击成功率和扰动大小随参数变化的规律。
        </Paragraph>
      </div>

      <Row gutter={24}>
        {/* 左侧：配置区域 */}
        <Col xs={24} lg={10}>
          <Card
            title="扫描配置"
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
            {/* 算法选择 */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                攻击算法
              </Text>
              <Radio.Group
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value)}
                disabled={isRunning}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {ALGORITHM_OPTIONS.map((opt) => (
                    <Radio key={opt.value} value={opt.value}>
                      <Space size={6}>
                        <Text strong>{opt.label}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {opt.description}
                        </Text>
                      </Space>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>

            {/* 图片上传 */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                待分析图片
              </Text>
              <ImageUploader onUpload={handleImageUpload} preview={imagePreview} />
            </div>

            {/* 扫描参数配置 */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                扫描参数配置
                <Tooltip title="系统将在 [最小值, 最大值] 范围内均匀采样指定步数的参数值，并为每个值提交一次攻击任务">
                  <InfoCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
              </Text>

              {/* 参数名（只读，根据算法自动填充） */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  扫描参数
                </Text>
                <Select
                  value={scanParam}
                  disabled
                  style={{ width: '100%' }}
                  options={[{ value: scanParam, label: paramInfo.label }]}
                />
              </div>

              {/* 最小值 / 最大值 */}
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    最小值
                  </Text>
                  <InputNumber
                    value={paramMin}
                    onChange={(v) => setParamMin(v ?? 0)}
                    min={0}
                    step={0.001}
                    precision={5}
                    style={{ width: '100%' }}
                    disabled={isRunning}
                    status={paramMin >= paramMax ? 'error' : ''}
                  />
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    最大值
                  </Text>
                  <InputNumber
                    value={paramMax}
                    onChange={(v) => setParamMax(v ?? 0)}
                    min={0}
                    step={0.001}
                    precision={5}
                    style={{ width: '100%' }}
                    disabled={isRunning}
                    status={paramMin >= paramMax ? 'error' : ''}
                  />
                </Col>
              </Row>
              {paramMin >= paramMax && (
                <Text type="danger" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  最小值必须小于最大值
                </Text>
              )}

              {/* 步数 */}
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  步数（1–20）
                </Text>
                <InputNumber
                  value={steps}
                  onChange={(v) => setSteps(Math.max(1, Math.min(20, Math.round(v ?? 1))))}
                  min={1}
                  max={20}
                  precision={0}
                  style={{ width: '100%' }}
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* 提交按钮 */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              icon={<LineChartOutlined />}
            >
              {isRunning ? '扫描中...' : '开始扫描'}
            </Button>

            {/* 进度条 */}
            {(isRunning || scanStatus === 'completed') && totalSteps > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {isRunning ? '扫描进度' : '扫描完成'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {completedSteps} / {totalSteps} 步
                  </Text>
                </div>
                <Progress
                  percent={progressPercent}
                  status={isRunning ? 'active' : 'success'}
                  strokeColor={isRunning ? '#1677ff' : '#52c41a'}
                />
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <Alert
                message="提交失败"
                description={error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                closable
                onClose={() => setError(null)}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：结果区域 */}
        <Col xs={24} lg={14}>
          {/* 初始空状态 */}
          {scanStatus === 'idle' && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '64px 0' }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  配置扫描参数并上传图片后，点击「开始扫描」查看敏感性分析结果
                </Text>
              </div>
            </Card>
          )}

          {/* 运行中状态 */}
          {isRunning && !scanResult && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '64px 0' }}>
              <LineChartOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
              <div>
                <Text type="secondary">
                  正在扫描 {totalSteps} 个参数取值，请稍候...
                </Text>
              </div>
              {scanId && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    扫描 ID：{scanId}
                  </Text>
                </div>
              )}
            </Card>
          )}

          {/* 有结果时展示图表（运行中也实时展示已完成的数据） */}
          {scanResult && scanResult.data_points && (
            <SensitivityChart
              dataPoints={scanResult.data_points}
              scanParam={scanResult.scan_param || scanParam}
              algorithm={scanResult.algorithm || selectedAlgorithm}
            />
          )}

          {/* 失败状态 */}
          {scanStatus === 'failed' && !isRunning && !scanResult && (
            <Card variant="borderless" style={{ textAlign: 'center', padding: '64px 0' }}>
              <Text type="danger" style={{ fontSize: 16 }}>
                扫描任务提交失败，请在左侧查看错误详情并重新提交
              </Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default SensitivityPage;
