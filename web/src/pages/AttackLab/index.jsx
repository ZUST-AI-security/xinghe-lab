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
import NeonSlider from '../../components/common/NeonSlider';
import ImageUploader from '../../components/business/ImageUploader';
import ImageCompare from '../../components/common/ImageCompare';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const API_BASE_URL = 'http://localhost:8000';

const AttackLab = () => {
  const { algoId } = useParams();
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
        component = <Select options={input.options} size="large" className="glass-select" />;
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
        component = <InputNumber style={{ width: '100%' }} size="large" className="glass-input" />;
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
        label={<Text strong className="text-[#a0a0b0]" style={{ fontSize: '12px' }}>{input.label}</Text>}
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
          title="对抗实验全链路分析报告" 
          glowColor={result.success !== false ? "cyan" : "purple"}
        >
          {/* 三栏横向对比布局 */}
          <Row gutter={[24, 24]} align="top">
            {/* 1. 原始状态 */}
            <Col xs={24} md={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color="cyan" icon={<PictureOutlined />}>原始输入 (Original)</Tag>
                <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
                  <Image 
                    src={`${API_BASE_URL}${result.original_image}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    preview={{ mask: <><EyeOutlined /> 预览</> }}
                  />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    CLASS: {safeRender(isDetection ? 'N/A' : result.original_class)}
                  </div>
                </div>
              </Space>
            </Col>

            {/* 2. 交互式对比 (Core upgrade) */}
            <Col xs={24} md={8}>
              <ImageCompare 
                original={`${API_BASE_URL}${result.original_image}`}
                adversarial={`${API_BASE_URL}${result.adversarial_image}`}
              />
            </Col>

            {/* 3. 扰动分析 */}
            <Col xs={24} md={8}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color="purple" icon={<AreaChartOutlined />}>攻击扰动 (Perturbation)</Tag>
                <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
                  <Image 
                    src={`${API_BASE_URL}${result.noise_image}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    preview={{ mask: <><EyeOutlined /> 预览</> }}
                  />
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.1), transparent)' }} />
                </div>
              </Space>
            </Col>
          </Row>

          <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

          {/* 指标化统计栏 */}
          <Row gutter={24}>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '11px' }}>扰动预算 (Epsilon)</Text>}
                value={form.getFieldValue('epsilon') || 0.03}
                precision={3}
                valueStyle={{ color: '#00f3ff', fontSize: '18px' }}
                prefix={<SettingOutlined style={{ fontSize: '12px', marginRight: '8px' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '11px' }}>攻击状态</Text>}
                value={result.adversarial_class !== result.original_class ? "成功" : "防御中"}
                valueStyle={{ color: result.adversarial_class !== result.original_class ? token.colorError : token.colorSuccess, fontSize: '18px' }}
                prefix={result.adversarial_class !== result.original_class ? <RocketOutlined style={{ fontSize: '12px', marginRight: '4px' }} /> : <SafetyOutlined style={{ fontSize: '12px', marginRight: '4px' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '11px' }}>置信度偏移</Text>}
                value={result.confidence_chart ? Math.abs((result.confidence_chart.original[0] - result.confidence_chart.adversarial[0]) * 100) : 0}
                precision={1}
                suffix="%"
                valueStyle={{ color: token.colorWarning, fontSize: '18px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<Text type="secondary" style={{ fontSize: '11px' }}>判定分类 (New)</Text>}
                value={safeRender(result.adversarial_class)}
                valueStyle={{ color: '#fff', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              />
            </Col>
          </Row>
        </GlassCard>

        {/* 动态演变图表 */}
        {result.confidence_chart && !isDetection && (
          <GlassCard title="分类置信度演变对比" glowColor="blue">
            <Row gutter={[16, 16]}>
              {(result.confidence_chart.labels || []).map((label, idx) => (
                <Col key={label} span={24} md={12} lg={8}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '12px', maxWidth: '100px' }} ellipsis>{label}</Text>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '10px' }}>原: {(result.confidence_chart.original[idx] * 100).toFixed(1)}%</Text>
                        <Text type="danger" style={{ fontSize: '10px' }}>现: {(result.confidence_chart.adversarial[idx] * 100).toFixed(1)}%</Text>
                      </div>
                    </div>
                    <Progress percent={result.confidence_chart.original[idx] * 100} size="small" strokeColor="#00f3ff" showInfo={false} style={{ marginBottom: '4px' }} />
                    <Progress percent={result.confidence_chart.adversarial[idx] * 100} size="small" strokeColor={token.colorError} showInfo={false} />
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
        <Spin size="large" />
        <Text style={{ marginTop: '24px', color: '#00f3ff' }}>实验室核心模块加载中...</Text>
      </div>
    );
  }

  return (
    <Content style={{ padding: '24px 50px', background: '#050508', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <Space size={16}>
          <Button 
            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
          >
            返回列表
          </Button>
          <Breadcrumb 
            items={[
              { title: <Link to="/" style={{ color: 'rgba(255,255,255,0.4)' }}><HomeOutlined /> 首页</Link> },
              { title: <span style={{ color: '#fff' }}>{selectedAlgo?.name}</span> }
            ]}
          />
        </Space>
        
        <Tag color="cyan" style={{ background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff', borderColor: 'transparent' }}>实验室模式: 专业对抗</Tag>
      </div>

      <Row gutter={[32, 24]}>
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <GlassCard title="算法节点详情" glowColor="blue">
              <Title level={4} style={{ color: '#00f3ff', margin: 0 }}>{selectedAlgo?.name}</Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '12px', lineHeight: '1.6' }}>
                {selectedAlgo?.description}
              </Paragraph>
              <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <div style={{ fontSize: '10px', color: '#444' }}>
                INSTANCE_ID: {selectedAlgoId.toUpperCase()}
              </div>
            </GlassCard>

            <GlassCard title="参数配置集">
              <Form
                form={form}
                layout="vertical"
              >
                {selectedAlgo?.inputs.map(input => renderFormItem(input))}
                
                <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                
                <GradientButton 
                  primary 
                  size="large" 
                  block 
                  loading={loading}
                  onClick={onRun}
                  style={{ height: '50px', borderRadius: '8px' }}
                >
                  <ThunderboltOutlined style={{ marginRight: '8px' }} /> 运行对抗实验
                </GradientButton>
              </Form>
            </GlassCard>
          </Space>
        </Col>

        <Col xs={24} lg={16}>
          {loading && (
            <GlassCard className="text-center" glowColor="cyan" style={{ marginBottom: '24px', padding: '60px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#00f3ff' }} spin />} />
              <div style={{ marginTop: '24px' }}>
                <Text style={{ color: '#00f3ff', fontSize: '14px' }}>正在计算深度梯度扰动: {progress}%</Text>
                <Progress percent={progress} status="active" showInfo={false} strokeColor="#00f3ff" style={{ width: '200px', margin: '16px auto 0' }} />
              </div>
            </GlassCard>
          )}

          {result ? renderAnalysisReport() : !loading && (
            <div style={{ height: '100%', minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
              <Empty
                image={<PictureOutlined style={{ fontSize: 64, color: 'rgba(255,255,255,0.03)' }} />}
                description={
                  <Space direction="vertical" align="center" size={0}>
                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>等待实验指令</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: '12px' }}>在此配置参数并运行以查对对抗样本生成的具体细节。</Text>
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
