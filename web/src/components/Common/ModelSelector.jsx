/**
 * 星河智安 (XingHe ZhiAn) - 模型选择器组件
 * 动态从后端获取可用模型列表的下拉选择组件
 */

import React, { useState, useEffect } from 'react';
import { Select, Space, Tag, Tooltip } from 'antd';
import { DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { getAvailableModels } from '../../api/models';
import { useModelStore } from '../../store/modelStore';

const { Option } = Select;

const ModelSelector = ({ 
  value, 
  onChange, 
  showOnly = [], 
  modelType = null,
  placeholder = "请选择模型",
  disabled = false,
  showInfo = true,
}) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const { fetchModels } = useModelStore();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await fetchModels();
      
      // 过滤模型
      let filteredModels = data;
      
      // 按类型过滤
      if (modelType) {
        filteredModels = filteredModels.filter(m => m.type === modelType);
      }
      
      // 按指定名称过滤
      if (showOnly.length > 0) {
        filteredModels = filteredModels.filter(m => showOnly.includes(m.name));
      }
      
      setModels(filteredModels);
      
      // 如果没有选中的模型且列表不为空，默认选择第一个
      if (!value && filteredModels.length > 0) {
        const defaultModel = filteredModels.find(m => m.name === 'resnet100_imagenet') || filteredModels[0];
        onChange?.(defaultModel.name);
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取模型类型标签
  const getModelTypeTag = (type) => {
    const colors = {
      'classification': 'blue',
      'detection': 'green',
    };
    const labels = {
      'classification': '分类',
      'detection': '检测',
    };
    
    return (
      <Tag color={colors[type] || 'default'}>
        {labels[type] || type}
      </Tag>
    );
  };

  // 获取模型信息
  const getModelInfo = (model) => {
    const info = [];
    
    if (model.input_shape) {
      info.push(`输入: ${model.input_shape.join('×')}`);
    }
    
    if (model.num_classes) {
      info.push(`类别: ${model.num_classes}`);
    }
    
    if (model.parameters) {
      info.push(`参数: ${(model.parameters / 1000000).toFixed(1)}M`);
    }
    
    return info.join(' | ');
  };

  return (
    <div className="model-selector">
      <Select
        value={value}
        onChange={onChange}
        loading={loading}
        placeholder={placeholder}
        style={{ width: '100%' }}
        disabled={disabled}
        size="large"
        showSearch
        filterOption={(input, option) =>
          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }
      >
        {models.map(model => (
          <Option key={model.name} value={model.name}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <DatabaseOutlined />
                <span style={{ fontWeight: 500 }}>
                  {model.display_name || model.name}
                </span>
                {getModelTypeTag(model.type)}
              </Space>
              
              {showInfo && (
                <Tooltip title={getModelInfo(model)}>
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              )}
            </div>
            
            {/* 模型详细信息 */}
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
              {getModelInfo(model)}
            </div>
            
            {/* 模型描述 */}
            {model.description && (
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                {model.description}
              </div>
            )}
          </Option>
        ))}
      </Select>
      
      {/* 当前选中模型的信息 */}
      {value && showInfo && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
          {(() => {
            const selectedModel = models.find(m => m.name === value);
            if (selectedModel) {
              return getModelInfo(selectedModel);
            }
            return '';
          })()}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
