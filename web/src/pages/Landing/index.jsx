import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  AuroraBackground, Sparkles, BackgroundGrid, BackgroundBeams,
  TextGenerateEffect, FlipWords, InfiniteMovingCards,
  MagneticButton, TracingBeam, BentoGrid, BentoGridItem,
  EvervingCard, GlowingCard, SpotlightCard, LampContainer,
} from '../../components/Aceternity';
import {
  Marquee, BorderBeam, ShimmerButton, HyperText, BlurFade,
  RetroGrid, NumberTicker, AnimatedGradientText, Meteors,
  FlickeringGrid, NeonGradientCard, GlareHover, Lens,
  OrbitingCircles,
} from '../../components/MagicUI';

/* ═══════════════ tokens ═══════════════ */
const S = {
  nav: (scrolled) => ({
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 4vw, 56px)', height: 64,
    background: scrolled ? 'rgba(10,10,26,0.92)' : 'rgba(10,10,26,0.35)',
    backdropFilter: 'blur(24px) saturate(200%)',
    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
    borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
    transition: 'all 0.35s ease',
  }),
  section: { position: 'relative', padding: 'clamp(80px, 10vw, 140px) 24px', overflow: 'hidden' },
  inner: { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 },
  tag: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '5px 14px', borderRadius: 999,
    background: `${color}12`, border: `1px solid ${color}25`,
    fontSize: 11, fontWeight: 700, color, letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 20,
  }),
  h2: { fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.02em' },
  desc: { fontSize: 17, color: '#64748b', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 },
};

/* ═══════════════ data ═══════════════ */
const algorithms = [
  { name: 'FGSM', full: 'Fast Gradient Sign Method', desc: '单步梯度符号攻击，计算高效，是验证模型鲁棒性的首选基线方法。', color: '#3b82f6', icon: '⚡', speed: '10ms', precision: '★★★' },
  { name: 'I-FGSM', full: 'Iterative FGSM', desc: '多步迭代版本，通过逐步优化提升攻击成功率和扰动精度。', color: '#8b5cf6', icon: '🔄', speed: '50ms', precision: '★★★★' },
  { name: 'PGD', full: 'Projected Gradient Descent', desc: '最强一阶攻击方法，通用性极强，被视为模型鲁棒性评估的金标准。', color: '#06b6d4', icon: '🎯', speed: '100ms', precision: '★★★★★' },
  { name: 'C&W', full: 'Carlini & Wagner', desc: '基于优化的高精度攻击，产生的扰动几乎不可感知，适合深度安全审计。', color: '#f59e0b', icon: '🔬', speed: '2s', precision: '★★★★★' },
  { name: 'DeepFool', full: 'DeepFool', desc: '计算最近决策边界的理论距离，提供严格的鲁棒性下界估计。', color: '#10b981', icon: '📐', speed: '200ms', precision: '★★★★' },
];

const capabilities = [
  { title: '实时可视化引擎', desc: '对抗样本生成全过程实时呈现，原始图像与扰动层分离展示，像素级差异热力图一目了然。', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { title: '智能对比模式', desc: '左右滑块对比、多算法同图叠加、量化差异图表，三种维度深度比较攻击效果。', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { title: '交互式参数调优', desc: '可视化滑块实时调节 epsilon / steps / learning rate，预设模板与自定义并行。', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { title: '置信度分析图表', desc: '分类置信度变化柱状图，Top-K 概率分布对比，攻击前后模型决策全景展示。', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { title: '扰动热力图', desc: '像素级扰动幅度可视化，颜色编码直观呈现攻击影响区域，支持缩放与导出。', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { title: '多模型架构支持', desc: 'ResNet / VGG / Inception / MobileNet 等主流架构开箱即用，灵活扩展。', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
];

const movingItems = [
  { quote: '覆盖 FGSM、PGD、C&W 等 5 大主流对抗攻击算法', name: '全面覆盖', title: '算法层', icon: '🛡️' },
  { quote: '像素级扰动可视化 + 置信度变化实时图表', name: '深度可视化', title: '分析层', icon: '📊' },
  { quote: '参数滑块即时调优，攻击效果秒级呈现', name: '极致交互', title: '体验层', icon: '⚡' },
  { quote: '支持 ResNet / VGG / Inception 等主流架构', name: '广泛兼容', title: '模型层', icon: '🔧' },
  { quote: '一键导出攻击结果、热力图、对比报告', name: '一键导出', title: '输出层', icon: '📤' },
  { quote: '攻击历史全记录，支持搜索与重运行', name: '完整追溯', title: '管理层', icon: '📋' },
];

const stats = [
  { value: 5, suffix: '+', label: '攻击算法', color: '#1677ff' },
  { value: 6, suffix: '+', label: '可视化维度', color: '#7c3aed' },
  { value: 100, suffix: '%', label: 'Web 端操作', color: '#06b6d4' },
  { value: 4, suffix: '+', label: '模型架构', color: '#10b981' },
];

const techStack = ['PyTorch', 'TensorFlow', 'ResNet', 'VGG', 'Inception', 'MobileNet', 'FGSM', 'PGD', 'C&W', 'DeepFool', 'Grad-CAM', 'NumPy'];

/* ═══════════════ NavBar ═══════════════ */
function NavBar() {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav style={S.nav(scrolled)}>
      <motion.div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} whileHover={{ scale: 1.03 }}>
        <motion.div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #1677ff, #7c3aed)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }} whileHover={{ rotate: 8 }} transition={{ type: 'spring', stiffness: 300 }}>X</motion.div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>星河智安</span>
      </motion.div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {['功能', '算法', '架构'].map((item) => (
          <motion.a key={item} href={`#${item}`} onClick={(e) => { e.preventDefault(); document.getElementById(item)?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', cursor: 'pointer', position: 'relative', padding: '4px 0' }}
            whileHover={{ color: '#fff' }}>
            {item}
            <motion.div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, borderRadius: 1, background: '#60a5fa', transformOrigin: 'center' }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.25 }} />
          </motion.a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.button onClick={() => nav('/login')} style={{ padding: '6px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', fontSize: 13, fontWeight: 600, color: '#e2e8f0', cursor: 'pointer' }} whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)' }} whileTap={{ scale: 0.97 }}>登录</motion.button>
        <MagneticButton>
          <motion.button onClick={() => nav('/register')} style={{ padding: '6px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1677ff, #7c3aed)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(22,119,255,0.3)' }} whileHover={{ scale: 1.04, boxShadow: '0 4px 24px rgba(22,119,255,0.45)' }} whileTap={{ scale: 0.97 }}>免费注册</motion.button>
        </MagneticButton>
      </div>
    </nav>
  );
}

/* ═══════════════ HERO ═══════════════ */
function HeroSection() {
  const nav = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div ref={heroRef} style={{ position: 'relative', background: '#050510', overflow: 'hidden' }}>
      <motion.div style={{ y: heroY, opacity: heroOpacity }}>
        {/* Background layers */}
        <FlickeringGrid color="rgb(96, 165, 250)" squareSize={3} gridGap={8} flickerChance={0.08} maxOpacity={0.25} />
        <Meteors number={12} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.2 }}><BackgroundGrid /></div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}><Sparkles background={false} minSize={0.2} maxSize={0.8} particleDensity={30} /></div>

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.08) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px' }}>
          {/* Badge */}
          <BlurFade delay={0.3} duration={0.8}>
            <div style={{ marginBottom: 32 }}>
              <HyperText text="AI ADVERSARIAL ATTACK PLATFORM" duration={1200} style={{
                fontSize: 11, fontWeight: 700, color: '#60a5fa', letterSpacing: 3,
                padding: '6px 16px', borderRadius: 999,
                background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.12)',
              }} />
            </div>
          </BlurFade>

          {/* Title */}
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <AnimatedGradientText
              colors={['#ffffff', '#60a5fa', '#a78bfa', '#c084fc', '#ffffff']}
              speed={5}
              style={{ fontSize: 'clamp(56px, 10vw, 100px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', display: 'block' }}
            >
              星河智安
            </AnimatedGradientText>
          </div>

          {/* Subtitle */}
          <BlurFade delay={1.2} duration={0.8}>
            <div style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 600, color: '#e2e8f0', marginBottom: 14, textAlign: 'center' }}>
              <span>AI 对抗攻击</span>
              <FlipWords words={['可视化', '智能化', '一体化', '专业化']} style={{ color: '#60a5fa', fontWeight: 700 }} />
              <span>平台</span>
            </div>
          </BlurFade>

          <BlurFade delay={1.6} duration={0.8}>
            <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.8, color: '#94a3b8', maxWidth: 560, margin: '0 auto 56px', textAlign: 'center' }}>
              集成 FGSM、PGD、C&W 等主流对抗攻击算法，提供实时可视化、参数调优、结果对比的一站式 AI 安全研究平台。
            </p>
          </BlurFade>

          {/* CTA */}
          <BlurFade delay={2} duration={0.7}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <MagneticButton>
                <ShimmerButton onClick={() => nav('/register')} shimmerColor="rgba(255,255,255,0.2)" style={{ padding: '16px 44px', fontSize: 17, boxShadow: '0 8px 40px rgba(22,119,255,0.4)' }}>
                  立即体验
                </ShimmerButton>
              </MagneticButton>
              <motion.button onClick={() => nav('/login')} style={{ padding: '16px 44px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)', fontSize: 17, fontWeight: 600, color: '#e2e8f0', cursor: 'pointer' }} whileHover={{ scale: 1.06, borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }} whileTap={{ scale: 0.97 }}>已有账号登录</motion.button>
            </div>
          </BlurFade>
        </div>

        {/* Tech marquee at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '24px 0', background: 'linear-gradient(to top, rgba(5,5,16,0.95), transparent)' }}>
          <Marquee pauseOnHover style={{ opacity: 0.4 }}>
            {techStack.map((t) => (
              <div key={t} style={{ padding: '5px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </Marquee>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5, duration: 1 }} style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 24, height: 38, borderRadius: 12, border: '2px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', paddingTop: 7 }}>
          <motion.div animate={{ opacity: [0.2, 0.8, 0.2], y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 3, height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ═══════════════ STATS ═══════════════ */
function StatsBar() {
  return (
    <section style={{ position: 'relative', padding: '64px 24px', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)' }}>
      <div style={{ ...S.inner, display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap' }}>
        {stats.map((s, i) => (
          <BlurFade key={s.label} delay={i * 0.1} duration={0.6}>
            <NeonGradientCard
              neonColors={{ firstColor: s.color, secondColor: '#7c3aed' }}
              size={200}
              style={{ width: 'clamp(140px, 20vw, 220px)' }}
            >
              <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900, lineHeight: 1, background: `linear-gradient(135deg, ${s.color}, #7c3aed)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  <NumberTicker value={s.value} duration={2} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 8 }}>{s.label}</div>
              </div>
            </NeonGradientCard>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════ PRODUCT DEMO ═══════════════ */
function ProductDemoSection() {
  return (
    <section style={{ ...S.section, background: '#0f172a' }}>
      <FlickeringGrid color="rgb(96, 165, 250)" squareSize={2} gridGap={10} flickerChance={0.04} maxOpacity={0.12} />
      <div style={S.inner}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={S.tag('#60a5fa')}>Product Demo</div>
          <h2 style={{ ...S.h2, color: '#fff' }}>平台功能一览</h2>
          <p style={{ ...S.desc, color: '#94a3b8' }}>从攻击配置到结果分析，每个环节都精心设计。</p>
        </BlurFade>

        {/* Browser mockup with Lens */}
        <BlurFade delay={0.2}>
          <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto' }}>
            <BorderBeam duration={6} colorFrom="#1677ff" colorTo="#7c3aed" />
            <Lens zoomFactor={1.8} lensSize={180}>
              <div style={{
                background: '#1e293b', borderRadius: 16, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}>
                {/* Title bar */}
                <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                  <div style={{ marginLeft: 12, padding: '3px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', fontSize: 11, color: '#94a3b8', flex: 1 }}>星河智安 — 攻击可视化平台</div>
                </div>

                {/* Mock UI */}
                <div style={{ display: 'flex', minHeight: 380 }}>
                  {/* Sidebar */}
                  <div style={{ width: 180, background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '16px 12px' }}>
                    <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(22,119,255,0.15)', color: '#60a5fa', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>攻击面板</div>
                    {['FGSM', 'I-FGSM', 'PGD', 'C&W', 'DeepFool'].map((a, i) => (
                      <div key={a} style={{ padding: '6px 10px', borderRadius: 8, color: i === 2 ? '#fff' : '#64748b', background: i === 2 ? 'rgba(22,119,255,0.2)' : 'transparent', fontSize: 12, marginBottom: 4, fontWeight: i === 2 ? 600 : 400 }}>{a}</div>
                    ))}
                    <div style={{ marginTop: 16, padding: '6px 10px', borderRadius: 8, color: '#64748b', fontSize: 12 }}>历史记录</div>
                    <div style={{ padding: '6px 10px', borderRadius: 8, color: '#64748b', fontSize: 12 }}>系统设置</div>
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, padding: 20 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>PGD 攻击</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Projected Gradient Descent</div>
                      </div>
                      <div style={{ padding: '6px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #1677ff, #7c3aed)', color: '#fff', fontSize: 12, fontWeight: 600 }}>运行攻击</div>
                    </div>

                    {/* Params */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                      {[
                        { label: 'Epsilon', value: '0.03', bar: '30%' },
                        { label: 'Steps', value: '40', bar: '40%' },
                        { label: 'Alpha', value: '0.007', bar: '20%' },
                      ].map((p) => (
                        <div key={p.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{p.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{p.value}</div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ width: p.bar, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #1677ff, #7c3aed)' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Results */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { label: '原始图像', bg: 'linear-gradient(135deg, #1e3a5f, #0f172a)', icon: '🖼️' },
                        { label: '对抗样本', bg: 'linear-gradient(135deg, #5b21b6, #1e1b4b)', icon: '⚡' },
                        { label: '扰动热力图', bg: 'linear-gradient(135deg, #065f46, #0f172a)', icon: '🔥' },
                      ].map((r) => (
                        <div key={r.label} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ height: 100, background: r.bg, display: 'grid', placeItems: 'center', fontSize: 32 }}>{r.icon}</div>
                          <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Lens>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

/* ═══════════════ FEATURES ═══════════════ */
function FeaturesSection() {
  return (
    <section id="功能" style={{ ...S.section, background: '#fff' }}>
      <div style={S.inner}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={S.tag('#7c3aed')}>Platform Features</div>
          <h2 style={S.h2}>平台核心能力</h2>
          <p style={S.desc}>从攻击生成到结果分析，全流程可视化操作，让 AI 安全研究更高效。</p>
        </BlurFade>

        <BentoGrid>
          {capabilities.map((cap, i) => {
            const isWide = i === 0 || i === 3;
            return (
              <BlurFade key={cap.title} delay={i * 0.08}>
                <GlareHover borderRadius={20} glareColor="rgba(22,119,255,0.08)" style={{ height: '100%' }}>
                  <BentoGridItem
                    title={cap.title}
                    description={cap.desc}
                    colSpan={isWide ? 2 : 1}
                    header={
                      <div style={{ height: isWide ? 130 : 100, background: cap.gradient, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    }
                  />
                </GlareHover>
              </BlurFade>
            );
          })}
        </BentoGrid>
      </div>
    </section>
  );
}

/* ═══════════════ ALGORITHMS ═══════════════ */
function AlgorithmsSection() {
  const [hoveredAlgo, setHoveredAlgo] = useState(null);

  const precisionToWidth = (p) => {
    const map = { '★★★': '45%', '★★★★': '65%', '★★★★★': '90%' };
    return map[p] || '50%';
  };
  const speedToWidth = (s) => {
    const ms = parseFloat(s);
    if (ms <= 20) return '90%';
    if (ms <= 60) return '70%';
    if (ms <= 150) return '50%';
    return '30%';
  };

  return (
    <section id="算法" style={{ ...S.section, background: '#050510', padding: 'clamp(100px, 12vw, 160px) 24px' }}>
      <FlickeringGrid color="rgb(96, 165, 250)" squareSize={2} gridGap={10} flickerChance={0.05} maxOpacity={0.12} />
      <Meteors number={6} />
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={S.inner}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={S.tag('#60a5fa')}>Supported Algorithms</div>
          <h2 style={{ ...S.h2, color: '#fff' }}>五大主流对抗攻击算法</h2>
          <p style={{ ...S.desc, color: '#94a3b8' }}>覆盖从快速验证到高精度评估的完整攻击谱系，悬停卡片聚焦查看详情。</p>
        </BlurFade>

        {/* FocusCards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          {algorithms.map((algo, i) => (
            <BlurFade key={algo.name} delay={i * 0.08}>
              <motion.div
                onMouseEnter={() => setHoveredAlgo(i)}
                onMouseLeave={() => setHoveredAlgo(null)}
                style={{
                  position: 'relative', borderRadius: 20, overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: hoveredAlgo !== null && hoveredAlgo !== i ? 'blur(6px) brightness(0.5)' : 'none',
                  transform: hoveredAlgo === i ? 'scale(1.03)' : hoveredAlgo !== null ? 'scale(0.97)' : 'scale(1)',
                }}
              >
                {/* NeonGradientCard border */}
                <div style={{
                  borderRadius: 20, padding: 1.5,
                  background: `radial-gradient(300px circle at ${hoveredAlgo === i ? '50%' : '0%'} ${hoveredAlgo === i ? '50%' : '0%'}, ${algo.color}, #7c3aed, transparent)`,
                  transition: 'background 0.4s ease',
                }}>
                  <div style={{
                    borderRadius: 18,
                    background: 'rgba(15,23,42,0.95)',
                    backdropFilter: 'blur(20px)',
                    padding: 28,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* GlareEffect */}
                    <GlareHover borderRadius={18} glareColor={`${algo.color}20`} glareSize={300} style={{ position: 'absolute', inset: 0 }}>
                      <div />
                    </GlareHover>

                    {/* Top accent line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${algo.color}, transparent)` }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <motion.div
                          animate={hoveredAlgo === i ? { scale: [1, 1.15, 1], rotate: [0, 5, 0] } : {}}
                          transition={{ duration: 0.5 }}
                          style={{
                            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                            background: `linear-gradient(135deg, ${algo.color}20, ${algo.color}08)`,
                            display: 'grid', placeItems: 'center', fontSize: 24,
                            border: `1px solid ${algo.color}25`,
                            boxShadow: hoveredAlgo === i ? `0 0 24px ${algo.color}30` : 'none',
                            transition: 'box-shadow 0.4s ease',
                          }}
                        >
                          {algo.icon}
                        </motion.div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: algo.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>{algo.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{algo.full}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: 13, lineHeight: 1.7, color: '#94a3b8', margin: '0 0 20px' }}>{algo.desc}</p>

                      {/* Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>速度</span>
                            <span style={{ fontSize: 10, color: algo.color, fontWeight: 600 }}>{algo.speed}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: speedToWidth(algo.speed) }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                              style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${algo.color}, ${algo.color}80)` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>精度</span>
                            <span style={{ fontSize: 10, color: algo.color, fontWeight: 600 }}>{algo.precision}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: precisionToWidth(algo.precision) }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                              style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, #7c3aed, ${algo.color})` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Corner glow */}
                    <div style={{
                      position: 'absolute', bottom: -40, right: -40, width: 120, height: 120, borderRadius: '50%',
                      background: `radial-gradient(circle, ${algo.color}10, transparent 70%)`,
                      opacity: hoveredAlgo === i ? 1 : 0, transition: 'opacity 0.4s ease',
                    }} />
                  </div>
                </div>
              </motion.div>
            </BlurFade>
          ))}
        </div>

        {/* Bottom connector line */}
        <BlurFade delay={0.5} style={{ marginTop: 48, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {algorithms.map((algo, i) => (
              <React.Fragment key={algo.name}>
                <motion.div
                  whileHover={{ scale: 1.3 }}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: algo.color, cursor: 'pointer', boxShadow: `0 0 12px ${algo.color}40` }}
                  onMouseEnter={() => setHoveredAlgo(i)}
                  onMouseLeave={() => setHoveredAlgo(null)}
                />
                {i < algorithms.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                    style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${algo.color}, ${algorithms[i + 1].color})`, borderRadius: 1, transformOrigin: 'left' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 16, letterSpacing: 1 }}>从快速验证到高精度评估，覆盖完整攻击谱系</div>
        </BlurFade>
      </div>
    </section>
  );
}

/* ═══════════════ ARCHITECTURE ═══════════════ */
function ArchitectureSection() {
  const steps = [
    { label: '上传模型', desc: '导入预训练模型，支持 PyTorch / TensorFlow 等主流框架', icon: '📤', color: '#3b82f6' },
    { label: '选择算法', desc: '从 5 种攻击算法中选择，配置 epsilon、步长等参数', icon: '⚙️', color: '#8b5cf6' },
    { label: '生成攻击', desc: '一键生成对抗样本，实时进度跟踪，中途可调参', icon: '🚀', color: '#06b6d4' },
    { label: '可视化分析', desc: '扰动热力图、置信度图表、对比滑块，多维分析', icon: '📊', color: '#10b981' },
  ];

  return (
    <section id="架构" style={{ ...S.section, background: '#fff' }}>
      <div style={S.inner}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={S.tag('#f59e0b')}>How It Works</div>
          <h2 style={S.h2}>四步完成对抗攻击分析</h2>
          <p style={S.desc}>简洁直观的工作流程，从上传到分析，全程可视化引导。</p>
        </BlurFade>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {steps.map((step, i) => (
            <BlurFade key={step.label} delay={i * 0.12} style={{ flex: '1 1 220px', maxWidth: 260 }}>
              <EvervingCard delay={i * 0.3}>
                <NeonGradientCard neonColors={{ firstColor: step.color, secondColor: '#7c3aed' }} size={180}>
                  <div style={{ padding: '32px 20px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '2px 12px', borderRadius: 999, background: step.color, color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                    <div style={{ width: 64, height: 64, borderRadius: 18, margin: '14px auto 16px', background: `${step.color}0d`, display: 'grid', placeItems: 'center', fontSize: 28, border: `1px solid ${step.color}12` }}>{step.icon}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{step.label}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                  </div>
                </NeonGradientCard>
              </EvervingCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ SHOWCASE ═══════════════ */
function ShowcaseSection() {
  return (
    <section style={{ ...S.section, background: '#f8fafc' }}>
      <div style={S.inner}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={S.tag('#06b6d4')}>Why XingHe</div>
          <h2 style={S.h2}>为什么选择星河智安</h2>
        </BlurFade>
        <InfiniteMovingCards items={movingItems} direction="left" speed="normal" pauseOnHover />
        <div style={{ marginTop: 16 }}>
          <InfiniteMovingCards items={[...movingItems].reverse()} direction="right" speed="normal" pauseOnHover />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ CTA ═══════════════ */
function CTASection() {
  const nav = useNavigate();
  return (
    <section style={{ position: 'relative', padding: 'clamp(100px, 12vw, 160px) 24px', textAlign: 'center', background: '#050510', overflow: 'hidden' }}>
      <FlickeringGrid color="rgb(96, 165, 250)" squareSize={2} gridGap={12} flickerChance={0.05} maxOpacity={0.15} />
      <Meteors number={8} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}><BackgroundBeams /></div>
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.1) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <BlurFade style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', fontSize: 11, fontWeight: 700, color: '#60a5fa', letterSpacing: 1.5, marginBottom: 28 }}>GET STARTED</div>

        <h2 style={{ fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
          <AnimatedGradientText colors={['#ffffff', '#60a5fa', '#a78bfa', '#ffffff']} speed={4}>
            开启 AI 安全研究之旅
          </AnimatedGradientText>
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto 56px', lineHeight: 1.7 }}>免费注册，即刻体验前沿对抗攻击可视化平台。</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <MagneticButton>
            <ShimmerButton onClick={() => nav('/register')} style={{ padding: '18px 52px', fontSize: 18, borderRadius: 14, boxShadow: '0 8px 40px rgba(22,119,255,0.4)' }} shimmerColor="rgba(255,255,255,0.2)">免费注册</ShimmerButton>
          </MagneticButton>
          <motion.button onClick={() => nav('/login')} style={{ padding: '18px 52px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)', fontSize: 18, fontWeight: 600, color: '#e2e8f0', cursor: 'pointer' }} whileHover={{ scale: 1.06, borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }} whileTap={{ scale: 0.97 }}>登录</motion.button>
        </div>
      </BlurFade>

      <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #1677ff, #7c3aed)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>X</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>星河智安</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: 0 }}>&copy; {new Date().getFullYear()} XingHe ZhiAn &mdash; AI Adversarial Attack Visualization Platform</p>
      </div>
    </section>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', overflowX: 'hidden' }}>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <ProductDemoSection />
      <FeaturesSection />
      <AlgorithmsSection />
      <ArchitectureSection />
      <ShowcaseSection />
      <CTASection />
    </div>
  );
}
