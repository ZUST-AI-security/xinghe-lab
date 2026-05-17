import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CosmicVortex, MagneticButton, GlowingEffect, GlowingCard,
  FlipWords, LampContainer, InfiniteMovingCards,
} from '../../components/Aceternity';
import {
  BlurFade, AnimatedGradientText, GlareHover,
  ShimmerButton, HyperText, NumberTicker,
} from '../../components/MagicUI';

/* ═══════════════════════════════════════════════
   Cinematic Landing Page — 星河智安
   ═══════════════════════════════════════════════ */

const navItems = [
  { label: '首页', id: 'hero' },
  { label: '功能', id: 'features' },
  { label: '算法', id: 'algorithms' },
  { label: '关于', id: 'about' },
];

const heroSubtitles = [
  'AI 对抗攻击可视化平台',
  '深度学习鲁棒性评估工具',
  '前沿对抗样本研究利器',
];

const stats = [
  { value: 5, suffix: '+', label: '攻击算法' },
  { value: 4, suffix: '+', label: '预训练模型' },
  { value: 6, suffix: '', label: '可视化维度' },
  { value: 100, suffix: '%', label: '开源免费' },
];

const features = [
  { icon: '🔬', title: '实时可视化', desc: '对抗样本生成全过程实时呈现，像素级差异一目了然', color: '#3b82f6', span: 2 },
  { icon: '⚖️', title: '智能对比', desc: '左右滑块对比、多算法同图叠加、量化差异图表', color: '#8b5cf6', span: 2 },
  { icon: '🎛️', title: '参数调优', desc: '可视化滑块实时调节 epsilon / steps / learning rate', color: '#06b6d4', span: 1 },
  { icon: '📊', title: '置信度分析', desc: '分类置信度变化柱状图，Top-K 概率分布对比', color: '#f59e0b', span: 1 },
  { icon: '🔥', title: '扰动热力图', desc: '像素级扰动幅度可视化，颜色编码攻击影响区域', color: '#ef4444', span: 1 },
  { icon: '🏗️', title: '多模型支持', desc: 'ResNet / VGG / Inception / MobileNet 开箱即用', color: '#10b981', span: 1 },
];

const algorithms = [
  { name: 'FGSM', full: 'Fast Gradient Sign Method', color: '#3b82f6', icon: '⚡', desc: '单步梯度符号攻击，计算高效', speed: '极快', strength: '中等' },
  { name: 'I-FGSM', full: 'Iterative FGSM', color: '#8b5cf6', icon: '🔄', desc: '多步迭代版本，攻击精度更高', speed: '快速', strength: '较强' },
  { name: 'PGD', full: 'Projected Gradient Descent', color: '#06b6d4', icon: '🎯', desc: '最强一阶攻击，鲁棒性评估金标准', speed: '中等', strength: '最强' },
  { name: 'C&W', full: 'Carlini & Wagner', color: '#f59e0b', icon: '🔬', desc: '基于优化的高精度攻击', speed: '较慢', strength: '极强' },
  { name: 'DeepFool', full: 'DeepFool', color: '#10b981', icon: '📐', desc: '计算最近决策边界的理论距离', speed: '中等', strength: '较强' },
];

/* ═══════════════ HERO ═══════════════ */
function HeroSection() {
  const nav = useNavigate();
  const [activeNav, setActiveNav] = useState('首页');

  return (
    <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <CosmicVortex />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none' }} />

      {/* NAVBAR */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ position: 'relative', zIndex: 10, width: '100%', padding: '24px clamp(20px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <motion.div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} whileHover={{ scale: 1.03 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', position: 'absolute', top: -2 }} animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 300, letterSpacing: 6, background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>星河智安</span>
        </motion.div>

        <GlareHover glareColor="rgba(255,255,255,0.04)" glareSize={200} borderRadius={999} style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {navItems.map((item) => (
            <motion.button key={item.label} onClick={() => { setActiveNav(item.label); if (item.id === 'hero') window.scrollTo({ top: 0, behavior: 'smooth' }); else document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }} style={{ padding: '8px 24px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, letterSpacing: 1, background: activeNav === item.label ? 'rgba(255,255,255,0.9)' : 'transparent', color: activeNav === item.label ? '#000' : 'rgba(255,255,255,0.6)', boxShadow: activeNav === item.label ? '0 2px 12px rgba(0,0,0,0.2)' : 'none', transition: 'all 0.3s ease' }} whileHover={activeNav !== item.label ? { color: '#fff', background: 'rgba(255,255,255,0.08)' } : {}}>{item.label}</motion.button>
          ))}
        </GlareHover>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <motion.button onClick={() => nav('/login')} style={{ fontSize: 13, fontWeight: 500, letterSpacing: 1, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }} whileHover={{ color: '#fff' }}>登录</motion.button>
          <motion.button onClick={() => nav('/register')} style={{ padding: '8px 24px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, letterSpacing: 1, background: '#fff', color: '#000', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} whileHover={{ scale: 1.05, background: '#e5e5e5' }} whileTap={{ scale: 0.97 }}>注册</motion.button>
        </div>
      </motion.header>

      {/* HERO CONTENT */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', marginTop: -40 }}>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} style={{ fontSize: 'clamp(48px, 10vw, 96px)', fontWeight: 700, letterSpacing: 12, margin: '0 0 8px', textShadow: '0 4px 20px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>
          <AnimatedGradientText colors={['#a78bfa', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa']} speed={5} style={{ fontWeight: 700 }}>星河智安</AnimatedGradientText>
        </motion.h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.9 }} style={{ fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 300, letterSpacing: 8, color: 'rgba(255,255,255,0.5)', margin: '0 0 48px', textShadow: '0 2px 10px rgba(0,0,0,0.4)', height: '1.5em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlipWords words={heroSubtitles} duration={3500} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.3 }}>
          <MagneticButton>
            <ShimmerButton onClick={() => nav('/register')} borderRadius={999} shimmerColor="rgba(255,255,255,0.25)" shimmerSize="120px" style={{ padding: '14px 56px', fontSize: 14, fontWeight: 500, letterSpacing: 4, background: 'linear-gradient(135deg, rgba(167,139,250,0.8), rgba(96,165,250,0.8), rgba(52,211,153,0.6))', boxShadow: '0 8px 32px rgba(96,165,250,0.25), 0 0 60px rgba(167,139,250,0.15)' }}>不妨一试</ShimmerButton>
          </MagneticButton>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }} style={{ marginTop: 64, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['FGSM', 'PGD', 'C&W', 'DeepFool', 'ResNet', 'VGG'].map((t, i) => (
            <motion.span key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 + i * 0.1 }} style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>{t}</motion.span>
          ))}
        </motion.div>
      </div>

      <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }} style={{ position: 'relative', zIndex: 10, width: '100%', textAlign: 'center', padding: '20px 24px', fontSize: 11, fontWeight: 300, letterSpacing: 2, color: 'rgba(255,255,255,0.2)' }}>
        &copy; {new Date().getFullYear()} 星河智安 &mdash; AI Adversarial Attack Visualization Platform
      </motion.footer>
    </section>
  );
}

/* ═══════════════ STATS BAR ═══════════════ */
function StatsBar() {
  return (
    <div style={{ background: '#050510', padding: '0 24px 40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: '32px 0', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
        {stats.map((s, i) => (
          <BlurFade key={s.label} delay={i * 0.1}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#fff', letterSpacing: 2 }}>
                <NumberTicker value={s.value} duration={2} suffix={s.suffix} style={{ color: '#fff' }} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 400, letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ FEATURES ═══════════════ */
function FeaturesSection() {
  return (
    <section id="features" style={{ position: 'relative', padding: 'clamp(60px, 8vw, 100px) 24px', background: '#050510' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#fff', margin: '0 0 12px', letterSpacing: 4 }}>
            <HyperText text="核心能力" duration={1000} style={{ color: '#fff', fontFamily: 'inherit' }} />
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontWeight: 400, letterSpacing: 2, maxWidth: 480, margin: '0 auto', lineHeight: 1.8 }}>从攻击生成到结果分析，全流程可视化操作</p>
        </BlurFade>

        {/* BentoGrid — asymmetric layout: 2 large + 4 small */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 920, margin: '0 auto' }}>
          {features.map((f, i) => {
            const isLarge = f.span === 2;
            return (
              <BlurFade key={f.title} delay={i * 0.08} style={{ gridColumn: `span ${f.span}` }}>
                <GlowingCard
                  glowColor={`${f.color}25`}
                  borderColor={`${f.color}35`}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                    height: '100%',
                    cursor: 'default',
                  }}
                >
                  <GlowingEffect spread={40} proximity={150} />
                  <div style={{ padding: isLarge ? '36px 32px' : '28px 24px', display: 'flex', flexDirection: isLarge ? 'row' : 'column', alignItems: isLarge ? 'center' : 'flex-start', gap: isLarge ? 28 : 0 }}>
                    {/* Icon with color-matched glow ring */}
                    <motion.div
                      style={{
                        width: isLarge ? 64 : 52, height: isLarge ? 64 : 52, borderRadius: isLarge ? 20 : 16, flexShrink: 0,
                        background: `linear-gradient(135deg, ${f.color}28, ${f.color}10)`,
                        border: `1px solid ${f.color}35`,
                        display: 'grid', placeItems: 'center',
                        fontSize: isLarge ? 30 : 24, marginBottom: isLarge ? 0 : 16,
                        position: 'relative',
                      }}
                      whileHover={{ scale: 1.1, rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Glow ring behind icon */}
                      <div style={{
                        position: 'absolute', inset: -6, borderRadius: isLarge ? 26 : 22,
                        border: `1.5px solid ${f.color}25`,
                        boxShadow: `0 0 20px ${f.color}20`,
                      }} />
                      {f.icon}
                    </motion.div>

                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: isLarge ? 17 : 15, fontWeight: 600, color: '#fff', margin: '0 0 8px', letterSpacing: 1 }}>{f.title}</h3>
                      <p style={{ fontSize: isLarge ? 14 : 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 400 }}>{f.desc}</p>
                      {/* Large cards get a subtle accent line */}
                      {isLarge && <div style={{ marginTop: 16, width: 40, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${f.color}80, transparent)` }} />}
                    </div>
                  </div>
                </GlowingCard>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ ALGORITHMS ═══════════════ */
function AlgorithmsSection() {
  const algoItems = algorithms.map((a) => ({
    quote: a.desc,
    name: a.name,
    title: a.full,
    icon: a.icon,
    color: a.color,
    speed: a.speed,
    strength: a.strength,
  }));

  return (
    <section id="algorithms" style={{ '--xh-surface': 'rgba(255,255,255,0.05)', '--xh-border': 'rgba(255,255,255,0.1)', '--xh-text': 'rgba(255,255,255,0.9)', '--xh-text-secondary': 'rgba(255,255,255,0.55)', '--xh-primary-soft': 'rgba(96,165,250,0.15)', position: 'relative', padding: 'clamp(60px, 8vw, 100px) 0', background: '#050510', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <BlurFade style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600, color: '#fff', margin: '0 0 12px', letterSpacing: 4 }}>
            <HyperText text="攻击算法" duration={1000} style={{ color: '#fff', fontFamily: 'inherit' }} />
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontWeight: 400, letterSpacing: 2, maxWidth: 480, margin: '0 auto', lineHeight: 1.8 }}>覆盖从快速验证到高精度评估的完整攻击谱系</p>
        </BlurFade>
      </div>

      {/* InfiniteMovingCards — horizontal scrolling carousel */}
      <InfiniteMovingCards
        items={algoItems}
        direction="left"
        speed="normal"
        pauseOnHover
      />

      {/* Algorithm detail cards below */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 0' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {algorithms.map((a, i) => (
            <BlurFade key={a.name} delay={i * 0.08} style={{ flex: '1 1 170px', maxWidth: 200, minWidth: 170 }}>
              <GlowingCard
                glowColor={`${a.color}25`}
                borderColor={`${a.color}35`}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                }}
              >
                <GlowingEffect spread={35} proximity={120} />
                <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                  {/* Icon with orbiting ring */}
                  <div style={{ position: 'relative', width: 52, height: 52, margin: '0 auto 14px' }}>
                    <motion.div
                      style={{ position: 'absolute', inset: -4, borderRadius: 18, border: `1.5px solid ${a.color}30` }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    />
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${a.color}28, ${a.color}10)`, border: `1px solid ${a.color}35`, display: 'grid', placeItems: 'center', fontSize: 22, position: 'relative', zIndex: 1 }}>{a.icon}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: a.color, letterSpacing: 2, marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>{a.full}</div>
                  {/* Speed & Strength tags */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: `${a.color}20`, border: `1px solid ${a.color}30`, fontSize: 10, color: a.color, letterSpacing: 0.5, fontWeight: 500 }}>{a.speed}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, fontWeight: 500 }}>{a.strength}</span>
                  </div>
                </div>
              </GlowingCard>
            </BlurFade>
          ))}
        </div>
      </div>

    </section>
  );
}

/* ═══════════════ ABOUT / CTA ═══════════════ */
function AboutSection() {
  const nav = useNavigate();

  return (
    <section id="about" style={{ position: 'relative', background: '#050510', overflow: 'hidden' }}>
      {/* Lamp effect */}
      <LampContainer bgColor="#050510">
        <motion.h2
          initial={{ opacity: 0.5, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: '#fff', margin: '0 0 16px', letterSpacing: 8, textAlign: 'center', lineHeight: 1.2 }}
        >
          开启
          <AnimatedGradientText colors={['#a78bfa', '#60a5fa', '#34d399']} speed={3} style={{ fontWeight: 700, marginLeft: 12, marginRight: 12 }}>AI 安全</AnimatedGradientText>
          研究之旅
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          viewport={{ once: true }}
          style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', fontWeight: 400, letterSpacing: 2, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.8, textAlign: 'center' }}
        >
          免费注册，即刻体验前沿对抗攻击可视化平台
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          viewport={{ once: true }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <ShimmerButton
            onClick={() => nav('/register')}
            borderRadius={999}
            shimmerColor="rgba(255,255,255,0.2)"
            shimmerSize="100px"
            style={{
              padding: '14px 56px',
              fontSize: 14, fontWeight: 500, letterSpacing: 4,
              background: 'linear-gradient(135deg, rgba(167,139,250,0.9), rgba(96,165,250,0.9))',
              boxShadow: '0 8px 32px rgba(96,165,250,0.3), 0 0 60px rgba(167,139,250,0.15)',
            }}
          >免费注册</ShimmerButton>

          <GlareHover glareColor="rgba(255,255,255,0.08)" glareSize={200} borderRadius={999} background="transparent" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            <motion.button onClick={() => nav('/login')} style={{ padding: '14px 48px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 500, letterSpacing: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.8)' }} whileHover={{ color: '#fff' }} whileTap={{ scale: 0.97 }}>登录</motion.button>
          </GlareHover>
        </motion.div>
      </LampContainer>

      {/* Footer */}
      <div style={{ padding: '40px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.45)', letterSpacing: 4 }}>星河智安</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 300, letterSpacing: 1, margin: 0 }}>&copy; {new Date().getFullYear()} XingHe ZhiAn &mdash; AI Adversarial Attack Visualization Platform</p>
      </div>
    </section>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#000', overflowX: 'hidden' }}>
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <AlgorithmsSection />
      <AboutSection />
    </div>
  );
}
