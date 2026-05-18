import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChartOutlined } from '@ant-design/icons';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
      border: '1px solid var(--xh-border)', borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--xh-text)' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1677ff' }} />
          <span style={{ fontSize: 12, color: 'var(--xh-text-secondary)' }}>原始: <strong style={{ color: 'var(--xh-text)' }}>{data.original}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#7c3aed' }} />
          <span style={{ fontSize: 12, color: 'var(--xh-text-secondary)' }}>对抗: <strong style={{ color: 'var(--xh-text)' }}>{data.adversarial}%</strong></span>
        </div>
        <div style={{ fontSize: 11, color: data.difference > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, marginTop: 2 }}>
          变化: {data.difference > 0 ? '+' : ''}{data.difference}%
        </div>
      </div>
    </div>
  );
};

const ConfidenceChart = ({
  originalProbs, adversarialProbs,
  title = '分类置信度变化',
  width = '100%', height = 360,
  maxClasses = 10,
}) => {
  const chartData = useMemo(() => {
    if (!originalProbs || !adversarialProbs) return [];
    const combined = originalProbs.map((origProb, index) => ({
      index, original: origProb, adversarial: adversarialProbs[index] || 0,
      diff: (adversarialProbs[index] || 0) - origProb,
    }));
    return combined
      .sort((a, b) => b.original - a.original)
      .slice(0, maxClasses)
      .map((item) => ({
        name: `类别 ${item.index}`,
        original: parseFloat((item.original * 100).toFixed(2)),
        adversarial: parseFloat((item.adversarial * 100).toFixed(2)),
        difference: parseFloat((item.diff * 100).toFixed(2)),
        index: item.index,
      }));
  }, [originalProbs, adversarialProbs, maxClasses]);

  const originalPrediction = useMemo(() => {
    if (!originalProbs) return null;
    return originalProbs.indexOf(Math.max(...originalProbs));
  }, [originalProbs]);

  const adversarialPrediction = useMemo(() => {
    if (!adversarialProbs) return null;
    return adversarialProbs.indexOf(Math.max(...adversarialProbs));
  }, [adversarialProbs]);

  return (
    <div>
      {/* Prediction summary */}
      {originalPrediction !== null && adversarialPrediction !== null && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16,
          padding: '12px 16px', borderRadius: 12,
          background: originalPrediction !== adversarialPrediction ? 'rgba(22,163,74,0.04)' : 'rgba(245,158,11,0.04)',
          border: `1px solid ${originalPrediction !== adversarialPrediction ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.12)'}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--xh-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>原始预测</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--xh-text)' }}>
              类别 {originalPrediction} ({((originalProbs[originalPrediction] || 0) * 100).toFixed(1)}%)
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--xh-border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--xh-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>对抗预测</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: originalPrediction !== adversarialPrediction ? '#16a34a' : '#f59e0b' }}>
              类别 {adversarialPrediction} ({((adversarialProbs[adversarialPrediction] || 0) * 100).toFixed(1)}%)
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', padding: '4px 12px', borderRadius: 999,
            background: originalPrediction !== adversarialPrediction ? 'rgba(22,163,74,0.08)' : 'rgba(245,158,11,0.08)',
            color: originalPrediction !== adversarialPrediction ? '#16a34a' : '#f59e0b',
            fontSize: 12, fontWeight: 700,
          }}>
            {originalPrediction !== adversarialPrediction ? '攻击成功' : '攻击失败'}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ width, height }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--xh-border)" vertical={false} />
              <XAxis
                dataKey="name" angle={-45} textAnchor="end" height={60}
                tick={{ fontSize: 11, fill: 'var(--xh-text-tertiary)' }}
                axisLine={{ stroke: 'var(--xh-border)' }}
                tickLine={false}
              />
              <YAxis
                label={{ value: '置信度 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--xh-text-tertiary)' } }}
                tick={{ fontSize: 11, fill: 'var(--xh-text-tertiary)' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(22,119,255,0.04)' }} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="original" name="原始置信度" fill="#1677ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="adversarial" name="对抗置信度" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--xh-text-tertiary)' }}>
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>暂无置信度数据</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfidenceChart;
