import React, { useState, useRef, useEffect } from 'react';
import { Image, Button, Slider, Space } from 'antd';
import {
  ZoomInOutlined, ZoomOutOutlined, ReloadOutlined,
  ExpandOutlined, CompressOutlined, DownloadOutlined,
} from '@ant-design/icons';

const Heatmap = ({
  image, title = '扰动热力图', description = '红色区域表示修改较大的像素',
  width = '100%', height = 360, showControls = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const containerRef = useRef(null);

  const handleReset = () => { setZoom(1); setOpacity(0.8); };
  const handleZoomIn = () => setZoom((p) => Math.min(p + 0.1, 3));
  const handleZoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.5));

  const handleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `heatmap_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div>
      {/* Controls */}
      {showControls && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', fontWeight: 600 }}>
              缩放 {(zoom * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', fontWeight: 600 }}>
              透明度 {(opacity * 100).toFixed(0)}%
            </span>
          </div>
          <Space size={4}>
            {[{ icon: <ZoomOutOutlined />, onClick: handleZoomOut, disabled: zoom <= 0.5 },
              { icon: <ZoomInOutlined />, onClick: handleZoomIn, disabled: zoom >= 3 },
              { icon: <ReloadOutlined />, onClick: handleReset },
              { icon: <DownloadOutlined />, onClick: handleDownload, disabled: !image },
              { icon: isFullscreen ? <CompressOutlined /> : <ExpandOutlined />, onClick: handleFullscreen },
            ].map((btn, i) => (
              <Button key={i} size="small" icon={btn.icon} onClick={btn.onClick} disabled={btn.disabled}
                style={{ borderRadius: 7, width: 28, height: 28 }} />
            ))}
          </Space>
        </div>
      )}

      {/* Heatmap container */}
      <div
        ref={containerRef}
        style={{
          width: isFullscreen ? '100vw' : width,
          height: isFullscreen ? '100vh' : height,
          position: 'relative', overflow: 'hidden',
          borderRadius: 12, border: '1px solid var(--xh-border)',
          background: 'var(--xh-bg)',
        }}
      >
        {image ? (
          <Image
            src={image} alt="热力图" preview={false} draggable={false}
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              transform: `scale(${zoom})`, transformOrigin: 'center',
              transition: 'transform 0.3s ease', opacity,
            }}
          />
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--xh-text-tertiary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>🌡️</div>
              <div style={{ fontSize: 13 }}>暂无热力图数据</div>
            </div>
          </div>
        )}
      </div>

      {/* Opacity slider */}
      {showControls && image && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)' }}>透明度</span>
            <span style={{ fontSize: 11, color: 'var(--xh-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{(opacity * 100).toFixed(0)}%</span>
          </div>
          <Slider min={0} max={1} step={0.05} value={opacity} onChange={setOpacity} style={{ margin: 0 }} />
        </div>
      )}

      {/* Color legend */}
      {showControls && image && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: 'var(--xh-bg)', border: '1px solid var(--xh-border)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 11,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--xh-text-secondary)' }}>色彩说明</span>
          <div style={{ width: 60, height: 10, borderRadius: 2, background: 'linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #ef4444)' }} />
          <span style={{ color: 'var(--xh-text-tertiary)' }}>低扰动 → 高扰动</span>
        </div>
      )}
    </div>
  );
};

export default Heatmap;
