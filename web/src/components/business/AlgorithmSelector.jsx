import React from 'react';

const AlgorithmSelector = ({ algorithms, selectedId, onSelect }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {algorithms.map(algo => (
        <button
          key={algo.id}
          onClick={() => onSelect(algo.id)}
          className={`p-4 rounded-xl border transition-all text-left ${
            selectedId === algo.id 
            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-neon-cyan-sm' 
            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            {algo.name}
            {selectedId === algo.id && <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />}
          </div>
          <div className="text-xs mt-1 opacity-60 line-clamp-1">{algo.description}</div>
        </button>
      ))}
    </div>
  );
};

export default AlgorithmSelector;
