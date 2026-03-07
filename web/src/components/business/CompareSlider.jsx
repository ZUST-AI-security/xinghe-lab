import React, { useState } from 'react';

const CompareSlider = ({ leftImage, rightImage, labelLeft = 'Original', labelRight = 'Adversarial' }) => {
  const [position, setPosition] = useState(50);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, x)));
  };

  return (
    <div 
      className="relative aspect-video glass rounded-2xl overflow-hidden cursor-ew-resize group"
      onMouseMove={handleMove}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMove({
          clientX: touch.clientX,
          currentTarget: e.currentTarget
        });
      }}
    >
      {/* 右侧图 (底图) */}
      <img src={rightImage} className="absolute inset-0 w-full h-full object-cover" alt="Adversarial" />
      <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded border border-red-500/30">
        {labelRight}
      </div>

      {/* 左侧图 (上层遮罩) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${position}%` }}
      >
        <img src={leftImage} className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / position}%` }} alt="Original" />
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded border border-green-500/30">
          {labelLeft}
        </div>
      </div>

      {/* 滑动条指示器 */}
      <div 
        className="absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center">
          <span className="text-gray-900 font-bold select-none text-xs">鈦</span>
        </div>
      </div>
    </div>
  );
};

export default CompareSlider;
