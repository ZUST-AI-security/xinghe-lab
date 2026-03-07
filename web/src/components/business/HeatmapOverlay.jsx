import React, { useState } from 'react';

const HeatmapOverlay = ({ baseImage, heatmapImage, title = 'Attention Map' }) => {
  const [opacity, setOpacity] = useState(0.6);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs text-gray-400 uppercase tracking-widest font-bold">{title}</h4>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-gray-500">Opacity: {Math.round(opacity * 100)}%</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={opacity} 
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>

      <div className="relative aspect-square glass rounded-2xl overflow-hidden group">
        <img src={baseImage} className="absolute inset-0 w-full h-full object-cover" alt="Base" />
        <img 
          src={heatmapImage} 
          className="absolute inset-0 w-full h-full object-cover mix-blend-jet transition-opacity duration-300" 
          style={{ opacity }}
          alt="Heatmap" 
        />
        
        {/* 悬停放大镜预览 */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-cyan-500/30 transition-colors pointer-events-none" />
      </div>
    </div>
  );
};

export default HeatmapOverlay;
