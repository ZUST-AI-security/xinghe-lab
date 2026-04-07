import React, { useState, useRef } from 'react';
import { Typography, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 图像对比滑块组件 - 用于直观展示攻击前后的细微差别
 * @param {string} original - 原图 URL
 * @param {string} adversarial - 对抗样本 URL
 * @param {string} title - 标题
 */
const ImageCompare = ({ original, adversarial, title = "扰动细节对比 (左右滑动)" }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const newPos = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, newPos)));
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full mb-8">
      <div className="flex justify-between items-center px-2">
        <Space>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          <Text strong style={{ color: '#00f3ff', textShadow: '0 0 10px rgba(0,243,255,0.4)' }}>{title}</Text>
        </Space>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          <SwapOutlined /> 当前偏移: {sliderPos.toFixed(0)}%
        </Text>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-square bg-[#0a0a0f] rounded-xl overflow-hidden cursor-ew-resize border border-[#1f2937] shadow-2xl group select-none"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        style={{ height: 'min-content' }}
      >
        {/* 底层：原图 */}
        <div className="absolute inset-0 w-full h-full p-4 flex items-center justify-center">
            <img 
            src={original} 
            alt="Original" 
            className="max-w-full max-h-full object-contain pointer-events-none"
            />
        </div>

        {/* 顶层：对抗样本 (通过 clip-path 实现擦除效果) */}
        <div 
          className="absolute inset-0 w-full h-full z-10 p-4 flex items-center justify-center bg-[#0a0a0f]"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img 
            src={adversarial} 
            alt="Adversarial" 
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        {/* 分隔线 */}
        <div 
          className="absolute inset-y-0 z-20 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-[2px] h-full bg-[#00f3ff] shadow-[0_0_15px_#00f3ff]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0a0a0f] border-2 border-[#00f3ff] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <SwapOutlined style={{ color: '#00f3ff', fontSize: '12px' }} />
          </div>
        </div>

        {/* 标签提示 */}
        <div className="absolute bottom-4 left-4 z-30 px-3 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Text style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>ORIGINAL</Text>
        </div>
        <div className="absolute bottom-4 right-4 z-30 px-3 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Text style={{ fontSize: '10px', color: '#00f3ff' }}>ADVERSARIAL</Text>
        </div>
      </div>
    </div>
  );
};

export default ImageCompare;
