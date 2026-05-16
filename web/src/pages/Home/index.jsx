/**
 * 星河智安 (XingHe ZhiAn) - 公开首页
 * 展示平台介绍、算法、团队信息
 * 关联需求：Requirement 1
 */

import React from 'react';
import { Button, Card, Col, Grid, Row, Space, Tag, Typography } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  BulbOutlined,
  ExperimentOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../components/Layout/PublicNavbar';

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

/* ─────────────────────────────────────────────
   通用：响应式 padding 工具
───────────────────────────────────────────── */
const useResponsive = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmall = !screens.sm;
  return { isMobile, isSmall };
};

const sectionPadding = (isMobile, vertical = 72) => ({
  padding: isMobile ? `${Math.round(vertical * 0.6)}px 16px` : `${vertical}px 24px`,
});

/* ─────────────────────────────────────────────
   HeroBanner
───────────────────────────────────────────── */
const HeroBanner = () => {
  const { isMobile, isSmall } = useResponsive();
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1677ff 100%)',
        padding: isMobile ? '56px 16px 64px' : '80px 24px 96px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰圆 */}
      <div
        style={{
          position: 'absolute',
          top: isMobile ? -60 : -80,
          right: isMobile ? -80 : -80,
          width: isMobile ? 200 : 320,
          height: isMobile ? 200 : 320,
          borderRadius: '50%',
          background: 'rgba(22, 119, 255, 0.15)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? -40 : -60,
          left: isMobile ? -60 : -60,
          width: isMobile ? 160 : 240,
          height: isMobile ? 160 : 240,
          borderRadius: '50%',
          background: 'rgba(96, 165, 250, 0.1)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
        <Tag
          style={{
            background: 'rgba(22, 119, 255, 0.2)',
            border: '1px solid rgba(22, 119, 255, 0.4)',
            color: '#93c5fd',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: isSmall ? 11 : 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: 20,
            whiteSpace: 'normal',
            lineHeight: 1.5,
          }}
        >
          AI SECURITY VISUALIZATION PLATFORM
        </Tag>

        <Title
          level={1}
          style={{
            color: '#ffffff',
            fontSize: 'clamp(24px, 6vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.25,
            margin: '0 0 16px',
            wordBreak: 'break-word',
          }}
        >
          星河智安
          <br />
          <span style={{ color: '#60a5fa' }}>AI 安全攻击可视化平台</span>
        </Title>

        <Paragraph
          style={{
            color: 'rgba(226, 232, 240, 0.85)',
            fontSize: isMobile ? 14 : 16,
            lineHeight: 1.8,
            margin: '0 0 8px',
          }}
        >
          浙江科技大学大数据与智能安全实验室
        </Paragraph>

        <Paragraph
          style={{
            color: 'rgba(148, 163, 184, 0.75)',
            fontSize: isMobile ? 13 : 14,
            lineHeight: 1.7,
            maxWidth: 600,
            margin: '0 auto',
            padding: isSmall ? '0 4px' : 0,
          }}
        >
          集成 FGSM、I-FGSM、PGD、C&W、DeepFool 五种主流对抗攻击算法，
          提供直观的可视化分析与多算法对比实验能力。
        </Paragraph>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   FeaturesSection
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <ExperimentOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
    title: '多算法对比实验',
    desc: '支持同时运行最多 4 种对抗攻击算法，在同一界面内横向对比攻击效果与扰动特征。',
    color: '#e8f1ff',
  },
  {
    icon: <BarChartOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
    title: '扰动可视化分析',
    desc: '提供热力图、差值放大图、频域分析图三种可视化视图，直观呈现攻击扰动的空间与频率特征。',
    color: '#f0fff4',
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
    title: '鲁棒性评估',
    desc: '对对抗样本施加高斯模糊、JPEG 压缩、位深度压缩等防御变换，评估攻防对抗效果矩阵。',
    color: '#fff7e6',
  },
  {
    icon: <AimOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
    title: '参数敏感性分析',
    desc: '固定图片并自动扫描参数取值范围，绘制攻击成功率与扰动大小随参数变化的折线图。',
    color: '#f9f0ff',
  },
];

const FeaturesSection = () => {
  const { isMobile } = useResponsive();
  return (
    <section style={{ ...sectionPadding(isMobile), background: '#f8fafc' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
          <Tag
            style={{
              background: '#e8f1ff',
              border: 'none',
              color: '#1677ff',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            CORE FEATURES
          </Tag>
          <Title level={2} style={{ margin: '0 0 12px', color: '#0f172a', fontSize: isMobile ? 24 : 30 }}>
            核心功能
          </Title>
          <Paragraph style={{ color: '#64748b', fontSize: isMobile ? 14 : 15, margin: 0 }}>
            为 AI 安全研究人员提供完整的对抗攻击实验与分析工具链
          </Paragraph>
        </div>

        <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
          {FEATURES.map((f) => (
            <Col key={f.title} xs={24} sm={12} lg={6}>
              <Card
                style={{
                  height: '100%',
                  borderRadius: 20,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                styles={{ body: { padding: isMobile ? 18 : 24 } }}
                hoverable
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: f.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <Title level={5} style={{ margin: '0 0 8px', color: '#0f172a' }}>
                  {f.title}
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                  {f.desc}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   AlgorithmsSection
───────────────────────────────────────────── */
const ALGORITHMS = [
  {
    name: 'FGSM',
    fullName: 'Fast Gradient Sign Method',
    type: '单步攻击',
    typeColor: 'blue',
    desc: '通过一次梯度计算生成对抗扰动，计算效率高，是最经典的对抗攻击方法之一。适合快速验证模型脆弱性。',
    badge: 'HIGH PRIORITY',
    badgeColor: '#1677ff',
  },
  {
    name: 'I-FGSM',
    fullName: 'Iterative FGSM',
    type: '迭代攻击',
    typeColor: 'cyan',
    desc: '在 FGSM 基础上进行多步迭代，每步施加较小扰动，生成更精细的对抗样本，攻击成功率更高。',
    badge: 'ITERATIVE',
    badgeColor: '#13c2c2',
  },
  {
    name: 'PGD',
    fullName: 'Projected Gradient Descent',
    type: '迭代攻击',
    typeColor: 'cyan',
    desc: '在 ε-球约束下进行投影梯度下降，支持 L∞ 和 L2 范数约束，是目前最常用的强对抗攻击基准。',
    badge: 'ITERATIVE',
    badgeColor: '#13c2c2',
  },
  {
    name: 'C&W',
    fullName: 'Carlini & Wagner Attack',
    type: '优化攻击',
    typeColor: 'purple',
    desc: '将对抗攻击建模为优化问题，通过二分搜索平衡扰动大小与攻击成功率，能生成人眼难以察觉的对抗样本。',
    badge: 'OPTIMIZATION',
    badgeColor: '#722ed1',
  },
  {
    name: 'DeepFool',
    fullName: 'DeepFool Attack',
    type: '优化攻击',
    typeColor: 'purple',
    desc: '通过迭代线性化决策边界，寻找最小扰动使样本越过分类边界，生成的扰动在 L2 范数意义下接近最优。',
    badge: 'OPTIMIZATION',
    badgeColor: '#722ed1',
  },
];

const AlgorithmsSection = () => {
  const { isMobile, isSmall } = useResponsive();
  return (
    <section style={{ ...sectionPadding(isMobile), background: '#ffffff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
          <Tag
            style={{
              background: '#f9f0ff',
              border: 'none',
              color: '#722ed1',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            ATTACK ALGORITHMS
          </Tag>
          <Title level={2} style={{ margin: '0 0 12px', color: '#0f172a', fontSize: isMobile ? 24 : 30 }}>
            支持的攻击算法
          </Title>
          <Paragraph style={{ color: '#64748b', fontSize: isMobile ? 14 : 15, margin: 0 }}>
            覆盖单步、迭代、优化三类主流对抗攻击方法
          </Paragraph>
        </div>

        <Row gutter={[isMobile ? 16 : 20, isMobile ? 16 : 20]}>
          {ALGORITHMS.map((algo) => (
            <Col key={algo.name} xs={24} sm={12} lg={12} xl={8}>
              <Card
                style={{
                  height: '100%',
                  borderRadius: 20,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
                }}
                styles={{ body: { padding: isMobile ? 18 : 24 } }}
                hoverable
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: isSmall ? 'center' : 'flex-start',
                    flexDirection: isSmall ? 'column' : 'row',
                    gap: isSmall ? 12 : 16,
                    textAlign: isSmall ? 'center' : 'left',
                  }}
                >
                  {/* 算法名称徽章 */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: isSmall ? 56 : 64,
                      height: isSmall ? 56 : 64,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${algo.badgeColor}22 0%, ${algo.badgeColor}44 100%)`,
                      border: `1px solid ${algo.badgeColor}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      strong
                      style={{
                        color: algo.badgeColor,
                        fontSize: algo.name.length > 4 ? 11 : 13,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {algo.name}
                    </Text>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 6,
                        justifyContent: isSmall ? 'center' : 'flex-start',
                      }}
                    >
                      <Text strong style={{ fontSize: isMobile ? 14 : 15, color: '#0f172a' }}>
                        {algo.fullName}
                      </Text>
                      <Tag
                        color={algo.typeColor}
                        style={{ borderRadius: 999, fontSize: 11, fontWeight: 700, margin: 0 }}
                      >
                        {algo.type}
                      </Tag>
                    </div>
                    <Paragraph style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.75 }}>
                      {algo.desc}
                    </Paragraph>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   LabSection
───────────────────────────────────────────── */
const LabSection = () => {
  const { isMobile } = useResponsive();
  return (
    <section
      style={{
        ...sectionPadding(isMobile),
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <Tag
          style={{
            background: 'rgba(22, 119, 255, 0.2)',
            border: '1px solid rgba(22, 119, 255, 0.4)',
            color: '#93c5fd',
            borderRadius: 999,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: 24,
          }}
        >
          ABOUT THE LAB
        </Tag>

        <Title
          level={2}
          style={{
            color: '#ffffff',
            margin: '0 0 20px',
            fontSize: isMobile ? 24 : 30,
            lineHeight: 1.3,
          }}
        >
          浙江科技大学
          <br />
          <span style={{ color: '#60a5fa' }}>大数据与智能安全实验室</span>
        </Title>

        <Paragraph
          style={{
            color: 'rgba(226, 232, 240, 0.85)',
            fontSize: isMobile ? 14 : 15,
            lineHeight: 1.9,
            maxWidth: 700,
            margin: '0 auto 32px',
          }}
        >
          星河智安实验室专注于人工智能安全领域的前沿研究，涵盖对抗样本攻防、模型鲁棒性评估、
          深度学习安全分析等方向。本平台是实验室研究成果的工程化落地，旨在为 AI 安全研究人员
          提供高效、直观的实验与分析工具。
        </Paragraph>

        <Row gutter={[isMobile ? 12 : 24, isMobile ? 12 : 24]} justify="center">
          {[
            { icon: <ThunderboltOutlined />, label: '对抗攻击研究', color: '#60a5fa' },
            { icon: <SafetyCertificateOutlined />, label: '模型鲁棒性评估', color: '#34d399' },
            { icon: <BulbOutlined />, label: '深度学习安全', color: '#fbbf24' },
            { icon: <BarChartOutlined />, label: '可视化分析', color: '#a78bfa' },
          ].map((item) => (
            <Col key={item.label} xs={12} sm={6}>
              <div
                style={{
                  padding: isMobile ? '16px 12px' : '20px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <div style={{ fontSize: isMobile ? 22 : 24, color: item.color, marginBottom: 8 }}>
                  {item.icon}
                </div>
                <Text
                  style={{
                    color: 'rgba(226,232,240,0.9)',
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Text>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   CTASection
───────────────────────────────────────────── */
const CTASection = ({ onLogin, onRegister }) => {
  const { isMobile } = useResponsive();
  return (
    <section
      style={{
        padding: isMobile ? '56px 16px' : '80px 24px',
        background: '#f8fafc',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Title level={2} style={{ margin: '0 0 12px', color: '#0f172a', fontSize: isMobile ? 24 : 30 }}>
          立即开始实验
        </Title>
        <Paragraph
          style={{
            color: '#64748b',
            fontSize: isMobile ? 14 : 15,
            margin: '0 0 28px',
            lineHeight: 1.8,
          }}
        >
          注册账号后即可使用全部功能，包括多算法对比、鲁棒性评估、参数敏感性分析等。
        </Paragraph>
        <Space
          size={12}
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
        >
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={onLogin}
            block={isMobile}
            style={{
              height: 48,
              paddingInline: 32,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              minWidth: isMobile ? '100%' : 160,
            }}
          >
            立即登录
          </Button>
          <Button
            size="large"
            icon={<UserAddOutlined />}
            onClick={onRegister}
            block={isMobile}
            style={{
              height: 48,
              paddingInline: 32,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              minWidth: isMobile ? '100%' : 160,
            }}
          >
            注册账号
          </Button>
        </Space>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   Footer
───────────────────────────────────────────── */
const PageFooter = () => {
  const { isMobile } = useResponsive();
  return (
    <footer
      style={{
        padding: isMobile ? '20px 16px' : '24px',
        background: '#0f172a',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Text
        style={{
          color: 'rgba(148,163,184,0.7)',
          fontSize: isMobile ? 12 : 13,
          lineHeight: 1.7,
          display: 'block',
        }}
      >
        © {new Date().getFullYear()} 浙江科技大学大数据与智能安全实验室
        {isMobile ? <br /> : ' · '}
        星河智安 AI 安全攻击可视化平台
      </Text>
    </footer>
  );
};

/* ─────────────────────────────────────────────
   HomePage（组合）
───────────────────────────────────────────── */
const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', overflowX: 'hidden' }}>
      <PublicNavbar />
      <main>
        <HeroBanner />
        <FeaturesSection />
        <AlgorithmsSection />
        <LabSection />
        <CTASection
          onLogin={() => navigate('/login')}
          onRegister={() => navigate('/register')}
        />
      </main>
      <PageFooter />
    </div>
  );
};

export default HomePage;
