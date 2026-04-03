/**
 * 星河智安 (XingHe ZhiAn) - PGD攻击页面
 * PGD攻击算法的可视化交互页面
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, message, Space, Alert, Spin, Tabs, Tag, Tooltip, Collapse } from 'antd';
import { 
  PlayCircleOutlined, 
  SaveOutlined, 
  ThunderboltOutlined,
  SettingOutlined,
  HistoryOutlined,
  ClearOutlined,
  RocketOutlined,
  UpOutlined,
  DownOutlined
} from '@ant-design/icons';

import ImageUploader from './PGDAttack/components/ImageUploader';
import ParameterSlider from './PGDAttack/components/ParameterSlider';
import ResultDisplay from './PGDAttack/components/ResultDisplay';
import usePGDAttack from './PGDAttack/hooks/usePGDAttack';
import usePGDAttackStore from '../../store/pgdAttackStore';
import { getAlgorithmParams } from '../../api/attacks/pgd';

const { TabPane } = Tabs;
const { Panel } = Collapse;

const PGDAttack = () => {
  // 状态管理
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [params, setParams] = useState({});
  const [paramSchema, setParamSchema] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [activeTab, setActiveTab] = useState('attack');
  const [paramsPanelCollapsed, setParamsPanelCollapsed] = useState(false);
  
  // Store状态
  const { 
    templates, 
    currentTemplateId,
    setCurrentTemplate,
    getCurrentTemplateParams,
    addHistory,
    settings 
  } = usePGDAttackStore();
  
  // 自定义Hook：攻击逻辑
  const {
    loading,
    result,
    error,
    currentTask,
    runAttack,
    saveResult,
    clearResult,
    cancelTask
  } = usePGDAttack();

  // 加载参数配置
  useEffect(() => {
    const loadParams = async () => {
      setLoadingSchema(true);
      try {
        const schema = await getAlgorithmParams();
        setParamSchema(schema);
        
        // 设置默认参数（从store获取或使用schema默认值）
        const storedParams = getCurrentTemplateParams();
        if (storedParams && Object.keys(storedParams).length > 0) {
          setParams(storedParams);
        } else {
          const defaultParams = {};
          Object.keys(schema).forEach(key => {
            defaultParams[key] = schema[key].default;
          });
          setParams(defaultParams);
        }
      } catch (err) {
        console.error('加载参数配置失败:', err);
        message.error('加载参数配置失败');
      } finally {
        setLoadingSchema(false);
      }
    };
    loadParams();
  }, [getCurrentTemplateParams]);

  // 处理参数变化
  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 应用模板
  const handleApplyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setParams(template.params);
      setCurrentTemplate(templateId);
      message.success(`已应用模板: ${template.name}`);
    }
  };

  // 运行攻击
  const handleRunAttack = async () => {
    if (!selectedImageBase64) {
      message.warning('请先上传图片');
      return;
    }

    // 准备请求参数
    const requestData = {
      image: selectedImageBase64,
      model_name: 'resnet100_imagenet',
      params: params
    };

    try {
      if (settings.defaultMode === 'async') {
        await runAttack(requestData);
      } else {
        await runAttack(requestData);
      }
      
      // 保存到历史记录
      if (result) {
        addHistory({
          success: result.success,
          time_elapsed: result.time_elapsed,
          l2_norm: result.metadata?.avg_l2_norm,
          linf_norm: result.metadata?.avg_linf_norm,
          params: params,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('攻击失败:', err);
    }
  };

  // 保存结果
  const handleSaveResult = async () => {
    if (!result) {
      message.warning('没有可保存的结果');
      return;
    }

    await saveResult();
  };

  // 清空结果
  const handleClearResult = () => {
    clearResult();
    message.info('已清空结果');
  };

  // 渲染参数面板摘要（折叠状态显示）
  const renderParameterSummary = () => {
    const keyParams = {
      epsilon: params.epsilon || 0.03,
      alpha: params.alpha || 0.01,
      iterations: params.iterations || 40,
      norm: params.norm || 'Linf'
    };

    return (
      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
        <Space wrap>
          <Tag color="blue">ε: {keyParams.epsilon}</Tag>
          <Tag color="green">α: {keyParams.alpha}</Tag>
          <Tag color="orange">迭代: {keyParams.iterations}</Tag>
          <Tag color="purple">{keyParams.norm}</Tag>
        </Space>
      </div>
    );
  };
  const renderParameterPanel = () => {
    if (loadingSchema) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin tip="加载参数配置..." />
        </div>
      );
    }

    return (
      <div className="params-panel">
        {/* 模板选择 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            快速模板
          </div>
          <Space wrap>
            {templates.map(template => (
              <Tooltip key={template.id} title={template.description}>
                <Tag
                  color={currentTemplateId === template.id ? '#1890ff' : 'default'}
                  style={{ 
                    cursor: 'pointer', 
                    fontSize: 14, 
                    padding: '4px 12px',
                    marginBottom: 8
                  }}
                  onClick={() => handleApplyTemplate(template.id)}
                >
                  {template.icon} {template.name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </div>

        {/* 参数调节 */}
        {Object.entries(paramSchema).map(([key, config]) => {
          // 根据norm类型显示不同的参数
          if (key === 'norm') {
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                  {config.label}
                </div>
                <Space>
                  {config.options.map(option => (
                    <Tag
                      key={option.value}
                      color={params[key] === option.value ? '#1890ff' : 'default'}
                      style={{ cursor: 'pointer', padding: '4px 16px' }}
                      onClick={() => handleParamChange(key, option.value)}
                    >
                      {option.label}
                    </Tag>
                  ))}
                </Space>
              </div>
            );
          }
          
          if (key === 'loss_type') {
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                  {config.label}
                </div>
                <Space>
                  {config.options.map(option => (
                    <Tag
                      key={option.value}
                      color={params[key] === option.value ? '#1890ff' : 'default'}
                      style={{ cursor: 'pointer', padding: '4px 16px' }}
                      onClick={() => handleParamChange(key, option.value)}
                    >
                      {option.label}
                    </Tag>
                  ))}
                </Space>
              </div>
            );
          }
          
          if (config.type === 'switch') {
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={params[key] || config.default}
                    onChange={(e) => handleParamChange(key, e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  <span>
                    {config.label}
                    {config.description && (
                      <Tooltip title={config.description}>
                        <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>ⓘ</span>
                      </Tooltip>
                    )}
                  </span>
                </label>
              </div>
            );
          }
          
          return (
            <ParameterSlider
              key={key}
              label={config.label}
              description={config.description}
              value={params[key] || config.default}
              onChange={(value) => handleParamChange(key, value)}
              min={config.min}
              max={config.max}
              step={config.step}
              unit={config.unit || ''}
              disabled={loading}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          <ThunderboltOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          PGD 攻击算法演示
        </h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          Projected Gradient Descent (PGD) 是一种强大的基于梯度的迭代对抗攻击方法，
          被认为是评估模型鲁棒性的标准攻击之一。通过调节下方参数，观察攻击效果的变化。
        </p>
      </div>

      <style>{`
        .pgd-params-collapse .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-header {
          padding: 12px 20px !important;
          background: white !important;
          border-radius: 8px !important;
          margin-bottom: 0 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
        }
        .pgd-params-collapse .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content {
          background: white !important;
          border-radius: 0 0 8px 8px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
          border-top: none !important;
        }
        .pgd-params-collapse .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
          padding: 20px !important;
        }
        .pgd-params-collapse .ant-collapse-ghost > .ant-collapse-item:last-child > .ant-collapse-header {
          border-radius: 8px !important;
        }
      `}</style>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><RocketOutlined />攻击</span>} key="attack">
          <Row gutter={[16, 16]}>
            {/* 左侧：图片上传 */}
            <Col xs={24} lg={10}>
              <Card title="1. 上传图片" bordered={false}>
                <ImageUploader
                  onImageChange={(file, base64) => {
                    setSelectedImageBase64(base64);
                  }}
                  disabled={loading}
                />
              </Card>
            </Col>

            {/* 右侧：参数调节 */}
            <Col xs={24} lg={14}>
              <div className="pgd-params-collapse">
                <Collapse 
                  ghost
                  activeKey={paramsPanelCollapsed ? [] : ['params']}
                  onChange={(keys) => setParamsPanelCollapsed(keys.length === 0)}
                >
                  <Panel 
                    header={
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>
                            <SettingOutlined style={{ marginRight: 8 }} />
                            2. 调节参数
                          </span>
                          <Button 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setParams(getCurrentTemplateParams());
                            }}
                            disabled={loading}
                          >
                            重置
                          </Button>
                        </div>
                        {paramsPanelCollapsed && renderParameterSummary()}
                      </div>
                    } 
                    key="params"
                    extra={
                      <span style={{ fontSize: 12, color: '#666' }}>
                        {paramsPanelCollapsed ? <DownOutlined /> : <UpOutlined />}
                      </span>
                    }
                  >
                    {renderParameterPanel()}
                  </Panel>
                </Collapse>
              </div>
            </Col>
          </Row>

          {/* 运行按钮区域 */}
          <Card style={{ marginTop: 16 }} bordered={false}>
            <Space size="large">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                size="large"
                loading={loading}
                onClick={handleRunAttack}
                disabled={!selectedImageBase64 || loadingSchema}
                style={{
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  border: 'none',
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32
                }}
              >
                {loading ? '攻击中...' : '运行 PGD 攻击'}
              </Button>
              
              {result && (
                <>
                  <Button
                    icon={<SaveOutlined />}
                    size="large"
                    onClick={handleSaveResult}
                  >
                    保存结果
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    size="large"
                    onClick={handleClearResult}
                  >
                    清空结果
                  </Button>
                </>
              )}
              
              {currentTask && (
                <Button
                  danger
                  size="large"
                  onClick={cancelTask}
                >
                  取消任务
                </Button>
              )}
            </Space>

            {/* 任务进度 */}
            {currentTask && currentTask.progress > 0 && (
              <div style={{ marginTop: 16 }}>
                <Spin size="small" />
                <span style={{ marginLeft: 8 }}>
                  任务进度: {currentTask.progress}%
                </span>
              </div>
            )}
          </Card>

          {/* 错误提示 */}
          {error && (
            <Card style={{ marginTop: 16 }} bordered={false}>
              <Alert
                message="攻击失败"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => clearResult()}
              />
            </Card>
          )}

          {/* 结果展示 */}
          {result && (
            <Card style={{ marginTop: 16 }} bordered={false}>
              <ResultDisplay
                result={result}
                originalImage={selectedImageBase64}
                onSave={handleSaveResult}
                loading={loading}
              />
            </Card>
          )}
        </TabPane>

        <TabPane tab={<span><HistoryOutlined />参数说明</span>} key="help">
          <Card bordered={false}>
            <h3>PGD 攻击参数说明</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>参数</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>推荐值</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>ε (epsilon)</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>最大扰动幅度，控制对抗样本与原始图像的最大差异。值越大攻击越强，但扰动越明显。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>0.03 (L∞), 0.5 (L2)</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>α (alpha)</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>步长，每次迭代的更新幅度。太大会导致收敛不稳定，太小会收敛慢。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>0.01 (L∞), 0.05 (L2)</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>迭代次数</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>PGD迭代次数，次数越多攻击效果越好，但耗时增加。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>40-100</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>扰动范数</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>L∞约束最大像素值变化，L2约束总体欧氏距离。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>L∞ (常用)</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>损失函数</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>CE是交叉熵损失，DLR是差分逻辑回归损失（攻击性更强）。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>CE (快速), DLR (强力)</td>
                </tr>
                <tr>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}><strong>随机初始化</strong></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>是否在epsilon球内随机初始化，可以提高攻击迁移性。</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>True (推荐)</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 24, padding: 16, background: '#f6f8fa', borderRadius: 8 }}>
              <h4>💡 使用技巧</h4>
              <ul>
                <li>快速测试：使用"快速测试"模板，epsilon=0.03，迭代10次</li>
                <li>高成功率：使用"激进攻击"模板，增加epsilon和迭代次数</li>
                <li>隐蔽攻击：使用"隐蔽攻击"模板，epsilon=0.008，扰动更小</li>
                <li>L2攻击：使用L2范数可以产生更平滑的扰动</li>
                <li>DLR损失：当CE攻击效果不佳时，可以尝试DLR损失</li>
              </ul>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PGDAttack;