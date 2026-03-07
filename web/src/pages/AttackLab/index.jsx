import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import AlgorithmSelector from '../../components/business/AlgorithmSelector';
import CompareSlider from '../../components/business/CompareSlider';
import ConfidenceChart from '../../components/business/ConfidenceChart';
import ImageUploader from '../../components/business/ImageUploader';
import NeonSlider from '../../components/common/NeonSlider';
import { useAttack } from '../../hooks/useAttack';

// 算法参数配置
const algorithmParams = {
  FGSM: [
    { name: 'eps', label: '扰动强度', min: 0, max: 0.1, default: 0.03, desc: '控制噪声大小，值越大攻击效果越明显' },
    { name: 'targeted', label: '定向攻击', type: 'boolean', default: false }
  ],
  PGD: [
    { name: 'eps', label: '总扰动', min: 0, max: 0.1, default: 0.03, desc: '允许的最大扰动范围' },
    { name: 'alpha', label: '步长', min: 0.001, max: 0.03, default: 0.007 },
    { name: 'iterations', label: '迭代次数', min: 10, max: 100, default: 40, step: 1 }
  ]
  // ... 其他算法配置
};

const AttackLab = () => {
  // 业务逻辑
  const { executeAttack, result, loading, error, progress } = useAttack();

  // UI状态
  const [selectedAlgo, setSelectedAlgo] = useState('FGSM');
  const [params, setParams] = useState({});
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // 参数变更
  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen">
      {/* 顶部导航 - 玻璃效果 */}
      <nav className="glass sticky top-0 z-50 border-b border-space-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚡</span>
            </div>
            <h1 className="text-2xl font-bold">
              <span className="neon-text">XINGHE</span>
              <span className="text-gray-400 ml-2">Lab</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              攻击算法引擎 v1.0
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue p-[2px]">
              <div className="w-full h-full rounded-full bg-space-800 flex items-center justify-center">
                <span className="text-neon-cyan text-sm">AI</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">

          {/* 左侧配置区 */}
          <div className="col-span-4 space-y-6">
            <GlassCard title="攻击算法" glowColor="cyan">
              <AlgorithmSelector
                value={selectedAlgo}
                onChange={setSelectedAlgo}
              />
            </GlassCard>

            <GlassCard title="参数微调" glowColor="blue">
              <div className="space-y-6">
                {algorithmParams[selectedAlgo]?.map(param => (
                  param.type === 'boolean' ? (
                    <div key={param.name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{param.label}</span>
                      <button
                        onClick={() => handleParamChange(param.name, !params[param.name])}
                        className={`
                          w-12 h-6 rounded-full transition-all duration-300
                          ${params[param.name]
                            ? 'bg-neon-cyan shadow-neon-cyan-sm'
                            : 'bg-space-700'
                          }
                        `}
                      >
                        <div className={`
                          w-4 h-4 rounded-full bg-white transform transition-transform duration-300
                          ${params[param.name] ? 'translate-x-7' : 'translate-x-1'}
                        `} />
                      </button>
                    </div>
                  ) : (
                    <NeonSlider
                      key={param.name}
                      label={param.label}
                      value={params[param.name] ?? param.default}
                      onChange={(val) => handleParamChange(param.name, val)}
                      min={param.min}
                      max={param.max}
                      step={param.step || 0.001}
                      description={param.desc}
                    />
                  )
                ))}
              </div>
            </GlassCard>
          </div>

          {/* 右侧展示区 */}
          <div className="col-span-8 space-y-6">
            <GlassCard title="图片上传">
              <ImageUploader
                onImageSelect={(file, preview) => {
                  setImage(file);
                  setImagePreview(preview);
                }}
                previewUrl={imagePreview}
              />

              {/* 进度条 */}
              {progress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>攻击进度</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1 bg-space-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <GradientButton
                  onClick={() => executeAttack(image, selectedAlgo, params)}
                  loading={loading}
                  disabled={!image}
                  variant="primary"
                >
                  {loading ? '执行攻击中...' : '⚡ 启动对抗攻击'}
                </GradientButton>
              </div>
            </GlassCard>

            {/* 攻击结果展示 */}
            {result && (
              <>
                <GlassCard title="攻击效果对比">
                  <CompareSlider
                    originalImage={result.originalImage}
                    adversarialImage={result.adversarialImage}
                    heatmapImage={result.heatmapImage}
                    labels={{
                      original: `${result.originalLabel} ${(result.originalConfidence * 100).toFixed(1)}%`,
                      adversarial: `${result.adversarialLabel} ${(result.adversarialConfidence * 100).toFixed(1)}%`
                    }}
                  />
                </GlassCard>

                <GlassCard title="置信度分析">
                  <ConfidenceChart
                    originalTop5={result.originalTop5}
                    adversarialTop5={result.adversarialTop5}
                  />
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AttackLab;