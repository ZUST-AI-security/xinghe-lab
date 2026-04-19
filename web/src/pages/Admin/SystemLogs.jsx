import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Typography, message, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getSystemLogs } from '../../../api/admin';

const { Title, Text } = Typography;

const SystemLogs = () => {
  const [lines, setLines] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [numLines, setNumLines] = useState(200);
  const [level, setLevel] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getSystemLogs({ lines: numLines, level });
      setLines(data.lines || []);
      setTotal(data.total || 0);
    } catch {
      message.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const getLineColor = (line) => {
    if (line.includes('ERROR')) return '#ff4d4f';
    if (line.includes('WARNING')) return '#faad14';
    if (line.includes('INFO')) return '#1890ff';
    return '#666';
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>系统日志</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="日志级别"
          value={level || undefined}
          onChange={(val) => setLevel(val || '')}
          allowClear
          style={{ width: 120 }}
          options={[
            { label: 'INFO', value: 'INFO' },
            { label: 'WARNING', value: 'WARNING' },
            { label: 'ERROR', value: 'ERROR' },
          ]}
        />
        <Input
          type="number"
          value={numLines}
          onChange={(e) => setNumLines(Number(e.target.value))}
          style={{ width: 100 }}
          min={1}
          max={1000}
          addonAfter="行"
        />
        <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>刷新</Button>
        <Text type="secondary">共 {total} 行日志</Text>
      </Space>

      <Card
        style={{
          background: '#1e1e1e',
          maxHeight: 'calc(100vh - 240px)',
          overflow: 'auto',
        }}
        styles={{ body: { padding: 16 } }}
      >
        {lines.length === 0 ? (
          <Text style={{ color: '#999' }}>暂无日志记录</Text>
        ) : (
          <pre style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: 12, lineHeight: 1.6 }}>
            {lines.map((line, idx) => (
              <div key={idx} style={{ color: getLineColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line}
              </div>
            ))}
          </pre>
        )}
      </Card>
    </div>
  );
};

export default SystemLogs;
