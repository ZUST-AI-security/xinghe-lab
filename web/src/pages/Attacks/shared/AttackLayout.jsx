import React from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_CONFIG } from './constants';
import GlowingCard from '../../../components/Aceternity/GlowingCard';
import FloatUp from '../../../components/Aceternity/FloatUp';
import MovingBorder from '../../../components/Aceternity/MovingBorder';

const { Title, Paragraph, Text } = Typography;

const S = {
  page: { padding: '16px' },
  header: { marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  titleWrap: { minWidth: 0 },
  title: { margin: 0 },
  infoIcon: { marginLeft: 8, color: 'var(--xh-text-secondary)' },
  subtitle: { marginTop: 8, marginBottom: 0 },
  progressWrap: { marginTop: 16 },
  progressHint: { fontSize: 12, marginTop: 4, display: 'block' },
};

const AttackLayout = ({
  name, tooltip, description, status, useAsync, onAsyncChange,
  extraControls, cardExtra, isRunning, loading, progress, progressMessage,
  error, onClearError, canCancel, onCancel, imageUrl, onRun, children, resultPanel,
}) => {
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div style={S.page}>
      <FloatUp>
        <div style={S.header}>
          <div style={S.titleWrap}>
            <Title level={2} style={S.title}>
              {name}
              <Tooltip title={tooltip}>
                <InfoCircleOutlined style={S.infoIcon} />
              </Tooltip>
            </Title>
            <Paragraph type="secondary" style={S.subtitle}>{description}</Paragraph>
          </div>

          <Space wrap>
            <Text type="secondary">状态:</Text>
            <Badge status={statusCfg.color} text={statusCfg.text} />
            {onAsyncChange && (
              <Switch checkedChildren="异步" unCheckedChildren="同步" checked={useAsync} onChange={onAsyncChange} size="small" />
            )}
            {extraControls}
          </Space>
        </div>
      </FloatUp>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={10}>
          <FloatUp delay={0.1}>
            <GlowingCard
              glowColor="rgba(22,119,255,0.08)"
              borderColor="rgba(22,119,255,0.15)"
              style={{ borderRadius: 16 }}
            >
              <Card title="参数配置" variant="borderless" extra={cardExtra} style={{ borderRadius: 16 }}>
                {children}

                <Space size="middle">
                  <MovingBorder>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={onRun}
                      loading={loading}
                      disabled={!imageUrl || isRunning}
                      size="large"
                      style={{ borderRadius: 10, fontWeight: 600 }}
                    >
                      {useAsync ? '提交异步任务' : '同步执行'}
                    </Button>
                  </MovingBorder>
                  {canCancel && (
                    <Button icon={<StopOutlined />} onClick={onCancel} danger>取消</Button>
                  )}
                </Space>

                <AnimatePresence>
                  {isRunning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={S.progressWrap}
                    >
                      <Progress percent={progress} status="active" strokeColor={{ from: '#1677ff', to: '#7c3aed' }} />
                      {progressMessage && (
                        <Text type="secondary" style={S.progressHint}>{progressMessage}</Text>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <Alert
                        message="攻击失败"
                        description={error}
                        type="error"
                        showIcon
                        closable
                        style={{ marginTop: 16 }}
                        action={<Button size="small" onClick={onClearError}>关闭</Button>}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </GlowingCard>
          </FloatUp>
        </Col>

        <Col xs={24} md={14}>
          <FloatUp delay={0.2}>
            {resultPanel}
          </FloatUp>
        </Col>
      </Row>
    </div>
  );
};

export default AttackLayout;
