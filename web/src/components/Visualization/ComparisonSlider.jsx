/**
 * 星河智安 (XingHe ZhiAn) - 图片对比滑块组件
 * 左右对比滑块，用于对比原始图片和对抗样本
 */

import React, { useState, useRef, useEffect } from 'react';
import { Slider, Button, Space } from 'antd';
import { 
  SwapOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  ExpandOutlined,
  CompressOutlined 
} from '@ant-design/icons';

const ComparisonSlider = ({ 
  leftImage, 
  rightImage, 
  leftLabel = '原始图片', 
  rightLabel = '对抗样本',
  width = '100%',
  height = 400,
  showControls = true,
}) => {
  const [position, setPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);

  // 重置滑块位置
  const handleReset = () => {
    setPosition(50);
    setZoom(1);
  };

  // 交换图片
  const handleSwap = () => {
    // 这里需要父组件支持图片交换
    console.log('Swap images');
  };

  // 放大
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  // 缩小
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  // 全屏切换
  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const containerStyle = {
    width: isFullscreen ? '100vw' : width,
    height: isFullscreen ? '100vh' : height,
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: `scale(${zoom})`,
    transformOrigin: 'center',
    transition: 'transform 0.3s ease',
  };

  const sliderStyle = {
    position: 'absolute',
    top: 0,
    left: `${position}%`,
    width: '2px',
    height: '100%',
    backgroundColor: '#fff',
    cursor: 'ew-resize',
    zIndex: 10,
    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
  };

  const leftImageStyle = {
    ...imageStyle,
    clipPath: `inset(0 ${100 - position}% 0 0)`,
  };

  const rightImageStyle = {
    ...imageStyle,
    clipPath: `inset(0 0 0 ${position}%)`,
  };

  return (
    <div className="comparison-slider">
      {/* 控制按钮 */}
      {showControls && (
        <div style={{ 
          marginBottom: '12px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Space>
            <span style={{ fontWeight: 500, color: '#262626' }}>
              图片对比
            </span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              缩放: {(zoom * 100).toFixed(0)}%
            </span>
          </Space>
          
          <Space>
            <Button 
              size="small" 
              icon={<SwapOutlined />} 
              onClick={handleSwap}
              title="交换图片"
            />
            <Button 
              size="small" 
              icon={<ZoomOutOutlined />} 
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="缩小"
            />
            <Button 
              size="small" 
              icon={<ZoomInOutlined />} 
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="放大"
            />
            <Button 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
              title="重置"
            />
            <Button 
              size="small" 
              icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} 
              onClick={handleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏'}
            />
          </Space>
        </div>
      )}

      {/* 对比容器 */}
      <div ref={containerRef} style={containerStyle}>
        {/* 左侧图片 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <img 
            src={leftImage} 
            alt={leftLabel}
            style={leftImageStyle}
            draggable={false}
          />
        </div>

        {/* 右侧图片 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <img 
            src={rightImage} 
            alt={rightLabel}
            style={rightImageStyle}
            draggable={false}
          />
        </div>

        {/* 滑块 */}
        <div 
          ref={sliderRef}
          style={sliderStyle}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startPos = position;

            const handleMouseMove = (moveEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const containerWidth = containerRef.current.offsetWidth;
              const newPosition = Math.max(0, Math.min(100, startPos + (deltaX / containerWidth) * 100));
              setPosition(newPosition);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          {/* 滑块把手 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            backgroundColor: '#1890ff',
            borderRadius: '50%',
            border: '2px solid #fff',
            cursor: 'ew-resize',
          }} />
        </div>

        {/* 标签 */}
        <div style={{ 
          position: 'absolute', 
          top: '12px', 
          left: '12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {leftLabel}
        </div>

        <div style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {rightLabel}
        </div>
      </div>

      {/* 滑块控制器 */}
      <div style={{ marginTop: '12px' }}>
        <Slider
          min={0}
          max={100}
          value={position}
          onChange={setPosition}
          tooltip={{
            formatter: (value) => `${value}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ComparisonSlider;
