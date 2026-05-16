/**
 * CompareMode — 多算法对比模式（支持 2–4 个面板）
 *
 * 关联需求：Requirement 3, 4, 5, 6
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  PlusOutlined,
  MinusCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { submitCWAttack, getAttackTaskStatus as getCWTaskStatus } from '../../api/attacks/cw';
import { submitFGSMAttack, getAttackTaskStatus as getFGSMTaskStatus } from '../../api/attacks/fgsm';
import { submitPGDAttack, getAttackTaskStatus as getPGDTaskStatus } from '../../api/attacks/pgd';
import { submitIFGSMAttack, getAttackTaskStatus as getIFGSMTaskStatus } from '../../api/attacks/ifgsm';
import { submitDeepFoolAttack, getAttackTaskStatus as getDeepFoolTaskStatus } from '../../api/attacks/deepfool';
import { uploadImage } from '../../api/files';
import AlgorithmParamEditor, { DEFAULT_PARAMS } from '../../components/params/AlgorithmParamEditor';
import ExportButtons from '../../components/export/ExportButtons';
import PerturbationViewer from '../../components/Visualization/PerturbationViewer';
import ModelSelector from './shared/ModelSelector';

const { Title, Text, Paragraph } = Typography;

// ─── 算法配置 ────────────────────────────────────────────────────────────────

const algorithmConfig = {
  fgsm: {
    label: 'FGSM',
    submit: submitFGSMAttack,
    poll: getFGSMTaskStatus,
  },
  ifgsm: {
    label: 'I-FGSM',
    submit: submitIFGSMAttack,
    poll: getIFGSMTaskStatus,
  },
  pgd: {
    label: 'PGD',
    submit: submitPGDAttack,
    poll: getPGDTaskStatus,
  },
  cw: {
    label: 'C&W',
    submit: submitCWAttack,
    poll: getCWTaskStatus,
  },
  deepfool: {
    label: 'DeepFool',
    submit: submitDeepFoolAttack,
    poll: getDeepFoolTaskStatus,
  },
};

// ─── 面板初始状态工厂 ────────────────────────────────────────────────────────

const ALGO_TASK_TYPES = {
  fgsm: ['classification', 'detection'],
  ifgsm: ['classification', 'detection'],
  pgd: ['classification', 'detection'],
  cw: ['classification'],
  deepfool: ['classification'],
};

const createPanel = (algorithm = 'fgsm') => ({
  id: Date.now() + Math.random(), // 唯一标识，用于 key
  algorithm,
  modelName: 'resnet100_imagenet',
  params: { ...DEFAULT_PARAMS[algorithm] },
  taskId: null,
  status: 'idle',
  progress: 0,
  message: '',
  result: null,
});

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const formatPrediction = (prediction) => {
  if (!prediction) return '-';
  if (typeof prediction === 'string' || typeof prediction === 'number') return String(prediction);
  if (typeof prediction === 'object') {
    if (prediction.class_name) return String(prediction.class_name);
    if (prediction.label) return String(prediction.label);
  }
  return '-';
};

// 通用：用于结果区图片，避免被文本选中变蓝/被拖动
const noSelectImgStyle = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitUserDrag: 'none',
  pointerEvents: 'none',
};

/**
 * isMetricValid — 检查指标值是否在有效范围内
 *
 * 关联需求：Requirement 5.2 / P7
 *
 * @param {number|null|undefined} value - 指标值
 * @param {'l2_norm'|'linf_norm'|'success_rate'|'orig_confidence'|'adv_confidence'|'time_elapsed'} type - 指标类型
 * @returns {boolean} true 表示有效，false 表示异常
 */
export const isMetricValid = (value, type) => {
  if (value === null || value === undefined || typeof value !== 'number' || !isFinite(value)) {
    return false;
  }
  switch (type) {
    case 'l2_norm':
      return value >= 0;
    case 'linf_norm':
      return value >= 0;
    case 'success_rate':
      return value >= 0 && value <= 100;
    case 'orig_confidence':
      return value >= 0 && value <= 1;
    case 'adv_confidence':
      return value >= 0 && value <= 1;
    case 'time_elapsed':
      return value > 0;
    default:
      return true;
  }
};

/**
 * MetricCell — 渲染单个指标值，异常时显示红色「数据异常」Tag
 */
const MetricCell = ({ value, type, formatter }) => {
  const valid = isMetricValid(value, type);
  if (!valid) {
    return <Tag color="red">数据异常</Tag>;
  }
  return <span>{formatter ? formatter(value) : String(value)}</span>;
};

// ─── 单面板详细指标 ──────────────────────────────────────────────────────────

const PanelMetrics = ({ result }) => {
  if (!result) return null;

  const meta = result.metadata || {};
  const l2 = meta.l2_norm;
  const linf = meta.linf_norm;
  // success_rate from backend is 0–1, convert to 0–100 for display
  const successRateRaw = meta.success_rate;
  const successRate = typeof successRateRaw === 'number' ? successRateRaw * 100 : successRateRaw;
  const origConf = meta.original_top1_confidence;
  const advConf = meta.adversarial_top1_confidence;
  const timeElapsed = result.time_elapsed;

  const rows = [
    {
      label: 'L2 范数',
      value: l2,
      type: 'l2_norm',
      formatter: (v) => v.toFixed(4),
    },
    {
      label: 'Linf 范数',
      value: linf,
      type: 'linf_norm',
      formatter: (v) => v.toFixed(4),
    },
    {
      label: '攻击成功率',
      value: successRate,
      type: 'success_rate',
      formatter: (v) => `${v.toFixed(1)}%`,
    },
    {
      label: '原始置信度',
      value: origConf,
      type: 'orig_confidence',
      formatter: (v) => v.toFixed(4),
    },
    {
      label: '对抗置信度',
      value: advConf,
      type: 'adv_confidence',
      formatter: (v) => v.toFixed(4),
    },
    {
      label: '执行耗时',
      value: timeElapsed,
      type: 'time_elapsed',
      formatter: (v) => `${v.toFixed(2)} s`,
    },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '6px 8px', color: '#666', whiteSpace: 'nowrap', width: '50%' }}>
              {row.label}
            </td>
            <td style={{ padding: '6px 8px', fontWeight: 500 }}>
              <MetricCell value={row.value} type={row.type} formatter={row.formatter} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── 单面板结果预览 ──────────────────────────────────────────────────────────

const ResultPreview = ({ panel, image }) => (
  <Space direction="vertical" size={12} style={{ width: '100%' }}>
    <Space wrap>
      <Tag color="blue">{algorithmConfig[panel.algorithm].label}</Tag>
      <Tag
        color={
          panel.status === 'completed'
            ? 'green'
            : panel.status === 'failed'
            ? 'red'
            : panel.status === 'idle'
            ? 'default'
            : 'gold'
        }
      >
        {panel.status}
      </Tag>
    </Space>
    {panel.status !== 'idle' && (
      <>
        <Progress
          percent={panel.progress}
          status={panel.status === 'failed' ? 'exception' : panel.status === 'completed' ? 'success' : 'active'}
        />
        <Text type="secondary">{panel.message || '等待任务更新...'}</Text>
      </>
    )}
    {panel.result && (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <img
              src={panel.result.original_image || image}
              alt="original"
              draggable={false}
              style={noSelectImgStyle}
            />
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 4 }}>
              原始图像
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <img
              src={panel.result.adversarial_image}
              alt="adversarial"
              draggable={false}
              style={noSelectImgStyle}
            />
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 4 }}>
              对抗样本
            </Text>
          </Col>
        </Row>

        {/* 扰动可视化三视图 */}
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
            扰动可视化
          </Text>
          <PerturbationViewer
            heatmap={panel.result.heatmap}
            amplifiedDiff={panel.result.amplified_diff}
            fftDiff={panel.result.fft_diff}
            width="100%"
            height={220}
          />
        </div>

        {/* 预测信息 */}
        <Paragraph style={{ marginBottom: 0 }}>
          原预测:{' '}
          <Text strong>
            {formatPrediction(panel.result.metadata?.original_prediction)}
          </Text>
          <br />
          对抗预测:{' '}
          <Text strong>
            {formatPrediction(panel.result.metadata?.adversarial_prediction)}
          </Text>
        </Paragraph>

        {/* 详细指标 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>详细指标</Text>
          <PanelMetrics result={panel.result} />
        </div>
      </Space>
    )}
  </Space>
);

// ─── 置信度柱状图 ────────────────────────────────────────────────────────────

const ConfidenceBarChart = ({ completedPanels }) => {
  const chartData = completedPanels.map((panel) => {
    const meta = panel.result?.metadata || {};
    return {
      name: algorithmConfig[panel.algorithm].label,
      原始置信度: isMetricValid(meta.original_top1_confidence, 'orig_confidence')
        ? parseFloat(meta.original_top1_confidence.toFixed(4))
        : null,
      对抗置信度: isMetricValid(meta.adversarial_top1_confidence, 'adv_confidence')
        ? parseFloat(meta.adversarial_top1_confidence.toFixed(4))
        : null,
    };
  });

  return (
    <div style={{ marginTop: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        置信度对比
      </Text>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip formatter={(value) => (value !== null ? value.toFixed(4) : '数据异常')} />
          <Legend />
          <Bar dataKey="原始置信度" fill="#4096ff" radius={[4, 4, 0, 0]} />
          <Bar dataKey="对抗置信度" fill="#ff7875" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 汇总指标表格（Ant Design Table） ────────────────────────────────────────

const SummaryTable = ({ completedPanels }) => {
  // 构建行数据：每行是一个指标，每列是一个面板
  const metricDefs = [
    {
      key: 'l2_norm',
      label: 'L2 范数',
      getValue: (r) => r?.metadata?.l2_norm,
      type: 'l2_norm',
      format: (v) => v.toFixed(4),
    },
    {
      key: 'linf_norm',
      label: 'Linf 范数',
      getValue: (r) => r?.metadata?.linf_norm,
      type: 'linf_norm',
      format: (v) => v.toFixed(4),
    },
    {
      key: 'success_rate',
      label: '攻击成功率',
      getValue: (r) => {
        const raw = r?.metadata?.success_rate;
        return typeof raw === 'number' ? raw * 100 : raw;
      },
      type: 'success_rate',
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'orig_confidence',
      label: '原始置信度',
      getValue: (r) => r?.metadata?.original_top1_confidence,
      type: 'orig_confidence',
      format: (v) => v.toFixed(4),
    },
    {
      key: 'adv_confidence',
      label: '对抗置信度',
      getValue: (r) => r?.metadata?.adversarial_top1_confidence,
      type: 'adv_confidence',
      format: (v) => v.toFixed(4),
    },
    {
      key: 'time_elapsed',
      label: '执行耗时',
      getValue: (r) => r?.time_elapsed,
      type: 'time_elapsed',
      format: (v) => `${v.toFixed(2)} s`,
    },
  ];

  // 列定义：第一列为指标名，后续列为各面板
  const columns = [
    {
      title: '指标',
      dataIndex: 'label',
      key: 'label',
      fixed: 'left',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    ...completedPanels.map((panel, idx) => ({
      title: (
        <Space size={4}>
          <Tag color="blue" style={{ margin: 0 }}>
            {algorithmConfig[panel.algorithm].label}
          </Tag>
        </Space>
      ),
      dataIndex: `panel_${idx}`,
      key: `panel_${idx}`,
      align: 'center',
    })),
  ];

  // 行数据
  const dataSource = metricDefs.map((def) => {
    const row = { key: def.key, label: def.label };
    completedPanels.forEach((panel, idx) => {
      const value = def.getValue(panel.result);
      const valid = isMetricValid(value, def.type);
      row[`panel_${idx}`] = valid ? (
        def.format(value)
      ) : (
        <Tag color="red">数据异常</Tag>
      );
    });
    return row;
  });

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }}
      bordered
    />
  );
};

// ─── 主组件 ──────────────────────────────────────────────────────────────────

const CompareMode = () => {
  const [imageUrl, setImageUrl] = useState('');
  // panels 数组，初始 2 个面板
  const [panels, setPanels] = useState([createPanel('fgsm'), createPanel('cw')]);
  // 每个面板对应一个 interval ref，用 Map<panelId, timerId> 管理
  const intervalsRef = useRef(new Map());
  // 结果区域 ref，用于导出截图
  const resultsRef = useRef(null);

  // 组件卸载时清除所有轮询
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((timer) => clearInterval(timer));
      intervalsRef.current.clear();
    };
  }, []);

  // ── 面板操作 ──────────────────────────────────────────────────────────────

  const addPanel = () => {
    if (panels.length >= 4) return;
    setPanels((prev) => [...prev, createPanel('fgsm')]);
  };

  const removePanel = (index) => {
    if (panels.length <= 2) return;
    const panel = panels[index];
    // 清除该面板的轮询
    const timer = intervalsRef.current.get(panel.id);
    if (timer) {
      clearInterval(timer);
      intervalsRef.current.delete(panel.id);
    }
    setPanels((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePanel = (index, updater) => {
    setPanels((prev) => {
      const next = [...prev];
      next[index] = updater(next[index]);
      return next;
    });
  };

  const handleAlgorithmChange = (index, algorithm) => {
    updatePanel(index, () => createPanel(algorithm));
  };

  const handleParamsChange = (index, newParams) => {
    updatePanel(index, (prev) => ({ ...prev, params: newParams }));
  };

  // ── 提交与轮询 ────────────────────────────────────────────────────────────

  const submitOne = async (index, panel) => {
    const { submit, poll } = algorithmConfig[panel.algorithm];

    const response = await submit({
      image: imageUrl,
      model_name: panel.modelName || 'resnet100_imagenet',
      params: panel.params,
    });

    updatePanel(index, (prev) => ({
      ...prev,
      taskId: response.task_id,
      status: 'pending',
      progress: 0,
      message: '任务已提交',
      result: null,
    }));

    // 清除该面板旧的轮询（如有）
    const oldTimer = intervalsRef.current.get(panel.id);
    if (oldTimer) clearInterval(oldTimer);

    const timer = setInterval(async () => {
      try {
        const task = await poll(response.task_id);
        const normalizedResult =
          task.status === 'completed' && task.result
            ? {
                ...task.result,
                metadata:
                  task.result.metadata && typeof task.result.metadata === 'object'
                    ? task.result.metadata
                    : {},
              }
            : null;

        updatePanel(index, (prev) => ({
          ...prev,
          status: task.status,
          progress: task.progress || (task.status === 'completed' ? 100 : prev.progress),
          message: task.message || task.error || '',
          result: task.status === 'completed' ? normalizedResult : prev.result,
        }));

        if (task.status === 'completed' || task.status === 'failed') {
          clearInterval(timer);
          intervalsRef.current.delete(panel.id);
        }
      } catch (error) {
        clearInterval(timer);
        intervalsRef.current.delete(panel.id);
        updatePanel(index, (prev) => ({
          ...prev,
          status: 'failed',
          message: error.message || '轮询失败',
        }));
      }
    }, 2000);

    intervalsRef.current.set(panel.id, timer);
  };

  const handleRun = async () => {
    if (!imageUrl) {
      message.warning('请先上传图片');
      return;
    }
    // 清除所有旧轮询
    intervalsRef.current.forEach((timer) => clearInterval(timer));
    intervalsRef.current.clear();

    try {
      const results = await Promise.allSettled(panels.map((panel, index) => submitOne(index, panel)));
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount === 0) {
        message.success(`已并发提交 ${panels.length} 个任务，请等待结果`);
      } else if (failedCount < panels.length) {
        message.warning(`${panels.length - failedCount} 个任务已提交，${failedCount} 个提交失败`);
      } else {
        message.error('所有任务提交失败');
      }
    } catch (error) {
      message.error(error.message || '任务提交失败');
    }
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setImageUrl(dataUrl);
      // 记录到后端文件库（静默）
      uploadImage(dataUrl, file.name, file.type || 'image/png').catch(() => {});
    };
    reader.readAsDataURL(file);
    return false;
  };

  const resetAll = () => {
    intervalsRef.current.forEach((timer) => clearInterval(timer));
    intervalsRef.current.clear();
    setImageUrl('');
    setPanels([createPanel('fgsm'), createPanel('cw')]);
  };

  // ── 汇总摘要（所有面板完成后展示） ───────────────────────────────────────

  const completedPanels = panels.filter((p) => p.status === 'completed' && p.result);
  const allCompleted =
    panels.length > 0 && panels.every((p) => p.status === 'completed' || p.status === 'failed');

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 顶部控制区 */}
      <Card style={{ borderRadius: 20 }}>
        <Title level={3} style={{ marginTop: 0 }}>
          对比模式
        </Title>
        <Paragraph style={{ marginBottom: 12 }}>
          同时提交 2–4 个攻击任务，在同一界面查看进度和结果，方便比较不同算法或不同参数的输出。
        </Paragraph>
        <Space wrap>
          <Upload beforeUpload={handleUpload} showUploadList={false}>
            <Button icon={<UploadOutlined />}>上传图片</Button>
          </Upload>
          <Button
            icon={<PlusOutlined />}
            onClick={addPanel}
            disabled={panels.length >= 4}
          >
            添加对比项
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
          >
            同时提交
          </Button>
          <Button icon={<ReloadOutlined />} onClick={resetAll}>
            重置
          </Button>
        </Space>
        {imageUrl && (
          <div style={{ marginTop: 16 }}>
            <img
              src={imageUrl}
              alt="upload"
              draggable={false}
              style={{
                maxWidth: 220,
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </Card>

      {/* 面板配置区 */}
      <Row gutter={[16, 16]}>
        {panels.map((panel, index) => (
          <Col
            key={panel.id}
            xs={24}
            xl={panels.length <= 2 ? 12 : panels.length === 3 ? 8 : 6}
          >
            <Card
              title={
                <Space>
                  <Text strong>面板 {index + 1}</Text>
                  <Tag color="blue">{algorithmConfig[panel.algorithm].label}</Tag>
                </Space>
              }
              extra={
                panels.length > 2 ? (
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => removePanel(index)}
                    size="small"
                  >
                    移除
                  </Button>
                ) : null
              }
              style={{ borderRadius: 18 }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Select
                  value={panel.algorithm}
                  options={Object.entries(algorithmConfig).map(([value, item]) => ({
                    value,
                    label: item.label,
                  }))}
                  onChange={(value) => handleAlgorithmChange(index, value)}
                  style={{ width: '100%' }}
                  disabled={panel.status !== 'idle'}
                />
                <ModelSelector
                  value={panel.modelName}
                  onChange={(id) => updatePanel(index, (prev) => ({ ...prev, modelName: id }))}
                  supportedTaskTypes={ALGO_TASK_TYPES[panel.algorithm] || ['classification']}
                  disabled={panel.status !== 'idle'}
                  renderHint={() => null}
                />
                <AlgorithmParamEditor
                  algorithm={panel.algorithm}
                  params={panel.params}
                  onChange={(newParams) => handleParamsChange(index, newParams)}
                  disabled={panel.status !== 'idle'}
                />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 面板结果区 */}
      <Row gutter={[16, 16]}>
        {panels.map((panel, index) => (
          <Col
            key={panel.id}
            xs={24}
            xl={panels.length <= 2 ? 12 : panels.length === 3 ? 8 : 6}
          >
            <Card
              title={`面板 ${index + 1} 结果`}
              size="small"
              style={{ borderRadius: 16 }}
            >
              <ResultPreview panel={panel} image={imageUrl} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 导出按钮区（至少一个面板完成时显示） */}
      {completedPanels.length > 0 && !allCompleted && (
        <Card size="small" style={{ borderRadius: 16 }}>
          <Space align="center">
            <span style={{ color: '#666' }}>
              已完成 {completedPanels.length} / {panels.length} 个面板，可导出当前结果：
            </span>
            <ExportButtons
              exportRef={resultsRef}
              completedPanels={completedPanels}
              algorithmConfig={algorithmConfig}
            />
          </Space>
        </Card>
      )}

      {/* 汇总摘要区（所有面板完成后展示） */}
      {allCompleted && completedPanels.length > 0 && (
        <Card title="结果对比摘要" style={{ borderRadius: 20 }}>
          {/* 导出按钮 */}
          <div style={{ marginBottom: 16 }}>
            <ExportButtons
              exportRef={resultsRef}
              completedPanels={completedPanels}
              algorithmConfig={algorithmConfig}
            />
          </div>

          {/* 可导出的结果区域 */}
          <div ref={resultsRef}>
            {/* 指标对比表格 */}
            <SummaryTable completedPanels={completedPanels} />

            {/* 置信度柱状图 */}
            <ConfidenceBarChart completedPanels={completedPanels} />
          </div>
        </Card>
      )}
    </Space>
  );
};

export default CompareMode;
