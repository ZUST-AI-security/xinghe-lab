import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Typography, Tag, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getSystemLogs } from '../../api/admin';
import FloatUp from '../../components/Aceternity/FloatUp';

const { Title, Text } = Typography;

const SystemLogs = () => {
  const { message } = App.useApp();
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
    if (line.includes('ERROR')) return 'var(--xh-error)';
    if (line.includes('WARNING')) return 'var(--xh-warning)';
    if (line.includes('INFO')) return 'var(--xh-primary)';
    return 'var(--xh-text-secondary)';
  };

  return (
    <div className="xh-page-shell">
      <FloatUp>
        <Card className="xh-page-banner" bordered={false} style={{ borderRadius: 24 }}>
          <div className="xh-page-kicker">SYSTEM LOGS</div>
          <Title level={2} className="xh-page-title" style={{ margin: 0 }}>系统日志</Title>
        </Card>
      </FloatUp>

      <FloatUp delay={0.1}>
        <Card style={{ borderRadius: 20 }}>
          <Space wrap style={{ marginBottom: 16 }}>
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
              borderRadius: 14,
              maxHeight: 'calc(100vh - 320px)',
              overflow: 'auto',
            }}
            styles={{ body: { padding: 16 } }}
          >
            {lines.length === 0 ? (
              <Text style={{ color: 'var(--xh-text-tertiary)' }}>暂无日志记录</Text>
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
        </Card>
      </FloatUp>
    </div>
  );
};

export default SystemLogs;
