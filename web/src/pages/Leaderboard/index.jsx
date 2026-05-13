/**
 * 模型鲁棒性排行榜页面
 * 关联需求：Requirement 10
 *
 * 功能：
 * - 算法下拉选择器（可选，不选则展示所有算法的聚合数据）
 * - 刷新按钮
 * - Ant Design Table 展示排行榜：排名、模型名称、总攻击次数、攻击成功次数、攻击成功率（%）、平均 L2 范数、平均 Linf 范数
 * - 无数据时显示 Empty 组件，提示「暂无数据，请先执行攻击实验」
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

import { getLeaderboard } from '../../api/leaderboard';

const { Title, Paragraph, Text } = Typography;

// ─── 常量 ────────────────────────────────────────────────────────────────────

const ALGORITHM_OPTIONS = [
  { value: '', label: '全部算法' },
  { value: 'fgsm', label: 'FGSM' },
  { value: 'ifgsm', label: 'I-FGSM' },
  { value: 'pgd', label: 'PGD' },
  { value: 'cw', label: 'C&W' },
  { value: 'deepfool', label: 'DeepFool' },
];

/** 排名前三的徽章颜色 */
const RANK_COLORS = ['#faad14', '#bfbfbf', '#d4a574'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

// ─── 表格列定义 ───────────────────────────────────────────────────────────────

const buildColumns = () => [
  {
    title: '排名',
    key: 'rank',
    width: 80,
    align: 'center',
    render: (_, __, index) => {
      if (index < 3) {
        return (
          <span style={{ fontSize: 20 }} title={`第 ${index + 1} 名`}>
            {RANK_LABELS[index]}
          </span>
        );
      }
      return (
        <Text strong style={{ color: '#64748b' }}>
          {index + 1}
        </Text>
      );
    },
  },
  {
    title: '模型名称',
    dataIndex: 'model_name',
    key: 'model_name',
    render: (name) => <Text strong>{name}</Text>,
  },
  {
    title: '总攻击次数',
    dataIndex: 'total_attacks',
    key: 'total_attacks',
    align: 'right',
    sorter: (a, b) => a.total_attacks - b.total_attacks,
    render: (val) => <Text>{val.toLocaleString()}</Text>,
  },
  {
    title: '攻击成功次数',
    dataIndex: 'success_count',
    key: 'success_count',
    align: 'right',
    sorter: (a, b) => a.success_count - b.success_count,
    render: (val) => <Text>{val.toLocaleString()}</Text>,
  },
  {
    title: '攻击成功率',
    dataIndex: 'avg_success_rate',
    key: 'avg_success_rate',
    align: 'right',
    defaultSortOrder: 'ascend',
    sorter: (a, b) => a.avg_success_rate - b.avg_success_rate,
    render: (val) => {
      const pct = (val * 100).toFixed(2);
      let color = '#52c41a'; // 低成功率 → 绿色（鲁棒）
      if (val >= 0.7) color = '#ff4d4f';
      else if (val >= 0.4) color = '#faad14';
      return (
        <Tag color={color} style={{ fontWeight: 700, minWidth: 64, textAlign: 'center' }}>
          {pct}%
        </Tag>
      );
    },
  },
  {
    title: '平均 L2 范数',
    dataIndex: 'avg_l2_norm',
    key: 'avg_l2_norm',
    align: 'right',
    sorter: (a, b) => (a.avg_l2_norm ?? 0) - (b.avg_l2_norm ?? 0),
    render: (val) =>
      val !== null && val !== undefined ? (
        <Text>{val.toFixed(4)}</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: '平均 Linf 范数',
    dataIndex: 'avg_linf_norm',
    key: 'avg_linf_norm',
    align: 'right',
    sorter: (a, b) => (a.avg_linf_norm ?? 0) - (b.avg_linf_norm ?? 0),
    render: (val) =>
      val !== null && val !== undefined ? (
        <Text>{val.toFixed(4)}</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
];

// ─── 主页面组件 ───────────────────────────────────────────────────────────────

const LeaderboardPage = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard({
        algorithm: selectedAlgorithm || undefined,
      });
      setEntries(data.entries || []);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : err?.message || '获取排行榜数据失败，请稍后重试'
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAlgorithm]);

  // 初始加载 & 算法切换时重新请求
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const columns = buildColumns();

  const emptyContent = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span>
          暂无数据，请先执行攻击实验
        </span>
      }
      style={{ padding: '48px 0' }}
    />
  );

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <Space>
            <TrophyOutlined />
            模型鲁棒性排行榜
          </Space>
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          基于历史攻击数据统计各模型的鲁棒性表现，攻击成功率越低表示模型越鲁棒，排名越靠前。
        </Paragraph>
      </div>

      <Card variant="borderless">
        {/* 工具栏：算法选择器 + 刷新按钮 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space size={12} wrap>
            <Text strong>攻击算法：</Text>
            <Select
              value={selectedAlgorithm}
              onChange={(val) => setSelectedAlgorithm(val)}
              options={ALGORITHM_OPTIONS}
              style={{ width: 160 }}
              disabled={loading}
            />
          </Space>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLeaderboard}
            loading={loading}
          >
            刷新
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 16px',
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 8,
              color: '#ff4d4f',
            }}
          >
            {error}
          </div>
        )}

        {/* 排行榜表格 */}
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="model_name"
          loading={loading}
          pagination={false}
          locale={{ emptyText: emptyContent }}
          rowClassName={(_, index) => (index < 3 ? 'leaderboard-top-row' : '')}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />

        {/* 数据说明 */}
        {entries.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {entries.length} 个模型 · 按攻击成功率升序排列（成功率越低越鲁棒）
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LeaderboardPage;
