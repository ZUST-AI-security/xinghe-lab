import React from 'react';
import {
  Alert,
  Badge,
  Button,
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
import {
  SpotlightCard, TextGenerateEffect, CardContainer, CardBody, CardItem, GlowingEffect,
} from '../../../components/Aceternity';
import { BlurFade, HyperText, GlareHover } from '../../../components/MagicUI';

const { Text } = Typography;

const whiteCard = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid var(--xh-border)',
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const AttackLayout = ({
  name, tooltip, description, status, useAsync, onAsyncChange,
  extraControls, cardExtra, isRunning, loading, progress, progressMessage,
  error, onClearError, canCancel, onCancel, imageUrl, onRun, children, resultPanel,
}) => {
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }}>
      {/* Hero Banner */}
      <BlurFade>
        <SpotlightCard spotlightColor="rgba(22,119,255,0.04)" style={{ borderRadius: 24 }}>
          <div style={{ ...whiteCard, position: 'relative', overflow: 'hidden', padding: '36px 32px 32px' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 160, background: 'radial-gradient(ellipse at center top, rgba(22,119,255,0.05), transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <HyperText
                text="ATTACK MODULE"
                duration={800}
                style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#1677ff',
                  letterSpacing: 3, marginBottom: 14,
                  padding: '4px 14px', borderRadius: 999,
                  background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.12)',
                }}
              />
              <div style={{ marginBottom: 8 }}>
                <TextGenerateEffect
                  words={name}
                  duration={0.5}
                  style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, color: 'var(--xh-text)', lineHeight: 1.2 }}
                />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--xh-text-secondary)', maxWidth: 480, margin: '0 auto 16px' }}
              >
                {description}
              </motion.p>

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 16px', borderRadius: 999,
                  background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
                  fontSize: 13, fontWeight: 600,
                }}>
                  <Badge status={statusCfg.color} text={null} />
                  <span style={{ color: 'var(--xh-text-secondary)' }}>{statusCfg.text}</span>
                </div>
                {onAsyncChange && (
                  <Switch checkedChildren="异步" unCheckedChildren="同步" checked={useAsync} onChange={onAsyncChange} size="small" />
                )}
                {extraControls}
              </div>
            </div>
          </div>
        </SpotlightCard>
      </BlurFade>

      {/* Main content */}
      <Row gutter={[20, 20]}>
        {/* Config panel */}
        <Col xs={24} md={10}>
          <BlurFade delay={0.1}>
            <SpotlightCard spotlightColor="rgba(22,119,255,0.03)" style={{ borderRadius: 20 }}>
              <div style={{ ...whiteCard, padding: 0, overflow: 'hidden', position: 'relative' }}>
                <GlowingEffect spread={40} proximity={120} />
                <div style={{
                  padding: '16px 24px', borderBottom: '1px solid var(--xh-border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.4)' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--xh-text)' }}>参数配置</span>
                    {tooltip && (
                      <Tooltip title={tooltip}>
                        <InfoCircleOutlined style={{ color: 'var(--xh-text-tertiary)', fontSize: 13 }} />
                      </Tooltip>
                    )}
                  </div>
                  {cardExtra}
                </div>

                <div style={{ padding: '20px 24px' }}>
                  {children}

                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={onRun}
                        loading={loading}
                        disabled={!imageUrl || isRunning}
                        size="large"
                        block
                        style={{ borderRadius: 12, fontWeight: 600, height: 44 }}
                      >
                        {useAsync ? '提交异步任务' : '同步执行'}
                      </Button>
                    </motion.div>
                    {canCancel && (
                      <Button icon={<StopOutlined />} onClick={onCancel} danger style={{ borderRadius: 12, height: 44 }}>
                        取消
                      </Button>
                    )}
                  </div>

                  <AnimatePresence>
                    {isRunning && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: 16 }}
                      >
                        <Progress percent={progress} status="active" strokeColor={{ from: '#1677ff', to: '#7c3aed' }} />
                        {progressMessage && (
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>{progressMessage}</Text>
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
                          style={{ marginTop: 16, borderRadius: 12 }}
                          action={<Button size="small" onClick={onClearError}>关闭</Button>}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </SpotlightCard>
          </BlurFade>
        </Col>

        {/* Result panel */}
        <Col xs={24} md={14}>
          <BlurFade delay={0.2}>
            {resultPanel}
          </BlurFade>
        </Col>
      </Row>
    </div>
  );
};

export default AttackLayout;
