import React from 'react';
import Tooltip from './Tooltip';
import { InfoCircleOutlined } from '@ant-design/icons';

/**
 * 科技感滑块组件 - 带发光效果和工具提示
 */
const NeonSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.001,
  description = '',
  logarithmic = false
}) => {
  // 对数尺度转换
  const toLog = (val) => Math.log10(val);
  const fromLog = (val) => Math.pow(10, val);

  const sliderValue = logarithmic ? toLog(value) : value;
  const sliderMin = logarithmic ? toLog(min) : min;
  const sliderMax = logarithmic ? toLog(max) : max;

  const handleChange = (e) => {
    let val = parseFloat(e.target.value);
    if (logarithmic) {
      val = fromLog(val);
    }
    onChange(val);
  };

  // 计算填充百分比
  const percentage = ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{label}</span>
          {description && (
            <Tooltip content={description}>
              <InfoCircleOutlined className="text-gray-500 hover:text-neon-cyan transition-colors cursor-help" />
            </Tooltip>
          )}
        </div>
        <span className="text-sm font-mono text-neon-cyan bg-space-700 px-2 py-1 rounded-lg border border-space-600">
          {value.toFixed(logarithmic ? 4 : 3)}
        </span>
      </div>

      <div className="relative py-2">
        {/* 滑轨背景 */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-space-700 rounded-full -translate-y-1/2">
          {/* 已填充部分 - 霓虹渐变 */}
          <div
            className="absolute h-full bg-gradient-to-r from-neon-cyan to-neon-blue rounded-full transition-all duration-100"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* 滑块 */}
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={logarithmic ? (sliderMax - sliderMin) / 1000 : step}
          value={sliderValue}
          onChange={handleChange}
          className="
            absolute top-1/2 left-0 w-full -translate-y-1/2
            appearance-none bg-transparent
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:relative
            [&::-webkit-slider-thumb]:z-20
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-neon-cyan/50
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-neon-cyan
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-neon-cyan
          "
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default NeonSlider;