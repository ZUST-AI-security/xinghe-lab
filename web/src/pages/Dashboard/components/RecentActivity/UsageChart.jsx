import React from 'react';
import { Card, Typography } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import styles from './RecentActivity.module.less';

const { Title } = Typography;

const UsageChart = ({ data }) => {
  const { t } = useTranslation();

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle}>
            {data.name}
          </div>
          <div className={styles.tooltipValue}>
            {data.value} 次
          </div>
          <div className={styles.tooltipPercent}>
            {((data.value / data.payload.total) * 100).toFixed(1)}%
          </div>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const chartData = data.map(item => ({ ...item, total }));

  return (
    <Card
      title={
        <Title level={4} className={styles.cardTitle}>
          📊 {t('recent')} {t('stats.algorithms')}分布
        </Title>
      }
      className={styles.chartCard}
      bordered={false}
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className={styles.legendItem}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default UsageChart;
