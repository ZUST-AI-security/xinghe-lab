import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { MinusCircleOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';

import { submitCWAttack, getAttackTaskStatus as getCWTaskStatus } from '../../api/attacks/cw';
import { submitFGSMAttack, getAttackTaskStatus as getFGSMTaskStatus } from '../../api/attacks/fgsm';
import { submitPGDAttack, getAttackTaskStatus as getPGDTaskStatus } from '../../api/attacks/pgd';
import { submitIFGSMAttack, getAttackTaskStatus as getIFGSMTaskStatus } from '../../api/attacks/ifgsm';
import { submitDeepFoolAttack, getAttackTaskStatus as getDeepFoolTaskStatus } from '../../api/attacks/deepfool';

const { Title, Text, Paragraph } = Typography;

const algorithmConfig = {
  fgsm: {
    label: 'FGSM',
    submit: submitFGSMAttack,
    poll: getFGSMTaskStatus,
    params: { epsilon: 0.03, targeted: false },
  },
  ifgsm: {
    label: 'I-FGSM',
    submit: submitIFGSMAttack,
    poll: getIFGSMTaskStatus,
    params: { epsilon: 0.03, alpha: 0.007, num_iter: 10, targeted: false },
  },
  pgd: {
    label: 'PGD',
    submit: submitPGDAttack,
    poll: getPGDTaskStatus,
    params: { epsilon: 0.03, alpha: 0.01, num_iter: 40, targeted: false, random_start: true, loss_type: 'ce', norm: 'linf' },
  },
  cw: {
    label: 'C&W',
    submit: submitCWAttack,
    poll: getCWTaskStatus,
    params: { c: 0.1, kappa: 0, lr: 0.01, max_iter: 500, binary_search_steps: 5, init_const: 0.01, targeted: false, abort_early: true, early_stop_iters: 50 },
  },
  deepfool: {
    label: 'DeepFool',
    submit: submitDeepFoolAttack,
    poll: getDeepFoolTaskStatus,
    params: { overshoot: 0.02, max_iter: 50, num_classes: 10 },
  },
};

const initialPanelState = (algorithm) => ({
  algorithm,
  paramsText: JSON.stringify(algorithmConfig[algorithm].params, null, 2),
  taskId: null,
  status: 'idle',
  progress: 0,
  message: '',
  result: null,
});

const formatPrediction = (prediction) => {
  if (!prediction) {
    return '-';
  }
  if (typeof prediction === 'string' || typeof prediction === 'number') {
    return String(prediction);
  }
  if (typeof prediction === 'object') {
    if (prediction.class_name) {
      return String(prediction.class_name);
    }
    if (prediction.label) {
      return String(prediction.label);
    }
  }
  return '-';
};

const ResultPreview = ({ title, panel, image }) => (
  <Card title={title} size="small" style={{ borderRadius: 16 }}>
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap>
        <Tag color="blue">{algorithmConfig[panel.algorithm].label}</Tag>
        <Tag color={panel.status === 'completed' ? 'green' : panel.status === 'failed' ? 'red' : 'gold'}>
          {panel.status}
        </Tag>
      </Space>
      {panel.status !== 'idle' && (
        <>
          <Progress percent={panel.progress} status={panel.status === 'failed' ? 'exception' : 'active'} />
          <Text type="secondary">{panel.message || '等待任务更新...'}</Text>
        </>
      )}
      {panel.result && (
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <img
              src={panel.result.original_image || image}
              alt="original"
              style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <img src={panel.result.adversarial_image} alt="adversarial" style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }} />
          </Col>
          <Col span={24}>
            <Paragraph style={{ marginBottom: 0 }}>
              原预测: <Text strong>{formatPrediction(panel.result.metadata?.original_prediction)}</Text>
              <br />
              对抗预测: <Text strong>{formatPrediction(panel.result.metadata?.adversarial_prediction)}</Text>
            </Paragraph>
          </Col>
        </Row>
      )}
    </Space>
  </Card>
);

const CompareMode = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [panels, setPanels] = useState([
    initialPanelState('fgsm'),
    initialPanelState('cw'),
  ]);
  const intervalsRef = useRef([]);

  const clearPolling = () => {
    intervalsRef.current.forEach((timer) => clearInterval(timer));
    intervalsRef.current = [];
  };

  useEffect(() => () => clearPolling(), []);

  const parseParams = (panel) => {
    try {
      return JSON.parse(panel.paramsText);
    } catch {
      throw new Error(`${algorithmConfig[panel.algorithm].label} 参数 JSON 无法解析`);
    }
  };

  const updatePanel = (index, updater) => {
    setPanels((prev) => {
      const newPanels = [...prev];
      newPanels[index] = updater(newPanels[index]);
      return newPanels;
    });
  };

  const submitOne = async (index, panel) => {
    const { submit, poll } = algorithmConfig[panel.algorithm];
    const params = parseParams(panel);
    const response = await submit({
      image: imageUrl,
      model_name: 'resnet100_imagenet',
      params,
    });
    updatePanel(index, (prev) => ({
      ...prev,
      taskId: response.task_id,
      status: 'pending',
      progress: 0,
      message: '任务已提交',
      result: null,
    }));

    const timer = setInterval(async () => {
      try {
        const task = await poll(response.task_id);
        const normalizedResult = task.status === 'completed' && task.result
          ? {
              ...task.result,
              metadata:
                task.result.metadata && typeof task.result.metadata === 'object'
                  ? task.result.metadata
                  : {},
            }
          : null;
        updatePanel(index, (prev) => ({
          ...prev,
          status: task.status,
          progress: task.progress || (task.status === 'completed' ? 100 : prev.progress),
          message: task.message || task.error || '',
          result: task.status === 'completed' ? normalizedResult : prev.result,
        }));
        if (task.status === 'completed' || task.status === 'failed') {
          clearInterval(timer);
        }
      } catch (error) {
        clearInterval(timer);
        updatePanel(index, (prev) => ({
          ...prev,
          status: 'failed',
          message: error.message || '轮询失败',
        }));
      }
    }, 2000);

    intervalsRef.current.push(timer);
  };

  const handleRun = async () => {
    if (!imageUrl) {
      message.warning('请先上传图片');
      return;
    }
    clearPolling();
    try {
      await Promise.all(panels.map((panel, index) => submitOne(index, panel)));
      message.success(`${panels.length} 个任务已提交，可以在同一页面等待结果对比`);
    } catch (error) {
      message.error(error.message || '任务提交失败');
    }
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const comparisonSummary = useMemo(() => {
    if (panels.length === 0 || !panels.every((p) => p.result)) {
      return null;
    }
    return [
      {
        key: 'algorithm',
        label: '算法',
        render: (panel) => algorithmConfig[panel.algorithm].label,
      },
      {
        key: 'success',
        label: '成功',
        render: (panel) => (panel.result.success ? '是' : '否'),
      },
      {
        key: 'time',
        label: '耗时',
        render: (panel) => `${(panel.result.time_elapsed || 0).toFixed(2)} s`,
      },
      {
        key: 'prediction',
        label: '对抗预测',
        render: (panel) => formatPrediction(panel.result.metadata?.adversarial_prediction),
      },
    ];
  }, [panels]);

  const resetAll = () => {
    clearPolling();
    setImageUrl('');
    setPanels([initialPanelState('fgsm'), initialPanelState('cw')]);
  };

  const addPanel = () => {
    const availableAlgorithms = Object.keys(algorithmConfig);
    const usedAlgorithms = panels.map((p) => p.algorithm);
    const nextAlgorithm = availableAlgorithms.find((algo) => !usedAlgorithms.includes(algo)) || availableAlgorithms[0];
    setPanels((prev) => [...prev, initialPanelState(nextAlgorithm)]);
  };

  const removePanel = (index) => {
    if (panels.length <= 1) {
      message.warning('至少保留一个对比任务');
      return;
    }
    clearPolling();
    setPanels((prev) => prev.filter((_, i) => i !== index));
  };

  const renderConfigPanel = (title, panel, index) => (
    <Card
      title={title}
      style={{ borderRadius: 18 }}
      extra={
        panels.length > 1 && (
          <Button
            type="text"
            danger
            icon={<MinusCircleOutlined />}
            onClick={() => removePanel(index)}
            size="small"
          >
            移除
          </Button>
        )
      }
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Select
          value={panel.algorithm}
          options={Object.entries(algorithmConfig).map(([value, item]) => ({ value, label: item.label }))}
          onChange={(value) => updatePanel(index, () => initialPanelState(value))}
        />
        <Input.TextArea
          rows={10}
          value={panel.paramsText}
          onChange={(event) => updatePanel(index, (prev) => ({ ...prev, paramsText: event.target.value }))}
        />
      </Space>
    </Card>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card style={{ borderRadius: 20 }}>
        <Title level={3} style={{ marginTop: 0 }}>对比模式</Title>
        <Paragraph style={{ marginBottom: 12 }}>
          同时提交多个攻击任务，在同一个界面查看进度和结果，方便比较不同算法或不同参数的输出。
        </Paragraph>
        <Space wrap>
          <Upload beforeUpload={handleUpload} showUploadList={false}>
            <Button icon={<UploadOutlined />}>上传图片</Button>
          </Upload>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun}>
            同时提交 {panels.length} 个任务
          </Button>
          <Button icon={<PlusOutlined />} onClick={addPanel}>添加对比</Button>
          <Button icon={<ReloadOutlined />} onClick={resetAll}>重置</Button>
        </Space>
        {imageUrl && (
          <div style={{ marginTop: 16 }}>
            <img src={imageUrl} alt="upload" style={{ maxWidth: 220, borderRadius: 14, border: '1px solid #e5e7eb' }} />
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        {panels.map((panel, index) => (
          <Col xs={24} xl={12} key={index}>
            {renderConfigPanel(`任务 ${index + 1}`, panel, index)}
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {panels.map((panel, index) => (
          <Col xs={24} xl={12} key={index}>
            <ResultPreview title={`任务 ${index + 1} 结果`} panel={panel} image={imageUrl} />
          </Col>
        ))}
      </Row>

      {comparisonSummary && (
        <Card title="结果对比摘要" style={{ borderRadius: 20 }}>
          <Table
            dataSource={comparisonSummary}
            pagination={false}
            size="small"
            columns={[
              {
                title: '指标',
                dataIndex: 'label',
                key: 'label',
                width: 120,
              },
              ...panels.map((panel, index) => ({
                title: algorithmConfig[panel.algorithm].label,
                key: index,
                render: (_, record) => record.render(panel),
              })),
            ]}
          />
        </Card>
      )}
    </Space>
  );
};

export default CompareMode;
