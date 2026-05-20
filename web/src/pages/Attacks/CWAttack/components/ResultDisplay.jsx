import React, { useState } from 'react';
import {
  Row, Col, Image, Tabs, Alert, Typography, Button, Table, App,
} from 'antd';
import {
  DownloadOutlined, ShareAltOutlined, LineChartOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import ComparisonSlider from '../../../../components/Visualization/ComparisonSlider';
import Heatmap from '../../../../components/Visualization/Heatmap';
import ConfidenceChart from '../../../../components/Visualization/ConfidenceChart';
import Lens from '../../../../components/MagicUI/Lens';
import GlowingEffect from '../../../../components/Aceternity/GlowingEffect';

const { Text } = Typography;

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const tabItems = [
  { key: '1', label: '对比视图' },
  { key: '2', label: '置信度分析' },
  { key: '3', label: '扰动分析' },
  { key: '4', label: '详细信息' },
];

const StatCard = ({ label, value, color = 'var(--xh-text)' }) => (
  <div style={{
    padding: '10px 14px', borderRadius: 10,
    background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
  }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--xh-text-tertiary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
  </div>
);

const ResultDisplay = ({ result, originalImageUrl, onSaveResult, onExportData, loading = false }) => {
  const [activeTab, setActiveTab] = useState('1');
  const { message } = App.useApp();

  if (!result) {
    return (
      <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.4)' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>攻击结果</span>
        </div>
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <LineChartOutlined style={{ fontSize: 48, color: 'var(--xh-text-tertiary)', opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)', marginTop: 16 }}>上传图片开始实验</div>
          <div style={{ fontSize: 13, color: 'var(--xh-text-tertiary)', marginTop: 6 }}>
            上传一张图片，调整参数后点击"同步执行"即可生成对抗样本
          </div>
        </div>
      </div>
    );
  }

  const originalImage = result.original_image || originalImageUrl;
  const metadata = result.metadata || {};
  const originalPrediction = metadata.original_prediction || null;
  const adversarialPrediction = metadata.adversarial_prediction || null;
  const originalTopClass = result.original_probs?.length
    ? result.original_probs.indexOf(Math.max(...result.original_probs))
    : null;
  const adversarialTopClass = result.adversarial_probs?.length
    ? result.adversarial_probs.indexOf(Math.max(...result.adversarial_probs))
    : null;

  const formatPredictionLabel = (prediction, fallbackClassId) => {
    if (prediction?.class_name) return `${prediction.class_name} (#${prediction.class_id})`;
    return fallbackClassId !== null ? `${fallbackClassId}` : '-';
  };

  const buildTop5 = (probs, top5FromMetadata) => {
    if (Array.isArray(top5FromMetadata) && top5FromMetadata.length > 0) {
      return top5FromMetadata.map((item, index) => ({
        key: `${item.class_id}-${index}`,
        class: item.class_id,
        className: item.class_name,
        probability: Number(((item.confidence || 0) * 100).toFixed(2)),
      }));
    }
    return (probs || [])
      .map((probability, index) => ({ key: index, class: index, className: null, probability: Number((probability * 100).toFixed(2)) }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
  };

  const originalTop5 = buildTop5(result.original_probs, metadata.original_top5);
  const adversarialTop5 = buildTop5(result.adversarial_probs, metadata.adversarial_top5);

  const top5Columns = [
    { title: '#', dataIndex: 'rank', key: 'rank', width: 40, render: (_, __, i) => <span style={{ fontWeight: 700, color: 'var(--xh-text-tertiary)' }}>{i + 1}</span> },
    { title: '类别', dataIndex: 'class', key: 'class', render: (classId, record) => <span style={{ fontWeight: 600 }}>{record.className || `${classId}`}</span> },
    {
      title: '置信度', dataIndex: 'probability', key: 'probability', width: 100,
      render: (p) => {
        const color = p > 50 ? '#16a34a' : p > 20 ? '#f59e0b' : '#6b7280';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--xh-border)' }}>
              <div style={{ width: `${p}%`, height: '100%', borderRadius: 2, background: color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 44, textAlign: 'right' }}>{p}%</span>
          </div>
        );
      },
    },
  ];

  const detailItems = [
    { label: '任务ID', value: result.task_id || 'N/A' },
    { label: '攻击状态', value: result.success ? '成功' : '失败', color: result.success ? '#16a34a' : '#dc2626' },
    { label: '成功率', value: metadata.success_rate !== undefined ? `${(metadata.success_rate * 100).toFixed(2)}%` : '-' },
    { label: '原始类别', value: formatPredictionLabel(originalPrediction, originalTopClass) },
    { label: '原始置信度', value: originalTopClass !== null ? `${((result.original_probs?.[originalTopClass] || 0) * 100).toFixed(2)}%` : '-' },
    { label: '对抗类别', value: formatPredictionLabel(adversarialPrediction, adversarialTopClass) },
    { label: '对抗置信度', value: adversarialTopClass !== null ? `${((result.adversarial_probs?.[adversarialTopClass] || 0) * 100).toFixed(2)}%` : '-' },
    { label: '扰动范数 L2', value: metadata.l2_norm?.toFixed?.(4) ?? '-' },
    { label: '扰动范数 Linf', value: metadata.linf_norm?.toFixed?.(4) ?? '-' },
    { label: '攻击耗时', value: result.time_elapsed != null ? `${result.time_elapsed.toFixed(2)} 秒` : '-' },
    { label: '迭代信息', value: metadata.iterations ?? metadata.num_iter ?? '-' },
    { label: '生成时间', value: result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A' },
  ];

  return (
    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
      <GlowingEffect spread={40} proximity={120} />
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--xh-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: result.success ? '#16a34a' : '#dc2626', boxShadow: `0 0 8px ${result.success ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)'}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>攻击结果</span>
          <span style={{
            padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: result.success ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
            color: result.success ? '#16a34a' : '#dc2626',
            border: `1px solid ${result.success ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'}`,
          }}>
            {result.success ? '成功' : '失败'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button size="small" icon={<DownloadOutlined />} onClick={() => onExportData?.(result)} disabled={loading} style={{ borderRadius: 8 }}>导出</Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button size="small" icon={<ShareAltOutlined />} onClick={() => { onSaveResult?.(result); message.success('结果已保存'); }} disabled={loading} style={{ borderRadius: 8 }}>保存</Button>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {!result.success && (
            <Alert
              message="攻击失败"
              description={result.error_message || "未能生成对抗样本，请尝试调整参数"}
              type="warning" showIcon closable
              style={{ marginBottom: 16, borderRadius: 12 }}
            />
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginBottom: 0 }}
          />

          <div style={{ marginTop: 16 }}>
            {/* Tab 1: Comparison View */}
            {activeTab === '1' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1677ff' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>原始图片</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <Lens zoomFactor={2} lensSize={140}>
                          <Image src={originalImage} style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} preview={false} />
                        </Lens>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
                          <StatCard label="预测类别" value={formatPredictionLabel(originalPrediction, originalTopClass)} />
                          <StatCard label="置信度" value={originalTopClass !== null ? `${((result.original_probs?.[originalTopClass] || 0) * 100).toFixed(2)}%` : '-'} color="#1677ff" />
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: result.success ? '#16a34a' : '#dc2626' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>对抗样本</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        {result.adversarial_image ? (
                          <>
                            <Lens zoomFactor={2} lensSize={140}>
                              <Image src={result.adversarial_image} style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} preview={false} />
                            </Lens>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
                              <StatCard label="预测类别" value={formatPredictionLabel(adversarialPrediction, adversarialTopClass)} />
                              <StatCard label="置信度" value={adversarialTopClass !== null ? `${((result.adversarial_probs?.[adversarialTopClass] || 0) * 100).toFixed(2)}%` : '-'} color={result.success ? '#16a34a' : '#dc2626'} />
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--xh-text-tertiary)' }}>未生成对抗样本</div>
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>

                {result.adversarial_image && (
                  <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                    <GlowingEffect spread={35} proximity={100} />
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>对比滑块</span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <ComparisonSlider leftImage={originalImage} rightImage={result.adversarial_image} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Confidence Analysis */}
            {activeTab === '2' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>原始图片 Top-5</span>
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        <Table dataSource={originalTop5} columns={top5Columns} pagination={false} size="small" />
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>对抗样本 Top-5</span>
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        <Table dataSource={adversarialTop5} columns={top5Columns} pagination={false} size="small" />
                      </div>
                    </div>
                  </Col>
                </Row>

                {result.original_probs && result.adversarial_probs && (
                  <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>置信度变化图</span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <ConfidenceChart originalProbs={result.original_probs} adversarialProbs={result.adversarial_probs} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Perturbation Analysis */}
            {activeTab === '3' && (
              <Row gutter={[16, 16]}>
                {result.heatmap && (
                  <Col xs={24} md={12}>
                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>扰动热力图</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <Heatmap image={result.heatmap} title="攻击扰动分布" />
                      </div>
                    </div>
                  </Col>
                )}
                <Col xs={24} md={result.heatmap ? 12 : 24}>
                  <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>扰动统计</span>
                    </div>
                    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      <StatCard label="攻击状态" value={result.success ? '成功' : '失败'} color={result.success ? '#16a34a' : '#dc2626'} />
                      <StatCard label="扰动范数" value={metadata.l2_norm?.toFixed?.(6) ?? '-'} />
                      <StatCard label="攻击耗时" value={result.time_elapsed?.toFixed(2) ? `${result.time_elapsed.toFixed(2)}s` : '-'} />
                      <StatCard label="迭代信息" value={metadata.iterations ?? metadata.num_iter ?? '-'} />
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {/* Tab 4: Detail Info */}
            {activeTab === '4' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {detailItems.map((item) => (
                    <StatCard key={item.label} label={item.label} value={item.value} color={item.color} />
                  ))}
                </div>

                {result.attack_params && (
                  <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--xh-border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>攻击参数</span>
                    </div>
                    <pre style={{
                      margin: 0, padding: 16, fontSize: 12, lineHeight: 1.6,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: 'var(--xh-text-secondary)', background: 'var(--xh-bg)',
                      whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
                    }}>
                      {JSON.stringify(result.attack_params || result.params, null, 2)}
                    </pre>
                  </div>
                )}

                {result.error_message && (
                  <Alert message="错误信息" description={result.error_message} type="error" showIcon style={{ borderRadius: 12 }} />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultDisplay;
