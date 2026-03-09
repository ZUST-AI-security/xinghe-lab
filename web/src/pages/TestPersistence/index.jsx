import React, { useEffect } from 'react';
import { 
  Typography, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  DatePicker, 
  Slider, 
  Card, 
  Alert, 
  message, 
  Space,
  Table,
  Tag,
  Row,
  Col
} from 'antd';
import { SaveOutlined, DeleteOutlined, BugOutlined, RocketOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTestStore } from '../../hooks/useTestStore';

const { Title, Paragraph, Text } = Typography;

const TestPersistence = () => {
  const [form] = Form.useForm();
  
  // 从 Zustand Store 中解构状态和操作
  const { 
    savedRecords, 
    lastFormState, 
    addRecord, 
    setLastFormState, 
    clearAll 
  } = useTestStore();

  // 挂载时恢复表单状态
  useEffect(() => {
    if (lastFormState) {
      const { date, ...rest } = lastFormState;
      form.setFieldsValue({
        ...rest,
        date: date ? dayjs(date) : null
      });
    }
  }, [form, lastFormState]);

  const onFinish = (values) => {
    // 转换日期以便持久化（Zustand persist 会处理 JSON 序列化）
    const record = {
      ...values,
      date: values.date ? values.date.toISOString() : null
    };
    
    addRecord(record);
    message.success('已通过 Zustand 自动持久化保存记录！');
  };

  const handleClear = () => {
    clearAll();
    form.resetFields();
    message.info('Zustand 持久化数据已全部清空');
  };

  const handleFormChange = () => {
    const currentValues = form.getFieldsValue();
    // 实时同步到 Store，Zustand 会自动写入 localStorage
    setLastFormState(currentValues);
  };

  const columns = [
    { title: '实验名称', dataIndex: 'experimentName', key: 'experimentName' },
    { title: '负责人', dataIndex: 'owner', key: 'owner' },
    { 
      title: '难度', 
      dataIndex: 'difficulty', 
      key: 'difficulty',
      render: (val) => <Tag color={val > 70 ? 'red' : 'green'}>{val}</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (val) => <Tag color={val ? 'blue' : 'gray'}>{val ? '已激活' : '禁用'}</Tag>
    },
    { title: '保存时间', dataIndex: 'timestamp', key: 'timestamp' },
  ];

  return (
    <div style={{ padding: '24px 40px' }}>
      <Title level={2}><RocketOutlined /> Zustand 持久化架构测试</Title>
      <Paragraph type="secondary">
        已将原生 localStorage 升级为 <b>Zustand + Persist Middleware</b>。
        这种方案完全消灭了手动 <code>setItem/getItem</code>，让状态管理像普通对象操作一样简单。
      </Paragraph>

      <Alert 
        title="技术栈说明" 
        description={
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><b>Zustand:</b> 轻量级、无模板的状态库。</li>
            <li><b>Persist:</b> 声明式中间件，自动同步到浏览器的本地存储。</li>
            <li><b>Ant Design 6.x:</b> 最新版本 UI 组件。</li>
          </ul>
        } 
        type="success" 
        showIcon 
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={24}>
        <Col xs={24} lg={10}>
          <Card title="实验配置 (实时持久化)" variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={handleFormChange}
              initialValues={{ status: true, difficulty: 50 }}
            >
              <Form.Item 
                label="实验名称" 
                name="experimentName" 
                rules={[{ required: true, message: '请输入实验名称' }]}
              >
                <Input placeholder="输入过程中自动保存..." />
              </Form.Item>

              <Form.Item 
                label="负责人" 
                name="owner" 
                rules={[{ required: true, message: '请选择负责人' }]}
              >
                <Select placeholder="请选择负责人">
                  <Select.Option value="Alpha">Alpha 博士</Select.Option>
                  <Select.Option value="Beta">Beta 教授</Select.Option>
                  <Select.Option value="Gamma">Gamma 研究员</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="实验难度" name="difficulty">
                <Slider marks={{ 0: '低', 50: '中', 100: '高' }} />
              </Form.Item>

              <Form.Item label="立即激活" name="status" valuePropName="checked">
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>

              <Form.Item label="预约时间" name="date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    提交并持久化记录
                  </Button>
                  <Button danger icon={<DeleteOutlined />} onClick={handleClear}>
                    重置所有状态
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="持久化数据列表 (从 Store 读取)" variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <Table 
              dataSource={savedRecords} 
              columns={columns} 
              rowKey="id" 
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TestPersistence;
