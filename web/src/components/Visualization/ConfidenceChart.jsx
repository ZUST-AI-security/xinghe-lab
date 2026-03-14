/**
 * 星河智安 (XingHe ZhiAn) - 置信度图表组件
 * 显示分类置信度变化的条形图
 */

import React, { useMemo } from 'react';
import { Card, Button, Space, Tooltip } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  DownloadOutlined, 
  ExpandOutlined,
  CompressOutlined,
  InfoCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const ConfidenceChart = ({ 
  originalProbs, 
  adversarialProbs, 
  title = '分类置信度变化',
  width = '100%',
  height = 400,
  showControls = true,
  maxClasses = 10,
}) => {
  // 准备图表数据
  const chartData = useMemo(() => {
    if (!originalProbs || !adversarialProbs) {
      return [];
    }

    // 获取前N个最高置信度的类别
    const combined = originalProbs.map((origProb, index) => ({
      index,
      original: origProb,
      adversarial: adversarialProbs[index] || 0,
      diff: (adversarialProbs[index] || 0) - origProb,
    }));

    // 按原始置信度排序并取前N个
    const topClasses = combined
      .sort((a, b) => b.original - a.original)
      .slice(0, maxClasses);

    return topClasses.map((item, index) => ({
      name: `类别 ${item.index}`,
      original: parseFloat((item.original * 100).toFixed(2)),
      adversarial: parseFloat((item.adversarial * 100).toFixed(2)),
      difference: parseFloat((item.diff * 100).toFixed(2)),
      index: item.index,
    }));
  }, [originalProbs, adversarialProbs, maxClasses]);

  // 获取原始预测类别
  const originalPrediction = useMemo(() => {
    if (!originalProbs) return null;
    const maxIndex = originalProbs.indexOf(Math.max(...originalProbs));
    return maxIndex;
  }, [originalProbs]);

  // 获取对抗样本预测类别
  const adversarialPrediction = useMemo(() => {
    if (!adversarialProbs) return null;
    const maxIndex = adversarialProbs.indexOf(Math.max(...adversarialProbs));
    return maxIndex;
  }, [adversarialProbs]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '8px' }}>
            {label}
          </p>
          <p style={{ margin: '4px 0', color: '#1890ff' }}>
            原始置信度: {data.original}%
          </p>
          <p style={{ margin: '4px 0', color: '#52c41a' }}>
            对抗置信度: {data.adversarial}%
          </p>
          <p style={{ margin: '4px 0', color: data.difference > 0 ? '#ff4d4f' : '#52c41a' }}>
            变化: {data.difference > 0 ? '+' : ''}{data.difference}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 下载图表
  const handleDownload = () => {
    // 这里可以实现图表下载功能
    console.log('Download chart');
  };

  // 全屏切换
  const handleFullscreen = () => {
    // 这里可以实现全屏功能
    console.log('Toggle fullscreen');
  };

  const colors = {
    original: '#1890ff',
    adversarial: '#52c41a',
    increase: '#ff4d4f',
    decrease: '#52c41a',
  };

  return (
    <div className="confidence-chart">
      {/* 标题和描述 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {title}
            </h3>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: '#8c8c8c' 
            }}>
              显示原始图片和对抗样本的Top {maxClasses} 分类置信度对比
            </p>
          </div>
          
          <Tooltip title="置信度图表显示了攻击前后模型预测概率的变化">
            <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />
          </Tooltip>
        </div>
      </div>

      {/* 预测信息 */}
      {originalPrediction !== null && adversarialPrediction !== null && (
        <div style={{ 
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
        }}>
          <div style={{ fontSize: '12px', color: '#52c41a' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              预测变化
            </div>
            <div>
              原始预测: 类别 {originalPrediction} (置信度: {parseFloat(((originalProbs[originalPrediction] || 0) * 100).toFixed(1))}%)
            </div>
            <div>
              对抗预测: 类别 {adversarialPrediction} (置信度: {parseFloat(((adversarialProbs[adversarialPrediction] || 0) * 100).toFixed(1))}%)
            </div>
            <div style={{ 
              fontWeight: 'bold',
              color: originalPrediction !== adversarialPrediction ? '#ff4d4f' : '#52c41a'
            }}>
              攻击结果: {originalPrediction !== adversarialPrediction ? '成功' : '失败'}
            </div>
          </div>
        </div>
      )}

      {/* 图表容器 */}
      <Card 
        style={{ 
          width, 
          height,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        styles={{
          body: { padding: '16px' }
        }}
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: '置信度 (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 12 }
                }}
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="original" 
                name="原始置信度" 
                fill={colors.original}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="adversarial" 
                name="对抗置信度" 
                fill={colors.adversarial}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex-center" style={{ height: '100%', color: '#8c8c8c' }}>
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>暂无置信度数据</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                请先运行攻击算法生成置信度数据
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 控制按钮 */}
      {showControls && chartData.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          display: 'flex', 
          justifyContent: 'flex-end',
        }}>
          <Space>
            <Button 
              size="small" 
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
              title="下载图表"
            >
              下载
            </Button>
            <Button 
              size="small" 
              icon={<ExpandOutlined />} 
              onClick={handleFullscreen}
              title="全屏查看"
            >
              全屏
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ConfidenceChart;
