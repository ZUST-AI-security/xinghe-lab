import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layout, 
  Typography, 
  Row, 
  Col, 
  Card, 
  Button, 
  Slider, 
  Select, 
  Upload, 
  Progress, 
  Space, 
  Divider, 
  Spin, 
  Alert,
  Image,
  Tag,
  List,
  Breadcrumb
} from 'antd';
import { 
  ExperimentOutlined, 
  ThunderboltOutlined, 
  UploadOutlined, 
  HomeOutlined,
  DashboardOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useAttack } from '../../hooks/useAttack';
import { algorithmService, datasetService } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const API_BASE_URL = 'http://localhost:8000';

const AttackLab = () => {
  const [searchParams] = useSearchParams();
  const { executeAttack, result, loading, progress } = useAttack();

  const [algorithms, setAlgorithms] = useState([]);
  const [selectedAlgoId, setSelectedAlgoId] = useState('');
  const [params, setParams] = useState({});
  const [fetchError, setFetchError] = useState(null);
  
  const [cifarSamples, setCifarSamples] = useState([]);
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // 初始化拉取算法
  useEffect(() => {
    setInitialLoading(true);
    setFetchError(null);
    algorithmService.getAlgorithms()
      .then(res => {
        const algos = res.data || [];
        setAlgorithms(algos);
        
        const algoIdFromUrl = searchParams.get('algoId');
        if (algoIdFromUrl && algos.some(a => a.id === algoIdFromUrl)) {
          setSelectedAlgoId(algoIdFromUrl);
        } else if (algos.length > 0) {
          setSelectedAlgoId(algos[0].id);
        }
      })
      .catch(err => {
        console.error('Failed to fetch algorithms:', err);
        setFetchError('无法连接到后端服务器，请检查后端是否启动。');
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [searchParams]);

  // 计算当前选中的算法对象
  const selectedAlgo = algorithms.find(a => a.id === selectedAlgoId);

  // 初始化参数
  useEffect(() => {
    if (selectedAlgo) {
      const initialParams = {};
      (selectedAlgo.inputs || []).forEach(input => {
        if (input.default !== undefined) {
          initialParams[input.name] = input.default;
        }
      });
      setParams(initialParams);
      setSelectedSamples([]);
    }
  }, [selectedAlgo]);

  // 拉取示例数据集 (CIFAR-10)
  useEffect(() => {
    if (selectedAlgoId === 'resnet18_cifar10') {
      datasetService.getCifar10Samples(12)
        .then(res => setCifarSamples(res.data || []))
        .catch(err => console.error('Failed to fetch samples:', err));
    }
  }, [selectedAlgoId]);

  // 处理参数变化
  const handleParamChange = (name, value) => {
    setParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 切换样本选择 (支持多选)
  const toggleSample = (sample) => {
    setSelectedSamples(prev => {
      const isSelected = prev.some(s => s.id === sample.id);
      if (isSelected) {
        return prev.filter(s => s.id !== sample.id);
      } else {
        // 多选逻辑
        return [...prev, sample];
      }
    });
  };

  // 运行实验
  const onRun = () => {
    // eslint-disable-next-line no-unused-vars
    const { image_file, image_preview, ...otherParams } = params;
    
    // 如果是数据集选择模式，注入选中的样本ID列表
    if (selectedSamples.length > 0) {
      // 如果后端支持多图批量处理，则传递数组；如果仅支持单图，取第一个或提示用户
      otherParams.sample_ids = selectedSamples.map(s => s.id);
      // 为了兼容旧的单图接口
      otherParams.sample_id = selectedSamples[0].id;
    }
    
    executeAttack(selectedAlgoId, otherParams, image_file);
  };

  if (initialLoading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} 
          description="正在初始化实验台..." 
        />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: '100px 24px', textAlign: 'center' }}>
        <Alert
          message="加载失败"
          description={fetchError}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => window.location.reload()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <Content style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /> 首页</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ExperimentOutlined /> 算法实验台
        </Breadcrumb.Item>
      </Breadcrumb>

      <Row gutter={[24, 24]}>
        {/* 左侧配置栏 */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title={<><DashboardOutlined /> 选择攻击算法</>} bordered={false}>
              <List
                itemLayout="horizontal"
                dataSource={algorithms}
                renderItem={(algo) => (
                  <List.Item 
                    onClick={() => setSelectedAlgoId(algo.id)}
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedAlgoId === algo.id ? '#e6f7ff' : 'transparent',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <List.Item.Meta
                      title={<Text strong>{algo.name}</Text>}
                      description={algo.description}
                    />
                  </List.Item>
                )}
              />
            </Card>

            {selectedAlgo && (
              <Card title={<Text><ExperimentOutlined /> 算法参数配置</Text>} bordered={false}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {(selectedAlgo.inputs || []).map(input => {
                    // 处理条件显示
                    if (input.condition) {
                        const [condKey, condVal] = Object.entries(input.condition)[0];
                        if (params[condKey] !== condVal) return null;
                    }

                    return (
                      <div key={input.name}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>{input.label}</Text>
                        
                        {input.type === 'select' && (
                          <Select 
                            style={{ width: '100%' }}
                            value={params[input.name]}
                            onChange={(val) => handleParamChange(input.name, val)}
                            options={input.options || []}
                          />
                        )}

                        {input.type === 'slider' && (
                          <Row gutter={16} align="middle">
                            <Col span={18}>
                              <Slider
                                min={input.min}
                                max={input.max}
                                step={input.step}
                                value={params[input.name]}
                                onChange={(val) => handleParamChange(input.name, val)}
                              />
                            </Col>
                            <Col span={6}>
                              <Text code>{params[input.name]}</Text>
                            </Col>
                          </Row>
                        )}

                        {input.type === 'image_upload' && (
                          <Upload
                            name="file"
                            listType="picture-card"
                            className="avatar-uploader"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              const reader = new FileReader();
                              reader.onload = e => {
                                handleParamChange('image_preview', e.target.result);
                                handleParamChange('image_file', file);
                              };
                              reader.readAsDataURL(file);
                              return false;
                            }}
                          >
                            {params.image_preview ? (
                              <img src={params.image_preview} alt="preview" style={{ width: '100%' }} />
                            ) : (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>上传图片</div>
                              </div>
                            )}
                          </Upload>
                        )}

                        {input.type === 'dataset_picker' && (
                          <Row gutter={[12, 12]}>
                            {(cifarSamples || []).map(sample => {
                              const isSelected = selectedSamples.some(s => s.id === sample.id);
                              return (
                                <Col span={8} key={sample.id}>
                                  <div 
                                    onClick={() => toggleSample(sample)}
                                    style={{ 
                                      border: isSelected ? '3px solid #1890ff' : '1px solid #f0f0f0',
                                      padding: '4px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      position: 'relative',
                                      transition: 'all 0.3s',
                                      background: isSelected ? '#e6f7ff' : '#fff',
                                      boxShadow: isSelected ? '0 0 8px rgba(24,144,255,0.3)' : 'none'
                                    }}
                                  >
                                    <Image 
                                      src={`${API_BASE_URL}${sample.url}`} 
                                      preview={false}
                                      style={{ 
                                        width: '100%', 
                                        borderRadius: '4px',
                                        imageRendering: 'pixelated',
                                        display: 'block'
                                      }} 
                                    />
                                    {isSelected && (
                                      <div style={{
                                        position: 'absolute',
                                        top: -8,
                                        right: -8,
                                        background: '#1890ff',
                                        color: '#fff',
                                        borderRadius: '50%',
                                        width: 20,
                                        height: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        border: '2px solid #fff',
                                        zIndex: 1
                                      }}>
                                        {selectedSamples.findIndex(s => s.id === sample.id) + 1}
                                      </div>
                                    )}
                                  </div>
                                </Col>
                              );
                            })}
                          </Row>
                        )}
                      </div>
                    );
                  })}

                  <Divider style={{ margin: '12px 0' }} />

                  <Button 
                    type="primary" 
                    size="large" 
                    block 
                    icon={<ThunderboltOutlined />} 
                    loading={loading}
                    onClick={onRun}
                  >
                    启动实验
                  </Button>
                </Space>
              </Card>
            )}
          </Space>
        </Col>

        {/* 右侧展示栏 */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {loading && (
              <Alert
                message="任务正在执行中"
                description={
                  <div style={{ marginTop: '12px' }}>
                    <Progress percent={progress} status="active" />
                    <Text type="secondary">正在计算对抗扰动并验证模型输出...</Text>
                  </div>
                }
                type="info"
                showIcon
              />
            )}

            {result ? (
              <Card bordered={false} title="实验结果分析">
                <Row gutter={[24, 24]}>
                  {/* 分类结果展示 */}
                  {selectedAlgoId === 'resnet18_cifar10' && (
                    <>
                      <Col span={24}>
                        <Row gutter={16} justify="center">
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Card size="small" title="原始图像">
                              <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.original_image}`} 
                                  style={{ width: '100%', imageRendering: 'pixelated' }} 
                                />
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <Tag color="success">{result.original_class}</Tag>
                              </div>
                            </Card>
                          </Col>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Card size="small" title="对抗噪声">
                              <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.noise_image}`} 
                                  style={{ width: '100%', imageRendering: 'pixelated' }} 
                                />
                              </div>
                            </Card>
                          </Col>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Card size="small" title="对抗样本">
                              <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.adversarial_image}`} 
                                  style={{ width: '100%', imageRendering: 'pixelated' }} 
                                />
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <Tag color="error">{result.adversarial_class}</Tag>
                              </div>
                            </Card>
                          </Col>
                        </Row>
                      </Col>
                      
                      <Col span={24}>
                        <Card size="small" title="Top 5 分类置信度对比 (绿: 原始 | 红: 对抗)">
                          {(result.confidence_chart?.labels || []).map((label, idx) => (
                            <div key={label} style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <Text strong size="small">{label}</Text>
                                <Space>
                                  <Text type="secondary" size="small">原始: {(result.confidence_chart.original[idx] * 100).toFixed(1)}%</Text>
                                  <Text type="secondary" size="small">对抗: {(result.confidence_chart.adversarial[idx] * 100).toFixed(1)}%</Text>
                                </Space>
                              </div>
                              <Progress 
                                percent={(result.confidence_chart.original[idx] * 100)} 
                                strokeColor="#52c41a" 
                                showInfo={false} 
                                size="small"
                                style={{ marginBottom: '2px' }}
                              />
                              <Progress 
                                percent={(result.confidence_chart.adversarial[idx] * 100)} 
                                strokeColor="#f5222d" 
                                showInfo={false} 
                                size="small"
                              />
                            </div>
                          ))}
                        </Card>
                      </Col>
                    </>
                  )}

                  {/* 检测结果展示 */}
                  {selectedAlgoId === 'yolov8_attack' && (
                    <>
                      <Col span={24}>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Card size="small" title="原始检测结果">
                              <div style={{ background: '#f5f5f5', padding: '4px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.original_detection}`} 
                                  style={{ width: '100%', display: 'block' }} 
                                />
                              </div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" title="对抗噪声 (扰动)">
                              <div style={{ background: '#f5f5f5', padding: '4px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.noise_image}`} 
                                  style={{ width: '100%', display: 'block' }} 
                                />
                              </div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" title="攻击后检测结果">
                              <div style={{ background: '#f5f5f5', padding: '4px', borderRadius: '4px' }}>
                                <Image 
                                  src={`${API_BASE_URL}${result.adversarial_detection}`} 
                                  style={{ width: '100%', display: 'block' }} 
                                />
                              </div>
                            </Card>
                          </Col>
                        </Row>
                      </Col>
                      <Col span={24}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Alert 
                            message="攻击效果总结" 
                            description={result.detection_count_diff} 
                            type="warning" 
                            showIcon 
                          />
                          <Text type="secondary" size="small">
                            * 注：由于 YOLO 模型在推理前会将图像填充至 640x640 等固定比例，返回的对抗样本可能包含灰边。
                          </Text>
                        </Space>
                      </Col>
                    </>
                  )}
                </Row>
              </Card>
            ) : !loading && (
              <Card bordered={false} style={{ textAlign: 'center', padding: '100px 0' }}>
                <ExperimentOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
                <Title level={4} style={{ color: '#8c8c8c', marginTop: '24px' }}>准备就绪</Title>
                <Paragraph type="secondary">
                  在左侧选择攻击算法并配置参数，点击“启动实验”开始。
                </Paragraph>
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </Content>
  );
};

export default AttackLab;
