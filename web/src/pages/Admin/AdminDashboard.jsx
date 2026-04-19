import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Tag } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { getAdminDashboard } from '../../../api/admin';

const { Title } = Typography;

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>系统概览</Title>

      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card>
            <Statistic title="用户总数" value={data?.users?.total || 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃用户" value={data?.users?.active || 0} prefix={<UserOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="攻击总数" value={data?.attacks?.total || 0} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="攻击成功率"
              value={(data?.attacks?.success_rate || 0) * 100}
              suffix="%"
              precision={1}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: data?.attacks?.success_rate > 0.5 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="各算法攻击统计">
            {data?.attacks?.by_algorithm && Object.entries(data.attacks.by_algorithm).length > 0 ? (
              Object.entries(data.attacks.by_algorithm).map(([algo, count]) => (
                <div key={algo} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Tag color="blue">{algo.toUpperCase()}</Tag>
                  <span>{count} 次</span>
                </div>
              ))
            ) : (
              <span style={{ color: '#999' }}>暂无攻击记录</span>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统信息">
            <p><strong>版本:</strong> {data?.system?.version || '-'}</p>
            <p><strong>调试模式:</strong> <Tag color={data?.system?.debug ? 'orange' : 'green'}>{data?.system?.debug ? '开启' : '关闭'}</Tag></p>
            <p><strong>数据库:</strong> <Tag color="blue">{data?.system?.database || '-'}</Tag></p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
