import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Spin, Empty, Typography, message, Modal } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

const { Title } = Typography;

const TaskHistory = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);

    const fetchHistory = async (page = 1, size = 10) => {
        setLoading(true);
        try {
            const res = await api.get('/api/v1/attacks/tasks/history', { params: { page, size } });
            setData(res.data.items || []);
            setPagination({
                current: res.data.page,
                pageSize: res.data.size,
                total: res.data.total
            });
        } catch (error) {
            message.error('获取任务历史失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(pagination.current, pagination.pageSize);
    }, []);

    const handleTableChange = (newPagination) => {
        fetchHistory(newPagination.current, newPagination.pageSize);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '算法',
            dataIndex: 'algorithm_name',
            key: 'algorithm_name',
            render: (text) => <Tag color="blue">{text.toUpperCase()}</Tag>
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colorMap = {
                    'success': 'green',
                    'failed': 'red',
                    'running': 'cyan',
                    'pending': 'gold'
                };
                return <Tag color={colorMap[status] || 'default'}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => new Date(text).toLocaleString()
        },
        {
            title: '完成时间',
            dataIndex: 'completed_at',
            key: 'completed_at',
            render: (text) => text ? new Date(text).toLocaleString() : '-'
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={() => {
                        setCurrentRecord(record);
                        setDetailModalVisible(true);
                    }}
                >
                    查看结果
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', minHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>我的算法请求记录</Title>
                <Button 
                    icon={<ReloadOutlined />} 
                    onClick={() => fetchHistory(pagination.current, pagination.pageSize)}
                    loading={loading}
                >
                    刷新
                </Button>
            </div>

            <Table 
                columns={columns} 
                dataSource={data} 
                rowKey="id"
                pagination={pagination}
                loading={loading}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description="暂无请求记录" /> }}
            />

            <Modal
                title={`任务详情 - ${currentRecord?.algorithm_name?.toUpperCase()}`}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>
                ]}
                width={800}
            >
                {currentRecord && (
                    <div>
                        <p><strong>状态：</strong> {currentRecord.status}</p>
                        {currentRecord.status === 'success' && currentRecord.result && (
                            <div>
                                <p><strong>运行时长：</strong> {currentRecord.result.time_elapsed?.toFixed(2)} 秒</p>
                                <p><strong>输出目录：</strong> {currentRecord.result.output_dir}</p>
                                <h4>预测变更</h4>
                                <ul>
                                    <li>原预测：{currentRecord.result.metadata?.original_prediction}</li>
                                    <li>对抗预测：{currentRecord.result.metadata?.adversarial_prediction}</li>
                                </ul>
                                <h4>超参数</h4>
                                <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {JSON.stringify(currentRecord.result.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                        {currentRecord.status === 'failed' && (
                            <div style={{ color: 'red' }}>
                                <p><strong>错误信息：</strong></p>
                                <pre style={{ background: '#fff1f0', padding: '12px', borderRadius: '4px' }}>
                                    {currentRecord.result?.error || '未知错误'}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TaskHistory;
