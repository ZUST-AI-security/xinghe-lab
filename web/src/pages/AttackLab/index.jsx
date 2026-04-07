import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Typography, 
  Row, 
  Col, 
  Progress, 
  Space, 
  Divider, 
  Spin, 
  Image,
  Tag,
  Breadcrumb,
  Select,
  InputNumber,
  Button,
  theme,
  Form,
  Empty,
  Statistic,
  Descriptions,
  List,
  Tooltip
} from 'antd';
import { 
  ExperimentOutlined, 
  ThunderboltOutlined, 
  HomeOutlined,
  DashboardOutlined,
  LoadingOutlined,
  PictureOutlined,
  AreaChartOutlined,
  CheckCircleFilled,
  SettingOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  RocketOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { useAttack } from '../../hooks/useAttack';
import { algorithmService, datasetService, uploadService } from '../../services/api';

// Custom Components
import NeonSlider from '../../components/Common/NeonSlider';
import ImageUploader from '../../components/Common/ImageUploader';
import ImageCompare from '../../components/Common/ImageCompare';
import GlassCard from '../../components/Common/GlassCard';
import GradientButton from '../../components/Common/GradientButton';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const API_BASE_URL = 'http://localhost:8000';

const AttackLab = () => {
  const { algoId = 'fgsm' } = useParams();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  
  const formValues = Form.useWatch([], form);
  const { executeAttack, result, setResult, loading, progress } = useAttack();

  const [algorithms, setAlgorithms] = useState([]);
  const [selectedAlgoId, setSelectedAlgoId] = useState(algoId);
  
  const [cifarSamples, setCifarSamples] = useState([]);
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // 安全渲染工具 (对齐 yunzen 分支)
  const safeRender = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    return typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value;
  };

  // 初始化：获取算法列表并匹配当前算法
  useEffect(() => {
    algorithmService.getAlgorithms()
      .then(res => {
        const algos = res.data || [];
        setAlgorithms(algos);
        
        if (algoId && algos.some(a => a.id === algoId)) {
          setSelectedAlgoId(algoId);
        } else if (algos.length > 0 && !algoId) {
          navigate(`/attack/${algos[0].id}`, { replace: true });
        }
      })
      .catch(err => {
        console.error('Failed to fetch algorithms:', err);
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [algoId, navigate]);

  const selectedAlgo = algorithms.find(a => a.id === selectedAlgoId);
  const isDetection = selectedAlgoId?.includes('yolo');

  // 当算法切换时，重置表单和参数
  useEffect(() => {
    if (selectedAlgo) {
      const initialParams = {};
      (selectedAlgo.inputs || []).forEach(input => {
        if (input.default !== undefined) {
          initialParams[input.name] = input.default;
        }
      });
      form.setFieldsValue({
        ...initialParams,
        image: undefined,
        image_preview: undefined,
        image_file: undefined,
        dataset_sample: undefined
      });
      if (setResult) setResult(null); 
    }
  }, [selectedAlgoId, selectedAlgo, form, setResult]);

  const onRun = async () => {
    try {
      const values = await form.validateFields();
      const { image_preview, image_file, dataset_sample, ...otherParams } = values;
      if (!values.image && selectedSamples.length > 0) {
        otherParams.image = selectedSamples[0].url;
      }
      executeAttack(selectedAlgoId, otherParams, values.image_file);
    } catch (err) {
      console.error('Validate Failed:', err);
    }
  };

  const renderFormItem = (input) => {
    let component = null;
    switch (input.type) {
      case 'select':
        component = <Select options={input.options} size="large" className="glass-select" style={{ fontSize: '15px' }} />;
        break;
      case 'slider':
        component = (
          <NeonSlider 
            min={input.min} 
            max={input.max} 
            step={input.step} 
            label=""
          />
        );
        break;
      case 'number':
        component = <InputNumber style={{ width: '100%', fontSize: '15px' }} size="large" className="glass-input" />;
        break;
      case 'image_upload':
        const currentPreview = form.getFieldValue('image_preview');
        component = (
          <ImageUploader
            preview={currentPreview}
            onUpload={async (file, preview) => {
              try {
                form.setFieldsValue({ 
                  image_preview: preview,
                  image_file: file
                });
                const res = await uploadService.uploadImage(file);
                const serverPath = res.data.url;
                form.setFieldsValue({ image: serverPath });
                setSelectedSamples([]);
              } catch (err) {
                console.error('Upload failed:', err);
              }
            }}
          />
        );
        break;
      default:
        return null;
    }

    return (
      <Form.Item 
        key={input.name} 
        name={input.name} 
        label={<Text strong className="text-[#a0a0b0]" style={{ fontSize: '15px' }}>{input.label}</Text>}
        style={{ marginBottom: 24 }}
      >
        {component}
      </Form.Item>
    );
  };

  const renderAnalysisReport = () => {
    if (!result) return null;

    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <GlassCard 
          title={<span style={{ fontSize: '18px' }}>对抗实验全链路分析报告</span>} 
          glowColor={result.success !== false ? "cyan" : "purple"}
        >
          {/* 三栏横向对比布局 */}
          <Row gutter={[24, 24]} align="top">
            {/* 1. 原始状态 */}
            <Col xs={24} md={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color="cyan" icon={<PictureOutlined />} style={{ fontSize: '12px', padding: '4px 10px' }}>原始输入</Tag>
                <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.6)' }}>
                  <Image 
                    src={`${API_BASE_URL}${result.original_image}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    preview={{ mask: <><EyeOutlined /> 预览</> }}
                  />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '6px', fontSize: '12px', color: '#fff', border: '1px solid rgba(0,243,255,0.3)', fontWeight: 'bold' }}>
                    {safeRender(isDetection ? 'N/A' : result.original_class)}
                  </div>
                </div>
              </Space>
            </Col>

            {/* 2. 交互式对比 (Core upgrade) */}
            <Col xs={24} md={8}>
              <ImageCompare 
                original={`${API_BASE_URL}${result.original_image}`}
                adversarial={`${API_BASE_URL}${result.adversarial_image}`}
                title="图像细节透感分析"
              />
            </Col>

            {/* 3. 扰动分析 */}
            <Col xs={24} md={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color="purple" icon={<AreaChartOutlined />} style={{ fontSize: '12px', padding: '4px 10px' }}>攻击扰动图</Tag>
                <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.6)' }}>
                  <Image 
                    src={`${API_BASE_URL}${result.noise_image}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    preview={{ mask: <><EyeOutlined /> 预览</> }}
                  />
                </div>
              </Space>
            </Col>
          </Row>

          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '32px 0' }} />

          {/* 指标化统计栏 - 巨幕字体 */}
          <Row gutter={24}>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '14px' }}>扰动预算 (Epsilon)</Text>}
                value={form.getFieldValue('epsilon') || 0.03}
                precision={3}
                valueStyle={{ color: '#00f3ff', fontSize: '28px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '14px' }}>攻击状态</Text>}
                value={result.adversarial_class !== result.original_class ? "SUCCESS" : "FAIL"}
                valueStyle={{ color: result.adversarial_class !== result.original_class ? '#ff4d4f' : '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '14px' }}>置信度偏移</Text>}
                value={result.confidence_chart ? Math.abs((result.confidence_chart.original[0] - result.confidence_chart.adversarial[0]) * 100) : 0}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '14px' }}>新判定分类</Text>}
                value={safeRender(result.adversarial_class)}
                valueStyle={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              />
            </Col>
          </Row>
        </GlassCard>

        {/* 置信度列表 */}
        {result.confidence_chart && !isDetection && (
          <GlassCard title={<span style={{ fontSize: '16px' }}>置信度动态演变详情</span>} glowColor="blue">
            <Row gutter={[16, 16]}>
              {(result.confidence_chart.labels || []).map((label, idx) => (
                <Col key={label} span={24} md={12}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <Text strong style={{ fontSize: '15px' }} ellipsis>{label}</Text>
                      <Space size="large">
                        <Text type="secondary" style={{ fontSize: '13px' }}>原: {(result.confidence_chart.original[idx] * 100).toFixed(1)}%</Text>
                        <Text type="danger" style={{ fontSize: '13px', fontWeight: 'bold' }}>现: {(result.confidence_chart.adversarial[idx] * 100).toFixed(1)}%</Text>
                      </Space>
                    </div>
                    <Progress percent={result.confidence_chart.original[idx] * 100} size="small" strokeColor="#00f3ff" showInfo={false} style={{ marginBottom: '6px' }} />
                    <Progress percent={result.confidence_chart.adversarial[idx] * 100} size="small" strokeColor="#ff4d4f" showInfo={false} />
                  </div>
                </Col>
              ))}
            </Row>
          </GlassCard>
        )}
      </Space>
    );
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', background: '#0a0a0f' }}>
        <Spin size="large" tip="系统校准中..." />
      </div>
    );
  }

  return (
    <Content style={{ padding: '32px 64px', background: '#050508', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <Space size={20}>
          <Button 
            style={{ height: '40px', padding: '0 24px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' }}
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
          >
            返回监控中心
          </Button>
          <Breadcrumb 
            items={[
              { title: <Link to="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}><HomeOutlined /> 首页</Link> },
              { title: <span style={{ color: '#fff', fontSize: '14px' }}>{selectedAlgo?.name}</span> }
            ]}
          />
        </Space>
        
        <Tag color="cyan" style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff', borderColor: 'transparent', fontSize: '12px', fontWeight: 'bold' }}>实验环境: 专业级</Tag>
      </div>

      <Row gutter={[32, 32]}>
        {/* 左侧：参数区域 - 宽度保持 10 */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <GlassCard title={<span style={{ fontSize: '16px' }}>算法节点引擎状态</span>} glowColor="blue">
              <Title level={3} style={{ color: '#00f3ff', margin: 0, fontSize: '24px' }}>{selectedAlgo?.name}</Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '16px', lineHeight: '1.8' }}>
                {selectedAlgo?.description}
              </Paragraph>
              <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
              <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                NODE_HASH: {(selectedAlgoId || 'FGSM').toUpperCase()}
              </div>
            </GlassCard>

            <GlassCard title={<span style={{ fontSize: '16px' }}>超参数精调矩阵</span>}>
              <Form
                form={form}
                layout="vertical"
              >
                {selectedAlgo?.inputs.map(input => renderFormItem(input))}
                
                <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />
                
                <GradientButton 
                  primary 
                  size="large" 
                  block 
                  loading={loading}
                  onClick={onRun}
                  style={{ height: '56px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold' }}
                >
                  <ThunderboltOutlined style={{ marginRight: '10px' }} /> 启动对抗引擎
                </GradientButton>
              </Form>
            </GlassCard>
          </Space>
        </Col>

        {/* 右侧：结果展示 - 宽度保持 14 */}
        <Col xs={24} lg={14}>
          {loading && (
            <GlassCard className="text-center" glowColor="cyan" style={{ marginBottom: '32px', padding: '60px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#00f3ff' }} spin />} />
              <div style={{ marginTop: '24px' }}>
                <Text style={{ color: '#00f3ff', fontSize: '16px', fontWeight: 'bold' }}>计算深度梯度演变: {progress}%</Text>
                <Progress percent={progress} status="active" showInfo={false} strokeColor="#00f3ff" style={{ width: '260px', margin: '20px auto 0', height: '8px' }} />
              </div>
            </GlassCard>
          )}

          {result ? renderAnalysisReport() : !loading && (
            <div style={{ height: '100%', minHeight: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '24px', background: 'rgba(255,255,255,0.01)' }}>
              <Empty
                image={<PictureOutlined style={{ fontSize: 80, color: 'rgba(255,255,255,0.03)' }} />}
                description={
                  <Space direction="vertical" align="center" size={8}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', fontWeight: 'bold' }}>监控阵列待命</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.12)', fontSize: '14px', textAlign: 'center', maxWidth: '300px' }}>配置实验参数后点击启动。系统将展示全链路对抗评估报告。</Text>
                  </Space>
                }
              />
            </div>
          )}
        </Col>
      </Row>
    </Content>
  );
};

export default AttackLab;
