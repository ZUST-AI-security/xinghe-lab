import React from 'react';
import { Typography, Row, Col, Card, Avatar, Divider, List, Timeline } from 'antd';
import { 
  RocketOutlined, 
  SafetyOutlined, 
  TeamOutlined, 
  EnvironmentOutlined,
  CalendarOutlined 
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const About = () => {
  return (
    <div style={{ padding: '40px 10%' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title level={1}>关于星河实验室</Title>
        <Paragraph style={{ fontSize: '1.2rem', color: '#666' }}>
          专注于 AI 安全与鲁棒性研究的先锋平台
        </Paragraph>
      </div>

      <Row gutter={[48, 48]}>
        <Col xs={24} md={12}>
          <Title level={2}><RocketOutlined /> 我们的使命</Title>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
            星河实验室致力于解决深度学习模型在现实部署中面临的各种安全威胁。从对抗性样本攻击到模型投毒，
            我们提供全方位的评估工具和防御方案，确保人工智能系统在各种极端情况下的安全、可靠、可控。
          </Paragraph>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
            我们的愿景是让每一段代码都能抵御恶意攻击，让每一个 AI 模型都能在星河下稳定运行。
          </Paragraph>
        </Col>
        
        <Col xs={24} md={12}>
          <Title level={2}><TeamOutlined /> 核心团队</Title>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.8' }}>
            我们由来自全球顶级学术机构的专家和工业界资深安全工程师组成。团队成员在 CVPR, ICCV, NeurIPS 等顶级会议上发表过多篇关于模型鲁棒性的研究成果。
          </Paragraph>
        </Col>
      </Row>

      <Divider style={{ margin: '60px 0' }} />

      <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>实验室发展历程</Title>
      <Row justify="center">
        <Col xs={24} md={12}>
          <Timeline 
            mode="alternate"
            items={[
              {
                color: 'blue',
                children: (
                  <>
                    <Title level={5}>实验室成立 (2024.10)</Title>
                    <Text type="secondary">确定 AI 安全核心研究方向</Text>
                  </>
                ),
              },
              {
                color: 'green',
                children: (
                  <>
                    <Title level={5}>发布 V1.0 原型 (2025.02)</Title>
                    <Text type="secondary">支持基础图像分类对抗攻击实验</Text>
                  </>
                ),
              },
              {
                dot: <SafetyOutlined style={{ fontSize: '16px', color: 'red' }} />,
                children: (
                  <>
                    <Title level={5}>加入目标检测支持 (2025.06)</Title>
                    <Text type="secondary">支持 YOLO, Faster R-CNN 等复杂模型评测</Text>
                  </>
                ),
              },
              {
                children: (
                  <>
                    <Title level={5}>星河实验室全面公测 (2026.01)</Title>
                    <Text type="secondary">打造开放的攻防社区</Text>
                  </>
                ),
              },
            ]}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 80, padding: '40px', background: '#fff', borderRadius: '12px', textAlign: 'center' }}>
        <Title level={3}>联系我们</Title>
        <Space size="large" split={<Divider type="vertical" />}>
          <Text><EnvironmentOutlined /> 上海市星河科技园 A1 座</Text>
          <Text><TeamOutlined /> contact@xinghe-lab.ai</Text>
          <Text><CalendarOutlined /> 周一至周五 9:00 - 18:00</Text>
        </Space>
      </div>
    </div>
  );
};

// Import Space for contact section
import { Space } from 'antd';

export default About;
