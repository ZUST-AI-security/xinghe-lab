/**
 * 星河智安 (XingHe ZhiAn) - 热力图组件
 * 显示扰动热力图的可视化组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { Image, Button, Space, Slider, Tooltip } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  DownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const Heatmap = ({ 
  image, 
  title = '扰动热力图', 
  description = '红色区域表示修改较大的像素',
  width = '100%',
  height = 400,
  showControls = true,
  colormap = 'hot',
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const containerRef = useRef(null);

  // 重置视图
  const handleReset = () => {
    setZoom(1);
    setOpacity(0.8);
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

  // 下载热力图
  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image;
      link.download = `heatmap_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
    opacity: opacity,
  };

  return (
    <div className="heatmap-visualization">
      {/* 标题和描述 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {title}
            </h3>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: '#8c8c8c' 
            }}>
              {description}
            </p>
          </div>
          
          <Tooltip title="热力图显示像素级别的扰动强度，红色表示扰动较大的区域">
            <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />
          </Tooltip>
        </div>
      </div>

      {/* 控制按钮 */}
      {showControls && (
        <div style={{ 
          marginBottom: '12px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Space>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              缩放: {(zoom * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              透明度: {(opacity * 100).toFixed(0)}%
            </span>
          </Space>
          
          <Space>
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
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
              disabled={!image}
              title="下载热力图"
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

      {/* 热力图容器 */}
      <div ref={containerRef} style={containerStyle}>
        {image ? (
          <Image
            src={image}
            alt="热力图"
            style={imageStyle}
            preview={false}
            draggable={false}
          />
        ) : (
          <div className="flex-center" style={{ height: '100%', color: '#8c8c8c' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌡️</div>
              <div>暂无热力图数据</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                请先运行攻击算法生成热力图
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 透明度控制 */}
      {showControls && image && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              透明度调节
            </span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {(opacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={opacity}
            onChange={setOpacity}
            style={{ margin: 0 }}
          />
        </div>
      )}

      {/* 色彩说明 */}
      {showControls && image && (
        <div style={{ 
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#52c41a',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            色彩说明
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '60px', 
              height: '12px', 
              background: 'linear-gradient(to right, blue, cyan, green, yellow, red)',
              borderRadius: '2px',
            }} />
            <span>低扰动 → 高扰动</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
