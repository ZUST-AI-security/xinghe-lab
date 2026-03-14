/**
 * 星河智安 (XingHe ZhiAn) - Dashboard数据钩子
 * 提供Dashboard页面所需的模拟数据
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useDashboardData = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    algorithms: { count: 4, trend: '+2', trendText: '本月新增' },
    models: { 
      count: 2, 
      status: '在线', 
      list: ['ResNet100', 'YOLOv8'] 
    },
    runsToday: { count: 128, growth: '+23%', comparison: '较昨日' },
    successRate: { rate: 0.76, best: 'PGD', label: '最佳算法' }
  });
  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      time: '今天 14:23',
      algorithm: 'C&W攻击',
      model: 'ResNet100',
      success: true,
      confidence: 0.85
    },
    {
      id: 2,
      time: '今天 11:05',
      algorithm: 'FGSM攻击',
      model: 'YOLOv8',
      success: false,
      confidence: 0.42
    },
    {
      id: 3,
      time: '昨天 16:30',
      algorithm: 'PGD攻击',
      model: 'ResNet100',
      success: true,
      confidence: 0.92
    },
    {
      id: 4,
      time: '昨天 09:15',
      algorithm: 'DeepFool攻击',
      model: 'YOLOv8',
      success: true,
      confidence: 0.78
    },
    {
      id: 5,
      time: '昨天 14:45',
      algorithm: 'C&W攻击',
      model: 'ResNet100',
      success: true,
      confidence: 0.88
    }
  ]);
  const [algorithmUsage, setAlgorithmUsage] = useState([
    { name: 'C&W', value: 35, color: '#1E6DF2' },
    { name: 'FGSM', value: 25, color: '#7B2EDA' },
    { name: 'PGD', value: 30, color: '#00B8D9' },
    { name: 'DeepFool', value: 10, color: '#10B981' }
  ]);
  const [gpuLoad, setGpuLoad] = useState(45);
  const [queueLength, setQueueLength] = useState(3);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    // 模拟实时数据更新
    const interval = setInterval(() => {
      setGpuLoad(prev => {
        const change = Math.random() * 10 - 5;
        const newValue = Math.max(0, Math.min(100, prev + change));
        return Math.round(newValue);
      });
      setQueueLength(prev => {
        const change = Math.random() > 0.7 ? 1 : Math.random() > 0.5 ? -1 : 0;
        return Math.max(0, prev + change);
      });
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return {
    loading,
    stats,
    recentActivities,
    algorithmUsage,
    gpuLoad,
    queueLength
  };
};
