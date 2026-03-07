import React from 'react';
import { Button, Space, Typography, theme } from 'antd';

const { Text } = Typography;
const { useToken } = theme;

const AlgorithmSelector = ({ algorithms, selectedId, onSelect }) => {
  const { token } = useToken();
  
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {algorithms.map(algo => {
        const isSelected = selectedId === algo.id;
        return (
          <div
            key={algo.id}
            onClick={() => onSelect(algo.id)}
            style={{
              padding: '16px 20px',
              borderRadius: 16,
              border: `1px solid ${isSelected ? token.colorPrimary : 'rgba(255,255,255,0.08)'}`,
              background: isSelected ? `${token.colorPrimary}10` : 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: isSelected ? token.colorPrimary : token.colorText, fontSize: 15 }}>
                {algo.name}
              </Text>
              {isSelected && (
                <div style={{ width: 6, height: 6, background: token.colorPrimary, borderRadius: '50%' }} />
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {algo.description}
            </Text>
            
            {isSelected && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: 2,
                background: token.colorPrimary,
                opacity: 0.5
              }} />
            )}
          </div>
        );
      })}
    </Space>
  );
};

export default AlgorithmSelector;
