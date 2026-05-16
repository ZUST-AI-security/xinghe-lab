/**
 * 星河智安 (XingHe ZhiAn) - 关于页面
 * 展示实验室介绍、研究方向、平台技术栈和版本信息
 * 关联需求：Requirement 2
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Divider,
  Grid,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  AimOutlined,
  ApiOutlined,
  BarChartOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import PublicNavbar from '../../components/Layout/PublicNavbar';

const { Title, Paragraph, Text, Link } = Typography;
const { useBreakpoint } = Grid;

const useIsMobile = () => {
  const screens = useBreakpoint();
  return !screens.md;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

/* ─────────────────────────────────────────────
   LabIntroSection — 实验室介绍 + 主页链接
───────────────────────────────────────────── */
const LabIntroSection = () => {
  const isMobile = useIsMobile();
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
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          marginBottom: 20,
        }}
      >
        ABOUT US
      </Tag>

      <Title
        level={1}
        style={{
          color: '#ffffff',
          fontSize: 'clamp(22px, 5.5vw, 42px)',
          fontWeight: 800,
          lineHeight: 1.25,
          margin: '0 0 16px',
          wordBreak: 'break-word',
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
          maxWidth: 680,
          margin: '0 auto 28px',
        }}
      >
        星河智安实验室（XingHe ZhiAn Lab）专注于人工智能安全领域的前沿研究，
        涵盖对抗样本攻防、模型鲁棒性评估、深度学习安全分析等方向。
        本平台是实验室研究成果的工程化落地，旨在为 AI 安全研究人员提供高效、直观的实验与分析工具。
      </Paragraph>

      <a
        href="https://lab.rjmart.cn/10366/AISecurityLab"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 24px',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          color: '#e2e8f0',
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        }}
      >
        <GlobalOutlined />
        访问实验室主页
      </a>
    </div>
  </section>
  );
};

/* ─────────────────────────────────────────────
   ResearchSection — 研究方向列表
───────────────────────────────────────────── */
const RESEARCH_DIRECTIONS = [
  {
    icon: <ThunderboltOutlined style={{ fontSize: 26, color: '#1677ff' }} />,
    title: '对抗样本攻防',
    desc: '研究针对深度神经网络的对抗攻击方法（FGSM、PGD、C&W、DeepFool 等）及相应的防御策略，探索攻防博弈的理论边界。',
    color: '#e8f1ff',
    tag: '核心方向',
    tagColor: 'blue',
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 26, color: '#52c41a' }} />,
    title: '模型鲁棒性评估',
    desc: '建立系统化的模型鲁棒性评估框架，量化模型在对抗扰动、自然噪声和分布偏移下的性能退化程度。',
    color: '#f0fff4',
    tag: '核心方向',
    tagColor: 'green',
  },
  {
    icon: <BulbOutlined style={{ fontSize: 26, color: '#fa8c16' }} />,
    title: '深度学习安全分析',
    desc: '分析深度学习模型在实际部署场景中的安全风险，包括后门攻击、数据投毒、模型窃取等威胁的检测与防御。',
    color: '#fff7e6',
    tag: '研究方向',
    tagColor: 'orange',
  },
  {
    icon: <BarChartOutlined style={{ fontSize: 26, color: '#722ed1' }} />,
    title: '可视化分析与解释',
    desc: '开发直观的可视化工具，帮助研究人员理解对抗扰动的空间分布、频域特征及模型决策机制。',
    color: '#f9f0ff',
    tag: '研究方向',
    tagColor: 'purple',
  },
  {
    icon: <AimOutlined style={{ fontSize: 26, color: '#eb2f96' }} />,
    title: '参数敏感性与泛化研究',
    desc: '系统研究攻击算法超参数对攻击效果的影响规律，探索对抗样本的跨模型迁移性与泛化能力。',
    color: '#fff0f6',
    tag: '研究方向',
    tagColor: 'magenta',
  },
  {
    icon: <ExperimentOutlined style={{ fontSize: 26, color: '#13c2c2' }} />,
    title: '多模态安全',
    desc: '将对抗攻击研究从图像分类扩展至目标检测、语义分割等多任务场景，探索多模态模型的安全边界。',
    color: '#e6fffb',
    tag: '前沿探索',
    tagColor: 'cyan',
  },
];

const ResearchSection = () => {
  const isMobile = useIsMobile();
  return (
  <section style={{ padding: isMobile ? '48px 16px' : '72px 24px', background: '#f8fafc' }}>
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
          RESEARCH DIRECTIONS
        </Tag>
        <Title level={2} style={{ margin: '0 0 12px', color: '#0f172a', fontSize: isMobile ? 24 : 30 }}>
          研究方向
        </Title>
        <Paragraph style={{ color: '#64748b', fontSize: isMobile ? 14 : 15, margin: 0 }}>
          聚焦 AI 安全前沿，构建完整的对抗攻防研究体系
        </Paragraph>
      </div>

      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
        {RESEARCH_DIRECTIONS.map((item) => (
          <Col key={item.title} xs={24} sm={12} lg={8}>
            <Card
              style={{
                height: '100%',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
              }}
              styles={{ body: { padding: isMobile ? 18 : 24 } }}
              hoverable
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {item.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  {item.title}
                </Title>
                <Tag
                  color={item.tagColor}
                  style={{ borderRadius: 999, fontSize: 11, fontWeight: 600, margin: 0 }}
                >
                  {item.tag}
                </Tag>
              </div>
              <Paragraph style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                {item.desc}
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
   TechStackSection — 平台技术栈说明
───────────────────────────────────────────── */
const TECH_STACK = [
  {
    category: '前端',
    color: '#1677ff',
    bgColor: '#e8f1ff',
    icon: <CodeOutlined style={{ fontSize: 20, color: '#1677ff' }} />,
    items: [
      { name: 'React 18', desc: '前端框架，基于 Hooks 的函数式组件开发' },
      { name: 'Ant Design 5', desc: '企业级 UI 组件库，提供丰富的交互组件' },
      { name: 'Vite', desc: '新一代前端构建工具，极速热更新' },
      { name: 'React Router 6', desc: '前端路由管理，支持嵌套路由与懒加载' },
    ],
  },
  {
    category: '后端',
    color: '#52c41a',
    bgColor: '#f0fff4',
    icon: <ApiOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
    items: [
      { name: 'FastAPI', desc: '高性能 Python Web 框架，自动生成 OpenAPI 文档' },
      { name: 'Celery', desc: '分布式任务队列，支持异步执行对抗攻击计算任务' },
      { name: 'SQLAlchemy', desc: 'Python ORM 框架，支持数据库迁移与模型管理' },
      { name: 'Pydantic', desc: '数据验证与序列化，确保 API 输入输出类型安全' },
    ],
  },
  {
    category: '基础设施',
    color: '#fa8c16',
    bgColor: '#fff7e6',
    icon: <CloudServerOutlined style={{ fontSize: 20, color: '#fa8c16' }} />,
    items: [
      { name: 'Redis', desc: '消息代理与结果后端，支持 Celery 任务队列与缓存' },
      { name: 'PostgreSQL', desc: '关系型数据库，存储用户数据、任务记录与攻击历史' },
      { name: 'Alembic', desc: '数据库迁移工具，管理 Schema 版本演进' },
      { name: 'Docker', desc: '容器化部署，确保开发与生产环境一致性' },
    ],
  },
  {
    category: 'AI / ML',
    color: '#722ed1',
    bgColor: '#f9f0ff',
    icon: <ExperimentOutlined style={{ fontSize: 20, color: '#722ed1' }} />,
    items: [
      { name: 'PyTorch', desc: '深度学习框架，支持 GPU 加速的对抗攻击计算' },
      { name: 'torchvision', desc: '计算机视觉工具库，提供预训练模型与图像变换' },
      { name: 'Ultralytics YOLOv8', desc: '目标检测模型，支持对抗攻击实验' },
      { name: 'NumPy / OpenCV', desc: '图像处理与数值计算，用于扰动可视化分析' },
    ],
  },
];

const TechStackSection = () => {
  const isMobile = useIsMobile();
  return (
  <section style={{ padding: isMobile ? '48px 16px' : '72px 24px', background: '#ffffff' }}>
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
          TECH STACK
        </Tag>
        <Title level={2} style={{ margin: '0 0 12px', color: '#0f172a', fontSize: isMobile ? 24 : 30 }}>
          平台技术栈
        </Title>
        <Paragraph style={{ color: '#64748b', fontSize: isMobile ? 14 : 15, margin: 0 }}>
          基于现代化技术栈构建，兼顾性能、可扩展性与开发体验
        </Paragraph>
      </div>

      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
        {TECH_STACK.map((stack) => (
          <Col key={stack.category} xs={24} sm={12}>
            <Card
              style={{
                height: '100%',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
              }}
              styles={{ body: { padding: isMobile ? 18 : 24 } }}
            >
              {/* 分类标题 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: stack.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stack.icon}
                </div>
                <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                  {stack.category}
                </Title>
              </div>

              <Divider style={{ margin: '0 0 16px' }} />

              {/* 技术列表 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stack.items.map((tech) => (
                  <div key={tech.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircleOutlined
                      style={{ color: stack.color, fontSize: 14, marginTop: 3, flexShrink: 0 }}
                    />
                    <div>
                      <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                        {tech.name}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 13, display: 'block', lineHeight: 1.6 }}>
                        {tech.desc}
                      </Text>
                    </div>
                  </div>
                ))}
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
   VersionSection — 版本信息（从 /info 动态获取）
───────────────────────────────────────────── */
const VersionSection = () => {
  const isMobile = useIsMobile();
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/info`)
      .then((res) => {
        setVersionInfo(res.data);
      })
      .catch((err) => {
        console.error('获取版本信息失败:', err);
        setError('无法获取版本信息');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section
      style={{
        padding: isMobile ? '48px 16px' : '72px 24px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
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
          VERSION INFO
        </Tag>

        <Title level={2} style={{ color: '#ffffff', margin: '0 0 40px', fontSize: isMobile ? 24 : 30 }}>
          平台版本信息
        </Title>

        {loading ? (
          <Spin size="large" tip="加载版本信息..." />
        ) : error ? (
          <div
            style={{
              padding: '24px',
              borderRadius: 16,
              background: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <InfoCircleOutlined style={{ color: '#ff4d4f', fontSize: 20, marginBottom: 8 }} />
            <Text style={{ color: '#fca5a5', display: 'block' }}>{error}</Text>
          </div>
        ) : (
          <Row gutter={[20, 20]} justify="center">
            {/* 版本号 */}
            <Col xs={24} sm={8}>
              <div
                style={{
                  padding: '28px 20px',
                  borderRadius: 20,
                  background: 'rgba(22, 119, 255, 0.15)',
                  border: '1px solid rgba(22, 119, 255, 0.3)',
                  textAlign: 'center',
                }}
              >
                <DatabaseOutlined style={{ fontSize: 28, color: '#60a5fa', marginBottom: 12 }} />
                <Text
                  style={{
                    color: 'rgba(148, 163, 184, 0.8)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    display: 'block',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  当前版本
                </Text>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 28,
                    fontWeight: 800,
                    display: 'block',
                    letterSpacing: '-0.02em',
                  }}
                >
                  v{versionInfo?.app?.version ?? '—'}
                </Text>
              </div>
            </Col>

            {/* 平台名称 */}
            <Col xs={24} sm={16}>
              <div
                style={{
                  padding: '28px 24px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'left',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'rgba(148, 163, 184, 0.8)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    display: 'block',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  平台名称
                </Text>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: 700,
                    display: 'block',
                    marginBottom: 16,
                  }}
                >
                  {versionInfo?.app?.name ?? '星河智安 AI安全攻击可视化平台'}
                </Text>

                <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0 0 16px' }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(versionInfo?.algorithms ?? []).map((algo) => (
                    <Tag
                      key={algo.name}
                      style={{
                        background: 'rgba(22, 119, 255, 0.2)',
                        border: '1px solid rgba(22, 119, 255, 0.35)',
                        color: '#93c5fd',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {algo.name}
                    </Tag>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   Footer
───────────────────────────────────────────── */
const PageFooter = () => {
  const isMobile = useIsMobile();
  return (
  <footer
    style={{
      padding: isMobile ? '20px 16px' : '24px',
      background: '#0f172a',
      textAlign: 'center',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <Text style={{ color: 'rgba(148,163,184,0.7)', fontSize: isMobile ? 12 : 13, lineHeight: 1.7, display: 'block' }}>
      © {new Date().getFullYear()} 浙江科技大学大数据与智能安全实验室
      {isMobile ? <br /> : ' · '}
      星河智安 AI 安全攻击可视化平台
    </Text>
  </footer>
  );
};

/* ─────────────────────────────────────────────
   AboutPage（组合）
───────────────────────────────────────────── */
const AboutPage = () => (
  <div style={{ minHeight: '100vh', background: '#f8fafc', overflowX: 'hidden' }}>
    <PublicNavbar />
    <main>
      <LabIntroSection />
      <ResearchSection />
      <TechStackSection />
      <VersionSection />
    </main>
    <PageFooter />
  </div>
);

export default AboutPage;
