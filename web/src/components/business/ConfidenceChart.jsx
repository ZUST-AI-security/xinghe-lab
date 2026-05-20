import React from 'react';

const ConfidenceChart = ({ data }) => {
  if (!data || !data.labels) return null;

  return (
    <div className="space-y-4">
      {data.labels.map((label, idx) => {
        const originalVal = data.original[idx] * 100;
        const adversarialVal = data.adversarial[idx] * 100;
        
        return (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase tracking-wider">
              <span className="text-gray-400 font-bold">{label}</span>
              <div className="flex gap-4">
                <span className="text-green-400">ORIG: {originalVal.toFixed(1)}%</span>
                <span className="text-red-400">ADV: {adversarialVal.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500/50 transition-all duration-1000 ease-out"
                style={{ width: `${originalVal}%` }}
              />
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-red-500/50 transition-all duration-1000 ease-out"
                style={{ width: `${adversarialVal}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConfidenceChart;
