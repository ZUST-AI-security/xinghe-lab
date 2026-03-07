import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Typography, 
  Row, 
  Col, 
  Card, 
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
  Radio,
  Empty,
  Descriptions,
  List
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
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useAttack } from '../../hooks/useAttack';
import { algorithmService, datasetService, uploadService } from '../../services/api';

// Custom Components
import NeonSlider from '../../components/common/NeonSlider';
import ImageUploader from '../../components/business/ImageUploader';

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

  // 初始化：获取算法列表并匹配当前算法
  useEffect(() => {
    algorithmService.getAlgorithms()
      .then(res => {
        const algos = res.data || [];
        setAlgorithms(algos);
        
        if (algoId && algos.some(a => a.id === algoId)) {
          setSelectedAlgoId(algoId);
        } else if (algos.length > 0 && !algoId) {
          // 如果没有 ID，默认跳转到第一个
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

  // 获取 CIFAR-10 样本
  useEffect(() => {
    if (selectedAlgoId === 'resnet18_cifar10') {
      datasetService.getCifar10Samples(12)
        .then(res => setCifarSamples(res.data || []))
        .catch(err => console.error('Failed to fetch samples:', err));
    }
  }, [selectedAlgoId]);

  const toggleSample = (sample) => {
    setSelectedSamples([sample]);
    form.setFieldsValue({ 
      dataset_sample: sample.url,
      image: sample.url,
      image_preview: `${API_BASE_URL}${sample.url}`
    });
  };

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
    if (input.condition) {
      const [condKey, condVal] = Object.entries(input.condition)[0];
      const currentVal = formValues?.[condKey];
      if (currentVal !== condVal) return null;
    }

    let component = null;
    switch (input.type) {
      case 'select':
        component = <Select options={input.options} size="large" />;
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
        component = <InputNumber style={{ width: '100%' }} size="large" />;
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
      case 'dataset_picker':
        component = (
          <List
            grid={{ gutter: 12, column: 2 }}
            dataSource={cifarSamples}
            renderItem={(sample) => {
              const isSelected = selectedSamples.some(s => s.id === sample.id);
              return (
                <List.Item style={{ marginBottom: 12 }}>
                  <Card
                    hoverable
                    size="small"
                    cover={
                      <div style={{ 
                        width: '100%', 
                        aspectRatio: '1/1', 
                        background: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <Image
                          src={`${API_BASE_URL}${sample.url}`}
                          preview={{ mask: <><EyeOutlined /> 预览</> }}
                          style={{ 
                            imageRendering: 'pixelated', 
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover' 
                          }}
                        />
                      </div>
                    }
                    style={{ 
                      border: isSelected ? `2px solid ${token.colorPrimary}` : '1px solid #f0f0f0'
                    }}
                    onClick={() => toggleSample(sample)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {isSelected ? <Tag color="blue">已选中</Tag> : <Text type="secondary" style={{ fontSize: 12 }}>点击选择</Text>}
                    </div>
                  </Card>
                </List.Item>
              );
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
        label={<Text strong>{input.label}</Text>}
        style={{ marginBottom: 24 }}
      >
        {component}
      </Form.Item>
    );
  };

  const renderAnalysisReport = () => {
    if (!result) return null;

    if (isDetection) {
      // YOLO Detection results
      return (
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <Card title={<><CheckCircleFilled style={{ color: token.colorSuccess }} /> 目标检测实验分析报告</>}>
            <Row gutter={[24, 32]}>
              <Col span={24}>
                <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                  {[
                    { key: 'original', title: '原始图像 (Original Input)', img: result.original_image, label: '无标注', color: 'default' },
                    { key: 'original_det', title: '原始检测结果 (Original Detection)', img: result.original_detection, label: '原始状态', color: 'success' },
                    { key: 'noise', title: '对抗噪声 (Generated Perturbation)', img: result.noise_image, label: '噪声强度分布', color: 'processing' },
                    { key: 'adv_img', title: '对抗样本 (Adversarial Input)', img: result.adversarial_image, label: '攻击后(无框)', color: 'default' },
                    { key: 'adv_det', title: '对抗检测结果 (Adversarial Detection)', img: result.adversarial_detection, label: '攻击后状态', color: 'error' }
                  ].map(item => (
                    <Card 
                      key={item.key}
                      size="small" 
                      title={<Text strong>{item.title}</Text>} 
                      extra={<Tag color={item.color}>{item.label}</Tag>}
                      style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        background: '#000', 
                        borderRadius: 8,
                        width: '100%',
                        maxWidth: 600,
                        margin: '0 auto'
                      }}>
                        <Image 
                          src={`${API_BASE_URL}${item.img}`} 
                          style={{ width: '100%', display: 'block' }} 
                          preview={{ label: <><EyeOutlined /> 点击放大</> }}
                        />
                      </div>
                    </Card>
                  ))}
                </Space>
              </Col>
              <Col span={24}>
                <Descriptions title="攻击效果统计" bordered column={1}>
                  <Descriptions.Item label="目标算法">YOLOv8 目标检测</Descriptions.Item>
                  <Descriptions.Item label="检测结果变化">
                    <Text strong type="danger">{result.detection_count_diff}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        </Space>
      );
    }

    // Classification results (ResNet etc.)
    return (
      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        <Card title={<><CheckCircleFilled style={{ color: token.colorSuccess }} /> 图像分类实验分析报告</>}>
          <Row gutter={[24, 32]}>
            <Col span={24}>
              <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                {[
                  { key: 'original', title: '原始图像 (Original Input)', img: result.original_image, label: result.original_class, color: 'success' },
                  { key: 'noise', title: '对抗噪声 (Generated Perturbation)', img: result.noise_image, label: '噪声强度分布', color: 'processing' },
                  { key: 'adversarial', title: '对抗样本 (Adversarial Output)', img: result.adversarial_image, label: result.adversarial_class, color: 'error' }
                ].map(item => (
                  <Card 
                    key={item.key}
                    size="small" 
                    title={<Text strong>{item.title}</Text>} 
                    extra={<Tag color={item.color}>{item.label}</Tag>}
                    style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      background: '#000', 
                      borderRadius: 8,
                      width: '100%',
                      maxWidth: 500,
                      aspectRatio: '1/1',
                      margin: '0 auto'
                    }}>
                      <Image 
                        src={`${API_BASE_URL}${item.img}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        preview={{ label: <><EyeOutlined /> 点击放大</> }}
                      />
                    </div>
                  </Card>
                ))}
              </Space>
            </Col>

            <Col span={24}>
              <Descriptions title="模型预测详情" bordered column={1} size="small">
                <Descriptions.Item label="目标模型">{selectedAlgo?.name}</Descriptions.Item>
                <Descriptions.Item label="原始置信度">
                  <Tag color="green">{result.original_class}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="攻击后置信度">
                  <Tag color="red">{result.adversarial_class}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Col>

            {result.confidence_chart && (
              <Col span={24}>
                <Card size="small" title={<><AreaChartOutlined /> Top 5 分类置信度演变对比</>}>
                  {(result.confidence_chart.labels || []).map((label, idx) => (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>{label}</Text>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>原始: {(result.confidence_chart.original[idx] * 100).toFixed(1)}%</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>对抗: {(result.confidence_chart.adversarial[idx] * 100).toFixed(1)}%</Text>
                        </Space>
                      </div>
                      <Progress 
                        percent={result.confidence_chart.original[idx] * 100} 
                        strokeColor={token.colorSuccess} 
                        showInfo={false} 
                        size="small"
                        style={{ marginBottom: 2 }}
                      />
                      <Progress 
                        percent={result.confidence_chart.adversarial[idx] * 100} 
                        strokeColor={token.colorError} 
                        showInfo={false} 
                        size="small"
                      />
                    </div>
                  ))}
                </Card>
              </Col>
            )}
          </Row>
        </Card>
      </Space>
    );
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Spin size="large" description="实验室初始化中..." />
      </div>
    );
  }

  return (
    <Content style={{ padding: '24px 50px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/')}
        >
          返回列表
        </Button>
        <Breadcrumb 
          items={[
            { title: <Link to="/"><HomeOutlined /> 首页</Link> },
            { title: <span><ExperimentOutlined /> {selectedAlgo?.name || '算法实验台'}</span> }
          ]}
        />
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={8}>
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            <Card 
              title={<><DashboardOutlined /> 算法引擎</>}
              extra={<Tag color="blue">{isDetection ? '目标检测' : '图像分类'}</Tag>}
            >
              <Title level={4}>{selectedAlgo?.name}</Title>
              <Paragraph type="secondary">{selectedAlgo?.description}</Paragraph>
              <Divider />
              <div style={{ fontSize: '12px', color: '#888' }}>
                ID: {selectedAlgoId}
              </div>
            </Card>

            <Card title={<><SettingOutlined /> 参数配置</>}>
              <Form
                form={form}
                layout="vertical"
              >
                {selectedAlgo?.inputs.map(input => renderFormItem(input))}
                
                <Divider />
                
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  icon={<ThunderboltOutlined />} 
                  loading={loading}
                  onClick={onRun}
                  style={{ height: 50, borderRadius: 8 }}
                >
                  运行对抗实验
                </Button>
              </Form>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={16}>
          {loading && (
            <Card style={{ marginBottom: 24, textAlign: 'center' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <div style={{ marginTop: 16 }}>
                <Text strong>算法推理中: {progress}%</Text>
                <Progress percent={progress} status="active" showInfo={false} style={{ marginTop: 8 }} />
              </div>
            </Card>
          )}

          {result ? renderAnalysisReport() : !loading && (
            <Card style={{ height: '100%', minHeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                image={<PictureOutlined style={{ fontSize: 64, color: token.colorTextQuaternary }} />}
                description={
                  <Space orientation="vertical" align="center">
                    <Text type="secondary" style={{ fontSize: 16 }}>实验室准备就绪</Text>
                    <Text type="secondary">在左侧面板配置攻击参数后点击“运行实验”查看分析结果</Text>
                  </Space>
                }
              />
            </Card>
          )}
        </Col>
      </Row>
    </Content>
  );
};

export default AttackLab;
