import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import { 
  Layout, 
  Typography, 
  Row, 
  Col, 
  Card, 
  Progress, 
  Space, 
  Spin, 
  Image,
  Tag,
  Breadcrumb,
  Select,
  Button,
  theme,
  Form,
  Empty,
  Statistic,
  Alert,
  Collapse,
  Switch,
  Tooltip
} from 'antd';
import { 
  ThunderboltOutlined, 
  HomeOutlined,
  DashboardOutlined,
  PictureOutlined,
  AreaChartOutlined,
  CheckCircleFilled,
  SettingOutlined,
  EyeOutlined,
  RocketOutlined,
  TrophyOutlined,
  SafetyOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import useCWAttack from '../../hooks/useCWAttack';
import { algorithmService, uploadService } from '../../services/api';
import { cwAttackService } from '../../services/api/attack';

// Custom Components
import NeonSlider from '../../components/Common/NeonSlider';
import ImageUploader from '../../components/Common/ImageUploader';

const { Text } = Typography;
const { Content } = Layout;

const API_BASE_URL = 'http://localhost:8000';

const AttackLab = () => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  
  const { executeAttack, result, setResult, loading, setLoading, progress, error, setError } = useCWAttack();

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('resnet100_imagenet');
  const [initialLoading, setInitialLoading] = useState(true);
  
  // 新增状态：原始预测结果和分类状态
  const [initialPrediction, setInitialPrediction] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  
  // 异步任务状态管理
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const pollTimer = useRef(null);

  // 错误检查函数 - 检查result是否为错误对象
  const isValidResult = (data) => {
    if (!data || typeof data !== 'object') return false;
    
    // 检查是否为FastAPI验证错误对象
    if (data.type && data.loc && data.msg && data.input && data.ctx) {
      console.error('FastAPI验证错误:', data);
      const errorMsg = safeRender(data, '参数验证失败');
      message.error(`参数验证失败: ${errorMsg}`);
      return false;
    }
    
    // 检查是否为标准错误格式 {detail: [errors]}
    if (data.detail && Array.isArray(data.detail)) {
      console.error('FastAPI批量验证错误:', data.detail);
      const errorMessages = data.detail.map(err => err.msg || err.message).join('; ');
      message.error(`参数验证失败: ${errorMessages}`);
      return false;
    }
    
    // 检查是否为正常的结果对象（包含必要的字段）
    const requiredFields = ['original_image', 'adversarial_image', 'noise_image'];
    return requiredFields.every(field => data[field] !== undefined);
  };

  // 安全渲染函数 - 确保只渲染字符串或数字，防御性编程
  const safeRender = (value, fallback = '') => {
    try {
      // 处理 null/undefined
      if (value === null || value === undefined) return fallback;
      
      // 处理基础类型
      if (typeof value === 'string') {
        // 过滤潜在的XSS内容
        return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
      if (typeof value === 'number') {
        // 处理NaN和Infinity
        if (isNaN(value)) return fallback;
        if (!isFinite(value)) return fallback;
        return String(value);
      }
      if (typeof value === 'boolean') return String(value);
      
      // 处理对象类型 - FastAPI错误响应
      if (typeof value === 'object' && value !== null) {
        // 优先检查FastAPI标准错误格式 {detail: [errors]}
        if (value.detail && Array.isArray(value.detail)) {
          const errorMessages = value.detail.map(err => {
            // 处理每个错误项
            if (err && typeof err === 'object') {
              // 处理FastAPI验证错误格式 {type, loc, msg, input, ctx}
              if (err.type && err.loc && err.msg) {
                const location = Array.isArray(err.loc) ? err.loc.join('.') : err.loc;
                return `参数错误 [${location}]: ${err.msg}`;
              }
              // 处理标准错误格式
              return err.msg || err.message || String(err);
            }
            return String(err || '');
          }).filter(msg => msg).join('; ');
          return errorMessages || fallback;
        }
        
        // 检查是否包含detail字段但非数组
        if (value.detail) {
          return typeof value.detail === 'string' ? value.detail : fallback;
        }
        
        // 检查FastAPI 422验证错误格式 {type, loc, msg, input, ctx}
        if (value.type && value.loc && value.msg) {
          return `参数错误 [${Array.isArray(value.loc) ? value.loc.join('.') : value.loc}]: ${value.msg}`;
        }
        
        // 尝试提取常见错误字段
        if (value.msg || value.message) {
          return value.msg || value.message;
        }
        
        // 兜底方案：安全的JSON序列化
        try {
          const jsonString = JSON.stringify(value, null, 0);
          return jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString;
        } catch {
          return fallback;
        }
      }
      
      // 其他类型转为字符串
      return String(value);
    } catch (error) {
      console.warn('safeRender error:', error);
      return fallback;
    }
  };

  // 获取任务状态的函数
  const fetchTaskStatus = useCallback(async (taskId) => {
    try {
      const response = await cwAttackService.getTaskStatus(taskId);
      const data = response.data || {};
      const { status, result: taskResult, error: taskError } = data;

      console.log(`任务 ${taskId} 状态:`, status, data);

      if (status === 'SUCCESS') {
        // 任务成功完成，设置结果
        if (taskResult) {
          // 确保result对象包含必要的字段
          const formattedResult = {
            original_image: taskResult.original_image,
            adversarial_image: taskResult.adversarial_image || taskResult.adv_image,
            noise_image: taskResult.noise_image || taskResult.noise_map || taskResult.heatmap,
            original_class: taskResult.original_class_name || taskResult.original_prediction?.class_name,
            adversarial_class: taskResult.adversarial_class_name || taskResult.adversarial_prediction?.class_name,
            original_prediction: {
              class_name: taskResult.original_class_name || taskResult.original_prediction?.class_name,
              confidence: taskResult.original_confidence || taskResult.original_prediction?.confidence
            },
            adversarial_prediction: {
              class_name: taskResult.adversarial_class_name || taskResult.adversarial_prediction?.class_name,
              confidence: taskResult.adversarial_prediction?.confidence
            },
            confidence_chart: taskResult.confidence_chart,
            metadata: taskResult.metadata
          };
          
          setResult(formattedResult);
          setLocalProgress(100);
          message.success('攻击任务完成！');
        }
        setPollingActive(false);
        setCurrentTaskId(null);
        return true;
      } else if (status === 'FAILURE') {
        // 任务失败
        const errorMessage = safeRender(taskError || data.detail || '任务执行失败');
        setError(errorMessage);
        message.error(`攻击失败: ${errorMessage}`);
        setPollingActive(false);
        setCurrentTaskId(null);
        setLocalProgress(0);
        return true;
      } else if (status === 'PROGRESS') {
        // 处理进度更新
        const progressValue = data.meta?.progress || data.progress;
        if (progressValue) {
          setLocalProgress(Math.min(progressValue, 95));
        } else {
          setLocalProgress(prev => Math.min(prev + 2, 90));
        }
        return false;
      } else {
        // 仍在处理中 (PENDING, STARTED, RETRY, etc.)
        setLocalProgress(prev => Math.min(prev + 1, 85));
        return false;
      }
    } catch (err) {
      console.error('轮询任务状态失败:', err);
      const errorMessage = safeRender(err.response?.data || err.message || '轮询任务状态失败');
      setError(errorMessage);
      setPollingActive(false);
      setCurrentTaskId(null);
      setLocalProgress(0);
      return true;
    }
  }, [setError, setResult]);

  // 启动轮询
  const startPolling = useCallback((taskId) => {
    if (pollingActive) return; // 避免重复轮询
    
    setCurrentTaskId(taskId);
    setPollingActive(true);
    setLocalProgress(10); // 初始进度
    
    // 使用setTimeout递归轮询
    const poll = async () => {
      const shouldStop = await fetchTaskStatus(taskId);
      if (!shouldStop && pollingActive) {
        pollTimer.current = setTimeout(poll, 2000); // 2秒后再次轮询
      }
    };
    
    // 立即开始第一次轮询
    poll();
  }, [pollingActive, fetchTaskStatus]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理轮询定时器
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
      // 重置状态
      setPollingActive(false);
      setCurrentTaskId(null);
      setLocalProgress(0);
    };
  }, []);

  // 图片分类预测函数
  const classifyImage = useCallback(async (imageBase64, modelName) => {
    setIsClassifying(true);
    try {
      const response = await algorithmService.predict(imageBase64, modelName);
      const prediction = response.data;
      console.log('原始分类结果:', prediction);
      setInitialPrediction(prediction);
      return prediction;
    } catch (err) {
      console.error('图片分类失败:', err);
      
      // 防御性错误处理
      let errorMessage = '图片分类失败';
      if (err.response?.data) {
        errorMessage = safeRender(err.response.data, '图片分类请求失败');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage);
      setInitialPrediction(null);
      return null;
    } finally {
      setIsClassifying(false);
    }
  }, []);

  // 初始化：获取模型列表（固定C&W攻击）
  useEffect(() => {
    algorithmService.getModels()
      .then(modelsRes => {
        const availableModels = modelsRes.data?.models || modelsRes.data || [];
        setModels(availableModels);
      })
      .catch(err => {
        console.error('Failed to fetch models:', err);
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, []);

  const selectedAlgo = useMemo(() => ({ 
    id: 'cw', 
    name: 'C&W Attack', 
    description: 'Carlini & Wagner L2攻击算法，强大的基于优化的对抗攻击方法',
    type: 'classification'
  }), []);
  const isDetection = false; // C&W是分类攻击

  // 当算法切换时，重置表单和参数
  useEffect(() => {
    if (selectedAlgo) {
      form.setFieldsValue({
        image: undefined,
        image_preview: undefined,
        image_file: undefined
      });
      if (setResult) setResult(null); 
      setInitialPrediction(null); // 重置初始预测
    }
  }, [selectedAlgo, form, setResult]);

  // 模型切换时重新分类（如果有图片预览）
  useEffect(() => {
    const imagePreview = form.getFieldValue('image_preview');
    if (imagePreview && selectedModel) {
      classifyImage(imagePreview, selectedModel);
    }
  }, [selectedModel, classifyImage, form]);

  const onRun = async () => {
    try {
      const values = await form.validateFields();
      const { image_preview, image_file, dataset_sample, ...otherParams } = values;
      
      // 第一步：从ImageUploader关联的状态或form中提取imageBase64
      const imagePreview = form.getFieldValue('image_preview');
      const imageUrl = form.getFieldValue('image');
      const imageBase64 = imagePreview || imageUrl;
      
      // 第二步：校验图片是否存在
      if (!imageBase64 && !image_file) {
        message.warning('请先上传一张图片进行攻击实验');
        return; // 提前返回，避免后续错误
      }
      
      // 额外的数据有效性检查
      if (imageBase64 && typeof imageBase64 !== 'string') {
        message.error('图片数据格式错误，请重新上传');
        return;
      }
      
      // 图片大小检查（防止4K图片导致长时间计算）
      if (imageBase64 && imageBase64.length > 2000000) { // 约2MB base64
        message.warning('图片较大，攻击实验可能需要较长时间，建议使用较小的图片');
      }
      
      // 第三步：构造符合后端要求的payload结构，确保所有值都执行了Number()转换
      const validatedParams = {
        c: Number(otherParams.c || 0.1),
        kappa: Number(otherParams.kappa || 0.0),
        lr: Number(otherParams.lr || 0.01),
        max_iter: Number(otherParams.max_iter || 100),
        binary_search_steps: Number(otherParams.binary_search_steps || 9),
        targeted: Boolean(otherParams.targeted || false)
      };
      
      const payload = {
        image: imageBase64,
        model_name: selectedModel,
        params: validatedParams,
        // 添加初始分类数据，确保后端能返回对比结果
        original_class_name: initialPrediction?.class_name,
        original_confidence: initialPrediction?.confidence
      };
      
      // 调试日志 - 确认请求结构正确
      console.log('提交的完整请求载荷:', payload);
      console.log('参数类型检查:', {
        c: typeof validatedParams.c,
        kappa: typeof validatedParams.kappa,
        lr: typeof validatedParams.lr,
        max_iter: typeof validatedParams.max_iter,
        binary_search_steps: typeof validatedParams.binary_search_steps
      });
      
      // 清理之前的轮询
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
      setPollingActive(false);
      
      // 使用异步流程提交C&W攻击任务
      try {
        const taskResponse = await cwAttackService.runAsyncAttack(payload);
        const taskId = taskResponse.data?.task_id;
        
        if (!taskId) {
          throw new Error('未获取到任务ID');
        }
        
        console.log('异步任务已提交，任务ID:', taskId);
        message.info('攻击任务已提交，正在后台执行...');
        
        // 启动轮询获取结果
        startPolling(taskId);
        
      } catch (taskError) {
        console.error('提交异步任务失败:', taskError);
        
        // 识别Redis连接错误
        let errorMessage = '提交任务失败';
        if (taskError.message?.includes('Redis') || 
            taskError.message?.includes('retry limit') ||
            taskError.message?.includes('ECONNREFUSED') ||
            taskError.response?.data?.detail?.includes('Redis')) {
          errorMessage = '后端数据库连接失败，请确保Redis服务已启动';
          message.error(errorMessage, 5); // 显示5秒
        } else {
          errorMessage = taskError.response?.data?.detail || taskError.message || '提交任务失败';
          message.error(`提交任务失败: ${errorMessage}`);
        }
        
        setError(errorMessage);
      } finally {
        // 确保loading状态重置，防止按钮被永久禁用
        setLoading(false);
      }
    } catch (err) {
      console.error('Validate Failed:', err);
      
      // 防御性错误处理 - 检查err.response.data
      let errorMessage = '参数验证失败';
      if (err.response?.data) {
        errorMessage = safeRender(err.response.data, '参数配置错误');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // 显示具体错误信息
      message.error(errorMessage);
      setError(errorMessage);
    } finally {
      // 确保loading状态重置，防止按钮被永久禁用
      setLoading(false);
    }
  };

  // 移除 renderFormItem 函数，直接内联渲染

  const renderAnalysisReport = () => {
    // 首先检查result是否有效
    if (!result || !isValidResult(result)) {
      return (
        <Alert
          message="数据格式错误"
          description="攻击结果数据格式不正确，请检查参数配置后重试"
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      );
    }

    if (isDetection) {
      // YOLO Detection results
      return (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card 
            title={
              <Space>
                <CheckCircleFilled style={{ color: token.colorSuccess }} />
                <Text strong>目标检测安全审计报告</Text>
                <Tag color="blue">AI安全分析</Tag>
              </Space>
            }
          >
            <Row gutter={[24, 32]}>
              <Col span={24}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  {[
                    { key: 'original', title: '原始图像', img: result.original_image, label: '无标注', color: 'default' },
                    { key: 'original_det', title: '原始检测结果', img: result.original_detection, label: '原始状态', color: 'success' },
                    { key: 'noise', title: '对抗噪声', img: result.noise_image, label: '扰动热力图', color: 'processing' },
                    { key: 'adv_img', title: '对抗样本', img: result.adversarial_image, label: '攻击后(无框)', color: 'default' },
                    { key: 'adv_det', title: '对抗检测结果', img: result.adversarial_detection, label: '攻击后状态', color: 'error' }
                  ].map(item => (
                    <Card 
                      key={item.key}
                      size="small" 
                      title={<Text strong>{safeRender(item.title)}</Text>} 
                      extra={<Tag color={item.color}>{safeRender(item.label)}</Tag>}
                      style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        background: '#000', 
                        borderRadius: 4,
                        width: '100%',
                        aspectRatio: '1/1',
                        marginBottom: 16,
                        overflow: 'hidden'
                      }}>
                        <Image 
                          src={item.img?.startsWith('data:') ? item.img : `${API_BASE_URL}${item.img}`}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain' 
                          }}
                          preview={{ mask: <><EyeOutlined /> 点击放大</> }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8O+L"
                        />
                      </div>
                    </Card>
                  ))}
                </Space>
              </Col>
              <Col span={24}>
                <Card size="small" title="攻击效果统计">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic 
                        title="检测框数量变化" 
                        value={safeRender(result.detection_count_diff, 0)}
                        valueStyle={{ color: result.detection_count_diff > 0 ? token.colorError : token.colorSuccess }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="置信度下降" 
                        value={safeRender(result.confidence_drop, 0)}
                        suffix="%"
                        precision={2}
                        valueStyle={{ color: token.colorWarning }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="攻击成功率" 
                        value={safeRender(result.attack_success_rate, 0)}
                        suffix="%"
                        precision={1}
                        valueStyle={{ color: token.colorSuccess }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Card>
        </Space>
      );
    }

    // Classification results (ResNet etc.) - 专业的三栏对比布局
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* 核心对比区域 */}
        <Card 
          title={
            <Space>
              <CheckCircleFilled style={{ color: token.colorSuccess }} />
              <Text strong>C&W对抗攻击安全分析报告</Text>
              <Tag color="blue">专业级评估</Tag>
            </Space>
          }
        >
          {/* 三栏对比布局 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            {[
              { 
                key: 'original', 
                title: '原始图像', 
                img: result.original_image,
                class: safeRender(result.original_class),
                confidence: result.original_prediction?.confidence,
                color: 'success',
                stats: {
                  label: '原始预测',
                  value: safeRender(result.original_class),
                  confidence: result.original_prediction?.confidence
                }
              },
              { 
                key: 'noise', 
                title: '对抗扰动', 
                img: result.noise_image, 
                class: '扰动热力图',
                color: 'processing',
                stats: {
                  label: 'L2扰动强度',
                  value: safeRender(result.metadata?.l2_norm?.toFixed(4) || 'N/A'),
                  confidence: null
                }
              },
              { 
                key: 'adversarial', 
                title: '对抗样本', 
                img: result.adversarial_image,
                class: safeRender(result.adversarial_class),
                confidence: result.adversarial_prediction?.confidence,
                color: 'error',
                stats: {
                  label: '对抗预测',
                  value: safeRender(result.adversarial_class),
                  confidence: result.adversarial_prediction?.confidence
                }
              }
            ].map(item => (
              <Col xs={24} md={8} key={item.key}>
                <Card
                  size="small"
                  title={
                    <Space direction="vertical" size={0}>
                      <Text strong>{safeRender(item.title)}</Text>
                      <Tag color={item.color} size="small">{safeRender(item.class)}</Tag>
                    </Space>
                  }
                  style={{ 
                    background: '#fafafa',
                    borderRadius: 8,
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  bodyStyle={{ padding: '12px' }}
                >
                  {/* 图片和分类信息的垂直Flex容器 */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 12
                  }}>
                    {/* 图片展示 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      background: '#000', 
                      borderRadius: 4,
                      width: '100%',
                      aspectRatio: '1/1'
                    }}>
                      <Image 
                        src={item.img.startsWith('data:') ? item.img : `${API_BASE_URL}${item.img}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        preview={{ label: <><EyeOutlined /> 点击放大</> }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8O+L"
                      />
                    </div>
                    
                    {/* 分类信息条 */}
                    {item.key === 'original' && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        {result.original_prediction?.class_name || initialPrediction?.class_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Tag 
                              color="blue" 
                              style={{ 
                                fontSize: 13, 
                                padding: '2px 8px',
                                margin: 0
                              }}
                            >
                              {safeRender(result.original_prediction?.class_name || initialPrediction?.class_name)}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ({safeRender(((result.original_prediction?.confidence || initialPrediction?.confidence || 0) * 100).toFixed(2) + '%')})
                            </Text>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            等待识别...
                          </Text>
                        )}
                      </div>
                    )}
                    
                    {/* 对抗图像的分类信息条 */}
                    {item.key === 'adversarial' && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        {result.adversarial_prediction?.class_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Tag 
                              color="orange" 
                              style={{ 
                                fontSize: 13, 
                                padding: '2px 8px',
                                margin: 0
                              }}
                            >
                              {safeRender(result.adversarial_prediction.class_name)}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ({safeRender((result.adversarial_prediction.confidence * 100).toFixed(2) + '%')})
                            </Text>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            等待识别...
                          </Text>
                        )}
                      </div>
                    )}
                    
                    {/* 扰动图像的标签 */}
                    {item.key === 'noise' && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <Tag 
                          color="processing" 
                          style={{ 
                            fontSize: 13, 
                            padding: '2px 8px',
                            margin: 0
                          }}
                        >
                          扰动热力图
                        </Tag>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 详细分析数据 */}
        <Row gutter={16}>
          <Col span={16}>
            <Card size="small" title={<><AreaChartOutlined /> Top-5 分类置信度演变</>}>
              {result.confidence_chart && result.confidence_chart.labels.length > 0 ? (
                result.confidence_chart.labels.map((label, idx) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 12 }}>{safeRender(label)}</Text>
                      <Space size="small">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          原始: {safeRender(((result.confidence_chart.original[idx] || 0) * 100).toFixed(1) + '%')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          对抗: {safeRender(((result.confidence_chart.adversarial[idx] || 0) * 100).toFixed(1) + '%')}
                        </Text>
                      </Space>
                    </div>
                    <Progress 
                      percent={safeRender((result.confidence_chart.original[idx] || 0) * 100)} 
                      strokeColor={token.colorSuccess} 
                      showInfo={false} 
                      size="small"
                      style={{ marginBottom: 2 }}
                    />
                    <Progress 
                      percent={safeRender((result.confidence_chart.adversarial[idx] || 0) * 100)} 
                      strokeColor={token.colorError} 
                      showInfo={false} 
                      size="small"
                      style={{ marginBottom: 2 }}
                    />
                  </div>
                ))
              ) : (
                <Empty description="暂无置信度数据" />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="攻击性能指标">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic 
                  title="攻击状态" 
                  value={result.metadata?.success ? '成功' : '失败'} 
                  valueStyle={{ 
                    color: result.metadata?.success ? token.colorSuccess : token.colorError,
                    fontSize: 16
                  }}
                />
                <Statistic 
                  title="L2扰动强度" 
                  value={result.metadata?.l2_norm || 0} 
                  precision={4}
                  valueStyle={{ fontSize: 16 }}
                />
                <Statistic 
                  title="迭代次数" 
                  value={result.metadata?.iterations || 0} 
                  valueStyle={{ fontSize: 16 }}
                />
                <Statistic 
                  title="执行时间" 
                  value={result.metadata?.time_elapsed || 0} 
                  suffix="秒"
                  precision={2}
                  valueStyle={{ fontSize: 16 }}
                />
              </Space>
            </Card>
          </Col>
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
    <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item><Link to="/"><HomeOutlined /> 首页</Link></Breadcrumb.Item>
        <Breadcrumb.Item><Link to="/attacks"><ThunderboltOutlined /> 对抗攻击</Link></Breadcrumb.Item>
        <Breadcrumb.Item>C&W Attack</Breadcrumb.Item>
      </Breadcrumb>

      {/* 顶部：紧凑型实验控制 Header */}
      <Card 
        size="small" 
        style={{ 
          marginBottom: 20, 
          position: 'sticky', 
          top: 24, 
          zIndex: 100, 
          borderRadius: 12, 
          border: '1px solid #f0f0f0',
          background: '#fafafa'
        }}
        bodyStyle={{ padding: '12px 24px' }}
      >
        <Form 
          form={form} 
          layout="vertical"
          initialValues={{
            c: 0.1,
            kappa: 0.0,
            lr: 0.01,
            max_iter: 100,
            binary_search_steps: 9,
            targeted: false,
            model_name: 'resnet100_imagenet'
          }}
        >
          <Row gutter={16} align="bottom">
            {/* 核心选择：模型 */}
            <Col xs={24} sm={12} md={6} lg={5}>
              <Form.Item 
                label={<Text strong style={{ fontSize: 13 }}><DashboardOutlined /> 目标模型</Text>} 
                name="model_name"
                style={{ marginBottom: 8 }}
              >
                <Select 
                  placeholder="请选择模型" 
                  options={models.length > 0 ? models.map(model => ({
                    label: model.display_name || model.name,
                    value: model.name
                  })) : [
                    { label: 'ResNet100 (ImageNet)', value: 'resnet100_imagenet' },
                    { label: 'VGG16 (ImageNet)', value: 'vgg16_imagenet' }
                  ]}
                  onChange={setSelectedModel}
                  size="small"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            {/* C&W 核心参数横向平铺 */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Form.Item 
                label={
                  <Space size={4}>
                    <Text strong style={{ fontSize: 13 }}>权衡系数 c</Text>
                    <Tooltip title="平衡扰动大小和攻击成功率，推荐0.1-10">
                      <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                    </Tooltip>
                  </Space>
                }
                name="c"
                style={{ marginBottom: 8 }}
              >
                <NeonSlider 
                  min={0.01} 
                  max={100.0} 
                  step={0.01} 
                  label="" 
                  tooltip={{formatter: (value) => `c: ${value}`}}
                  style={{ margin: 0 }}
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3}>
              <Form.Item 
                label={
                  <Space size={4}>
                    <Text strong style={{ fontSize: 13 }}>置信度 κ</Text>
                    <Tooltip title="控制攻击的置信度，推荐0">
                      <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                    </Tooltip>
                  </Space>
                }
                name="kappa"
                style={{ marginBottom: 8 }}
              >
                <NeonSlider 
                  min={0.0} 
                  max={50.0} 
                  step={1.0} 
                  label="" 
                  tooltip={{formatter: (value) => `κ: ${value}`}}
                  style={{ margin: 0 }}
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3}>
              <Form.Item 
                label={
                  <Space size={4}>
                    <Text strong style={{ fontSize: 13 }}>学习率</Text>
                    <Tooltip title="Adam优化器学习率，推荐0.01">
                      <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                    </Tooltip>
                  </Space>
                }
                name="lr"
                style={{ marginBottom: 8 }}
              >
                <NeonSlider 
                  min={0.001} 
                  max={0.1} 
                  step={0.001} 
                  label="" 
                  tooltip={{formatter: (value) => `lr: ${value}`}}
                  style={{ margin: 0 }}
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3}>
              <Form.Item 
                label={
                  <Space size={4}>
                    <Text strong style={{ fontSize: 13 }}>迭代次数</Text>
                    <Tooltip title="每轮二分搜索的迭代次数，推荐100">
                      <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                    </Tooltip>
                  </Space>
                }
                name="max_iter"
                style={{ marginBottom: 8 }}
              >
                <NeonSlider 
                  min={10} 
                  max={500} 
                  step={10} 
                  label="" 
                  tooltip={{formatter: (value) => `iter: ${value}`}}
                  style={{ margin: 0 }}
                />
              </Form.Item>
            </Col>

            {/* 图片上传与预览区域 */}
            <Col xs={24} sm={12} md={6} lg={5}>
              <Form.Item 
                label={<Text strong style={{ fontSize: 13 }}><PictureOutlined /> 攻击图像</Text>} 
                name="image"
                style={{ marginBottom: 8 }}
              >
                <div style={{ position: 'relative' }}>
                  {form.getFieldValue('image_preview') ? (
                    // 已有图片时显示预览 - 重构为垂直Flex布局
                    <div style={{ 
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/9',
                      height: 120,
                      background: '#f5f5f5',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <Image
                        src={form.getFieldValue('image_preview')}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          borderRadius: 4 
                        }}
                        preview={false}
                      />
                      
                      {/* 分类标签 - 使用position absolute固定在图片底部 */}
                      {initialPrediction && (
                        <div style={{ 
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '6px 12px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 8
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 6,
                              flex: 1,
                              minWidth: 0
                            }}>
                              <Tag 
                                color="success" 
                                style={{ 
                                  fontSize: 10, 
                                  lineHeight: '12px',
                                  padding: '2px 6px',
                                  margin: 0,
                                  background: '#52c41a',
                                  borderColor: '#52c41a',
                                  color: '#fff',
                                  maxWidth: '120px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {safeRender(initialPrediction.class_name)}
                              </Tag>
                              <Text style={{ 
                                color: '#fff', 
                                fontSize: 11, 
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                {(initialPrediction.confidence * 100).toFixed(1)}%
                              </Text>
                            </div>
                            
                            {/* 修改按钮 */}
                            <Button 
                              type="link" 
                              size="small"
                              style={{ 
                                color: '#fff', 
                                padding: '0 4px', 
                                height: 'auto',
                                fontSize: 11,
                                flexShrink: 0
                              }}
                              onClick={async () => {
                                // 触发重新上传
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    try {
                                      console.log('开始重新上传文件:', {
                                        filename: file.name,
                                        size: file.size,
                                        type: file.type
                                      });
                                      
                                      // 直接触发ImageUploader的重新上传逻辑
                                      // 清除当前预览，触发ImageUploader的上传状态
                                      form.setFieldsValue({ 
                                        image_preview: null,
                                        image: null
                                      });
                                      setInitialPrediction(null);
                                      
                                      // 延迟触发文件选择，确保状态清理完成
                                      setTimeout(() => {
                                        input.click();
                                      }, 100);
                                      
                                    } catch (err) {
                                      console.error('重新上传失败:', err);
                                      
                                      let errorMessage = '图片重新上传失败，请重试';
                                      if (err.response) {
                                        if (err.response.status === 413) {
                                          errorMessage = '文件太大，请选择小于10MB的图片';
                                        } else if (err.response.status === 415) {
                                          errorMessage = '不支持的文件格式，请使用JPG、PNG、GIF或BMP格式';
                                        } else if (err.response.status === 401) {
                                          errorMessage = '未授权，请重新登录';
                                        } else {
                                          errorMessage = err.response.data?.detail || '服务器错误，请稍后重试';
                                        }
                                      } else if (err.code === 'NETWORK_ERROR') {
                                        errorMessage = '网络连接失败，请检查网络后重试';
                                      }
                                      
                                      setError(errorMessage);
                                      message.error(errorMessage);
                                    }
                                  }
                                };
                                input.click();
                              }}
                            >
                              修改
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 无图片时显示上传组件
                    <ImageUploader
                      value={form.getFieldValue('image_preview')}
                      onChange={async (base64) => {
                        try {
                          // 第一步：设置预览
                          form.setFieldsValue({ 
                            image_preview: base64
                          });
                          
                          // 第二步：立即进行分类预测并持久化结果
                          const prediction = await classifyImage(base64, selectedModel);
                          setInitialPrediction(prediction); // 持久化初始分类结果
                          
                          // 第三步：上传文件到服务器（后端会处理base64）
                          console.log('图片预览生成成功，等待攻击时上传');
                          
                          // 显示成功提示
                          message.success('图片预览生成成功');
                          
                        } catch (err) {
                          console.error('图片处理失败:', err);
                          
                          // 根据错误类型显示不同的错误信息
                          let errorMessage = '图片处理失败，请重试';
                          if (err.response) {
                            // HTTP错误
                            if (err.response.status === 413) {
                              errorMessage = '文件太大，请选择小于10MB的图片';
                            } else if (err.response.status === 415) {
                              errorMessage = '不支持的文件格式，请使用JPG、PNG、GIF或BMP格式';
                            } else if (err.response.status === 401) {
                              errorMessage = '未授权，请重新登录';
                            } else {
                              errorMessage = err.response.data?.detail || '服务器错误，请稍后重试';
                            }
                          } else if (err.code === 'NETWORK_ERROR') {
                            errorMessage = '网络连接失败，请检查网络后重试';
                          } else if (err.name === 'AbortError') {
                            errorMessage = '上传超时，请重试';
                          }
                          
                          setError(errorMessage);
                          message.error(errorMessage);
                          
                          // 处理失败时清理预览
                          form.setFieldsValue({ 
                            image_preview: null,
                            image: null
                          });
                          setInitialPrediction(null);
                        }
                      }}
                      loading={isClassifying}
                      previewHeight={120}
                    >
                      {/* 外部注入分类标签 */}
                      {initialPrediction && (
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Tag 
                              color="blue" 
                              style={{ 
                                fontSize: 11, 
                                padding: '2px 6px',
                                margin: 0,
                                background: '#1890ff',
                                borderColor: '#1890ff',
                                color: '#fff'
                              }}
                            >
                              🏷️ {safeRender(initialPrediction.class_name)}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              ({safeRender((initialPrediction.confidence * 100).toFixed(2) + '%')})
                            </Text>
                          </div>
                        </div>
                      )}
                    </ImageUploader>
                  )}
                </div>
              </Form.Item>
              
              {/* 运行按钮 */}
              <Button 
                type="primary" 
                block 
                size="middle"
                icon={<RocketOutlined />}
                loading={loading}
                disabled={loading || (!form.getFieldValue('image_preview') && !form.getFieldValue('image'))}
                onClick={onRun}
                style={{ 
                  height: 36, 
                  borderRadius: 6, 
                  fontWeight: 'bold',
                  boxShadow: loading ? 'none' : '0 2px 8px rgba(24, 144, 255, 0.3)'
                }}
              >
                {loading ? '实验运行中...' : '运行实验'}
              </Button>
            </Col>
          </Row>

          {/* 高级参数折叠区域 */}
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Collapse 
                ghost 
                size="small"
                style={{ background: 'transparent' }}
                items={[
                  {
                    key: 'advanced',
                    label: (
                      <Space>
                        <SettingOutlined style={{ fontSize: 12 }} />
                        <Text strong style={{ fontSize: 12 }}>高级参数</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          二分搜索步数、定向攻击等
                        </Text>
                      </Space>
                    ),
                    children: (
                      <Row gutter={16} align="middle">
                        <Col xs={12} md={6}>
                          <Form.Item 
                            label={
                              <Space size={4}>
                                <Text strong style={{ fontSize: 12 }}>二分搜索步数</Text>
                                <Tooltip title="搜索最优c值的步数，推荐9">
                                  <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 11 }} />
                                </Tooltip>
                              </Space>
                            }
                            name="binary_search_steps"
                            style={{ marginBottom: 4 }}
                          >
                            <NeonSlider 
                              min={1} 
                              max={20} 
                              step={1} 
                              label="" 
                              style={{ margin: 0 }}
                            />
                          </Form.Item>
                        </Col>
                        
                        <Col xs={12} md={6}>
                          <Form.Item 
                            label={
                              <Space size={4}>
                                <Text strong style={{ fontSize: 12 }}>定向攻击</Text>
                                <Tooltip title="开启后攻击到指定类别">
                                  <InfoCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 11 }} />
                                </Tooltip>
                              </Space>
                            }
                            name="targeted"
                            valuePropName="checked"
                            style={{ marginBottom: 4 }}
                          >
                            <Switch 
                              checkedChildren="开" 
                              unCheckedChildren="关"
                              size="small"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    )
                  }
                ]}
              />
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 下方：结果展示大舞台 */}
      <Row gutter={24}>
        <Col span={24}>
          {loading ? (
            <Card style={{ textAlign: 'center', padding: '80px 0', borderRadius: 12 }}>
              <Spin size="large" tip={
                pollingActive 
                  ? `攻击任务执行中... ${localProgress}% (任务ID: ${currentTaskId?.substring(0, 8)}...)`
                  : `正在生成对抗样本... ${localProgress}%`
              } />
              <Progress 
                percent={localProgress} 
                status="active" 
                style={{ maxWidth: 500, marginTop: 20 }} 
                strokeColor={{
                  '0%': token.colorPrimary,
                  '100%': token.colorSuccess,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {pollingActive 
                    ? 'AI安全对抗攻击正在后台执行，请耐心等待...'
                    : 'AI安全实验正在进行中，请稍候...'}
                </Text>
              </div>
            </Card>
          ) : error ? (
            <Alert
              message="实验执行失败"
              description={
                <div>
                  <div>{safeRender(error, '未知错误')}</div>
                  {error?.response?.data && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      <strong>错误详情:</strong> {safeRender(error.response.data)}
                    </div>
                  )}
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: 24, borderRadius: 8 }}
              action={
                <Button size="small" type="primary" onClick={() => setError(null)}>
                  重试
                </Button>
              }
            />
          ) : result ? (
            renderAnalysisReport() 
          ) : (
            <Card style={{ 
              minHeight: 500, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 12
            }}>
              <div style={{ textAlign: 'center' }}>
                {form.getFieldValue('image_preview') ? (
                  // 有图片预览时显示大图
                  <div>
                    <Image
                      src={form.getFieldValue('image_preview')}
                      style={{ 
                        maxHeight: 400, 
                        maxWidth: '100%',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }}
                      preview={true}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Tag color="success" icon={<CheckCircleFilled />} style={{ fontSize: 14, padding: '4px 12px' }}>
                        图片已就绪，可开始攻击
                      </Tag>
                    </div>
                  </div>
                ) : (
                  // 无图片时显示空状态
                  <Empty
                    image={<PictureOutlined style={{ fontSize: 100, color: token.colorTextQuaternary }} />}
                    imageStyle={{ height: 100 }}
                    description={
                      <Space direction="vertical" align="center" size="middle">
                        <Text type="secondary" style={{ fontSize: 18, fontWeight: 500 }}>
                          AI安全实验台准备就绪
                        </Text>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          在顶部配置攻击参数并上传图片后点击"运行实验"
                        </Text>
                        <div style={{ marginTop: 20 }}>
                          <Tag color="blue" icon={<SafetyOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>C&W Attack</Tag>
                          <Tag color="green" icon={<TrophyOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>专业级对抗攻击</Tag>
                        </div>
                      </Space>
                    }
                  />
                )}
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </Content>
  );
};

export default AttackLab;
