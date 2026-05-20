import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Button,
  Col,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  App,
} from 'antd';
import { MinusCircleOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  SpotlightCard, TextGenerateEffect, FocusCards, GlowingEffect,
} from '../../components/Aceternity';
import { BlurFade, HyperText, GlareHover } from '../../components/MagicUI';
import { useAttackStore } from '../../store/attackStore';

import { submitCWAttack, getAttackTaskStatus as getCWTaskStatus } from '../../api/attacks/cw';
import { submitFGSMAttack, getAttackTaskStatus as getFGSMTaskStatus } from '../../api/attacks/fgsm';
import { submitPGDAttack, getAttackTaskStatus as getPGDTaskStatus } from '../../api/attacks/pgd';
import { submitIFGSMAttack, getAttackTaskStatus as getIFGSMTaskStatus } from '../../api/attacks/ifgsm';
import { submitDeepFoolAttack, getAttackTaskStatus as getDeepFoolTaskStatus } from '../../api/attacks/deepfool';

const { Text } = Typography;

const ALGO_COLORS = { fgsm: '#3b82f6', ifgsm: '#8b5cf6', pgd: '#06b6d4', cw: '#f59e0b', deepfool: '#10b981' };

const statusConfig = {
  completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.15)' },
  failed: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.15)' },
  running: { color: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
  pending: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  idle: { color: '#9ca3af', bg: 'rgba(156,163,175,0.06)', border: 'rgba(156,163,175,0.12)' },
};

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const algorithmConfig = {
  fgsm: { label: 'FGSM', submit: submitFGSMAttack, poll: getFGSMTaskStatus, params: { epsilon: 0.03, targeted: false } },
  ifgsm: { label: 'I-FGSM', submit: submitIFGSMAttack, poll: getIFGSMTaskStatus, params: { epsilon: 0.03, alpha: 0.007, num_iter: 10, targeted: false } },
  pgd: { label: 'PGD', submit: submitPGDAttack, poll: getPGDTaskStatus, params: { epsilon: 0.03, alpha: 0.01, num_iter: 40, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' } },
  cw: { label: 'C&W', submit: submitCWAttack, poll: getCWTaskStatus, params: { c: 0.1, kappa: 0, lr: 0.01, max_iter: 500, binary_search_steps: 5, init_const: 0.01, targeted: false, abort_early: true, early_stop_iters: 50 } },
  deepfool: { label: 'DeepFool', submit: submitDeepFoolAttack, poll: getDeepFoolTaskStatus, params: { overshoot: 0.02, max_iter: 50, num_classes: 10 } },
};

const initialPanelState = (algorithm) => ({
  algorithm,
  paramsText: JSON.stringify(algorithmConfig[algorithm].params, null, 2),
  taskId: null,
  status: 'idle',
  progress: 0,
  message: '',
  result: null,
});

const formatPrediction = (prediction) => {
  if (!prediction) return '-';
  if (typeof prediction === 'string' || typeof prediction === 'number') return String(prediction);
  if (typeof prediction === 'object') {
    if (prediction.class_name) return String(prediction.class_name);
    if (prediction.label) return String(prediction.label);
  }
  return '-';
};

const ResultPreview = ({ title, panel, image }) => {
  const algoColor = ALGO_COLORS[panel.algorithm] || '#60a5fa';
  const stCfg = statusConfig[panel.status] || statusConfig.idle;

  return (
    <SpotlightCard spotlightColor={`${algoColor}08`} style={{ borderRadius: 20 }}>
      <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--xh-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: algoColor,
              boxShadow: `0 0 8px ${algoColor}66`,
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--xh-text)' }}>{title}</span>
          </div>
          <span style={{
            padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.border}`,
          }}>
            {panel.status}
          </span>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {panel.status !== 'idle' && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={panel.progress} status={panel.status === 'failed' ? 'exception' : 'active'} strokeColor={algoColor} />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>{panel.message || '等待任务更新...'}</Text>
            </div>
          )}

          {panel.result && (
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--xh-border)' }}>
                  <img src={panel.result.original_image || image} alt="原始图片" style={{ width: '100%', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8,
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                  }}>原始</div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--xh-border)' }}>
                  <img src={panel.result.adversarial_image} alt="对抗样本" style={{ width: '100%', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8,
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                  }}>对抗</div>
                </div>
              </Col>
              <Col span={24}>
                <div style={{
                  display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                  background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--xh-text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>原预测</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>{formatPrediction(panel.result.metadata?.original_prediction)}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--xh-border)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--xh-text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>对抗预测</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{formatPrediction(panel.result.metadata?.adversarial_prediction)}</div>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {panel.status === 'idle' && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--xh-text-tertiary)', fontSize: 13 }}>
              等待任务提交...
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
};

const CompareMode = () => {
  const { message } = App.useApp();
  const updateSlice = useAttackStore((s) => s.updateSlice);

  // 从 store 读取持久化状态
  const storedImageUrl = useAttackStore((s) => s.compare?.imageUrl ?? '');
  const storedPanels = useAttackStore((s) => s.compare?.panels ?? []);

  // 本地状态：优先使用 store 中的值
  const [imageUrl, setImageUrl] = useState(storedImageUrl);
  const [panels, setPanels] = useState(
    storedPanels.length > 0 ? storedPanels : [initialPanelState('fgsm'), initialPanelState('cw')]
  );
  const intervalsRef = useRef([]);

  // 同步状态到 store
  const syncToStore = useCallback((newImageUrl, newPanels) => {
    updateSlice('compare', { imageUrl: newImageUrl, panels: newPanels });
  }, [updateSlice]);

  const clearPolling = () => {
    intervalsRef.current.forEach((timer) => clearInterval(timer));
    intervalsRef.current = [];
  };

  useEffect(() => () => clearPolling(), []);

  const parseParams = (panel) => {
    try {
      return JSON.parse(panel.paramsText);
    } catch {
      throw new Error(`${algorithmConfig[panel.algorithm].label} 参数 JSON 无法解析`);
    }
  };

  const updatePanel = (index, updater) => {
    setPanels((prev) => {
      const newPanels = [...prev];
      newPanels[index] = updater(newPanels[index]);
      syncToStore(imageUrl, newPanels);
      return newPanels;
    });
  };

  // 组件挂载时，恢复正在运行的任务的轮询
  useEffect(() => {
    const RUNNING_STATUSES = new Set(['pending', 'running', 'processing']);
    panels.forEach((panel, index) => {
      if (panel.taskId && RUNNING_STATUSES.has(panel.status)) {
        const { poll } = algorithmConfig[panel.algorithm];
        const timer = setInterval(async () => {
          try {
            const task = await poll(panel.taskId);
            const normalizedResult = task.status === 'completed' && task.result
              ? { ...task.result, metadata: task.result.metadata && typeof task.result.metadata === 'object' ? task.result.metadata : {} }
              : null;
            updatePanel(index, (prev) => ({
              ...prev,
              status: task.status,
              progress: task.progress || (task.status === 'completed' ? 100 : prev.progress),
              message: task.message || task.error || '',
              result: task.status === 'completed' ? normalizedResult : prev.result,
            }));
            if (task.status === 'completed' || task.status === 'failed') clearInterval(timer);
          } catch (error) {
            clearInterval(timer);
            updatePanel(index, (prev) => ({ ...prev, status: 'failed', message: error.message || '轮询失败' }));
          }
        }, 2000);
        intervalsRef.current.push(timer);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitOne = async (index, panel) => {
    const { submit, poll } = algorithmConfig[panel.algorithm];
    const params = parseParams(panel);
    const response = await submit({ image: imageUrl, model_name: 'resnet100_imagenet', params });
    updatePanel(index, (prev) => ({ ...prev, taskId: response.task_id, status: 'pending', progress: 0, message: '任务已提交', result: null }));

    const timer = setInterval(async () => {
      try {
        const task = await poll(response.task_id);
        const normalizedResult = task.status === 'completed' && task.result
          ? { ...task.result, metadata: task.result.metadata && typeof task.result.metadata === 'object' ? task.result.metadata : {} }
          : null;
        updatePanel(index, (prev) => ({
          ...prev,
          status: task.status,
          progress: task.progress || (task.status === 'completed' ? 100 : prev.progress),
          message: task.message || task.error || '',
          result: task.status === 'completed' ? normalizedResult : prev.result,
        }));
        if (task.status === 'completed' || task.status === 'failed') clearInterval(timer);
      } catch (error) {
        clearInterval(timer);
        updatePanel(index, (prev) => ({ ...prev, status: 'failed', message: error.message || '轮询失败' }));
      }
    }, 2000);
    intervalsRef.current.push(timer);
  };

  const handleRun = async () => {
    if (!imageUrl) { message.warning('请先上传图片'); return; }
    clearPolling();
    try {
      await Promise.all(panels.map((panel, index) => submitOne(index, panel)));
      message.success(`${panels.length} 个任务已提交`);
    } catch (error) {
      message.error(error.message || '任务提交失败');
    }
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const newImageUrl = event.target.result;
      setImageUrl(newImageUrl);
      syncToStore(newImageUrl, panels);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const comparisonSummary = useMemo(() => {
    if (panels.length === 0 || !panels.every((p) => p.result)) return null;
    return [
      { key: 'algorithm', label: '算法', render: (panel) => algorithmConfig[panel.algorithm].label },
      { key: 'success', label: '成功', render: (panel) => (panel.result.success ? '是' : '否') },
      { key: 'time', label: '耗时', render: (panel) => `${(panel.result.time_elapsed || 0).toFixed(2)} s` },
      { key: 'prediction', label: '对抗预测', render: (panel) => formatPrediction(panel.result.metadata?.adversarial_prediction) },
    ];
  }, [panels]);

  const resetAll = () => {
    clearPolling();
    setImageUrl('');
    const defaultPanels = [initialPanelState('fgsm'), initialPanelState('cw')];
    setPanels(defaultPanels);
    syncToStore('', defaultPanels);
  };

  const addPanel = () => {
    const availableAlgorithms = Object.keys(algorithmConfig);
    const usedAlgorithms = panels.map((p) => p.algorithm);
    const nextAlgorithm = availableAlgorithms.find((algo) => !usedAlgorithms.includes(algo)) || availableAlgorithms[0];
    setPanels((prev) => {
      const newPanels = [...prev, initialPanelState(nextAlgorithm)];
      syncToStore(imageUrl, newPanels);
      return newPanels;
    });
  };

  const removePanel = (index) => {
    if (panels.length <= 1) { message.warning('至少保留一个对比任务'); return; }
    clearPolling();
    setPanels((prev) => {
      const newPanels = prev.filter((_, i) => i !== index);
      syncToStore(imageUrl, newPanels);
      return newPanels;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 36px)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 180, background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.06), transparent 70%)', pointerEvents: 'none' }} />

            <HyperText
              text="COMPARE MODE"
              duration={800}
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#7c3aed',
                letterSpacing: 3, marginBottom: 16,
                padding: '4px 14px', borderRadius: 999,
                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)',
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <TextGenerateEffect
                words="智能对比模式"
                duration={0.6}
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--xh-text-secondary)', maxWidth: 520, margin: '0 auto 20px' }}
            >
              同时提交多个攻击任务，在同一个界面查看进度和结果，方便比较不同算法或不同参数的输出。
            </motion.p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <Upload beforeUpload={handleUpload} showUploadList={false}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button icon={<UploadOutlined />} style={{ borderRadius: 10, fontWeight: 600, height: 40 }}>上传图片</Button>
                </motion.div>
              </Upload>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun} style={{ borderRadius: 10, fontWeight: 600, height: 40 }}>
                  同时提交 {panels.length} 个任务
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button icon={<PlusOutlined />} onClick={addPanel} style={{ borderRadius: 10, fontWeight: 600, height: 40 }}>添加对比</Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button icon={<ReloadOutlined />} onClick={resetAll} style={{ borderRadius: 10, fontWeight: 600, height: 40 }}>重置</Button>
              </motion.div>
            </div>

            {imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginTop: 20, display: 'inline-block' }}
              >
                <img src={imageUrl} alt="已上传" style={{ maxWidth: 200, borderRadius: 14, border: '1px solid var(--xh-border)' }} />
              </motion.div>
            )}
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Config panels */}
      <Row gutter={[16, 16]}>
        {panels.map((panel, index) => (
          <Col xs={24} xl={Math.min(12, 24 / panels.length)} key={index}>
            <BlurFade delay={0.1 + index * 0.08}>
              <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
                <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                  <GlowingEffect spread={35} proximity={100} />
                  <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--xh-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: `${ALGO_COLORS[panel.algorithm] || '#60a5fa'}10`,
                        border: `1px solid ${ALGO_COLORS[panel.algorithm] || '#60a5fa'}18`,
                        display: 'grid', placeItems: 'center',
                        fontSize: 10, fontWeight: 800, color: ALGO_COLORS[panel.algorithm] || '#60a5fa',
                      }}>
                        {(panel.algorithm || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--xh-text)' }}>任务 {index + 1}</span>
                    </div>
                    {panels.length > 1 && (
                      <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removePanel(index)} size="small">
                        移除
                      </Button>
                    )}
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <Select
                        value={panel.algorithm}
                        options={Object.entries(algorithmConfig).map(([value, item]) => ({ value, label: item.label }))}
                        onChange={(value) => updatePanel(index, () => initialPanelState(value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <Input.TextArea
                      rows={8}
                      value={panel.paramsText}
                      onChange={(event) => updatePanel(index, (prev) => ({ ...prev, paramsText: event.target.value }))}
                      style={{ borderRadius: 10, fontSize: 12, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </SpotlightCard>
            </BlurFade>
          </Col>
        ))}
      </Row>

      {/* Result panels — FocusCards for blur-on-hover-others effect */}
      <BlurFade delay={0.2}>
        <FocusCards
          cards={panels}
          style={{ gridTemplateColumns: `repeat(${Math.min(panels.length, 3)}, minmax(280px, 1fr))` }}
          renderItem={(panel, index) => (
            <ResultPreview title={`任务 ${index + 1} 结果`} panel={panel} image={imageUrl} />
          )}
        />
      </BlurFade>

      {/* Comparison summary */}
      {comparisonSummary && (
        <BlurFade delay={0.4}>
          <SpotlightCard spotlightColor="rgba(124,58,237,0.03)" style={{ borderRadius: 20 }}>
            <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
              <GlowingEffect spread={40} proximity={120} />
              <div style={{
                padding: '16px 24px', borderBottom: '1px solid var(--xh-border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.4)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>结果对比摘要</span>
              </div>
              <div style={{ padding: '8px 16px 16px' }}>
                <Table
                  dataSource={comparisonSummary}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '指标', dataIndex: 'label', key: 'label', width: 120, render: (v) => <span style={{ fontWeight: 600, color: 'var(--xh-text-secondary)' }}>{v}</span> },
                    ...panels.map((panel, index) => ({
                      title: (
                        <span style={{ color: ALGO_COLORS[panel.algorithm] || '#60a5fa', fontWeight: 700 }}>
                          {algorithmConfig[panel.algorithm].label}
                        </span>
                      ),
                      key: index,
                      render: (_, record) => <span style={{ fontWeight: 600, color: 'var(--xh-text)' }}>{record.render(panel)}</span>,
                    })),
                  ]}
                />
              </div>
            </div>
          </SpotlightCard>
        </BlurFade>
      )}
    </div>
  );
};

export default CompareMode;
