import React from 'react';
import { Card, Col, Row, Tag, Typography } from 'antd';
import { TeamOutlined, ExperimentOutlined, LinkOutlined, BankOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text, Link } = Typography;

const researchDirections = [
  '对抗攻防',
  '后门攻击',
  '越狱攻击',
  '深度伪造',
  '隐私保护',
  '模型安全评估',
];

const LabInfo = () => (
  <Card
    style={{ borderRadius: 12, overflow: 'hidden' }}
    styles={{ body: { padding: 24 } }}
  >
    <Row gutter={24} align="middle">
      <Col span={16}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          浙江科技大学 · 大数据与智能安全实验室
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          星河智安实验室（XingHe ZhiAn Lab）隶属于浙江科技大学信息与电子工程学院，
          由钱亚冠教授领衔，聚焦人工智能安全领域前沿研究。
          实验室致力于对抗样本生成与防御、模型鲁棒性评估、AI 系统安全等方向的研究与工程落地。
        </Paragraph>
        <div style={{ marginBottom: 12 }}>
          <Text strong><TeamOutlined style={{ marginRight: 4 }} /> 研究方向：</Text>
          <div style={{ marginTop: 8 }}>
            {researchDirections.map((d) => (
              <Tag key={d} color="blue" style={{ marginBottom: 4 }}>{d}</Tag>
            ))}
          </div>
        </div>
        <div>
          <Text strong><ExperimentOutlined style={{ marginRight: 4 }} /> 本平台：</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            星河智安 AI 安全攻击可视化平台，支持 FGSM、I-FGSM、PGD、C&W、DeepFool 等主流对抗攻击算法的可视化演示与交互实验。
          </Text>
        </div>
      </Col>
      <Col span={8} style={{ textAlign: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          padding: '32px 16px',
          color: '#fff',
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>星河智安</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>XingHe ZhiAn</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>AI Security Research Platform</div>
          <div style={{ marginTop: 16 }}>
            <Link
              href="https://lab.rjmart.cn/10366/AISecurityLab"
              target="_blank"
              style={{ color: '#fff', opacity: 0.9, fontSize: 12 }}
            >
              <LinkOutlined style={{ marginRight: 4 }} />
              访问实验室主页
            </Link>
          </div>
        </div>
      </Col>
    </Row>
  </Card>
);

export default LabInfo;
