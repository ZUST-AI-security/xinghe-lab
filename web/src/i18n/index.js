import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      welcome: "欢迎回来，{{username}}",
      date: "YYYY年MM月DD日",
      stats: {
        algorithms: "可用算法",
        models: "可用模型",
        runsToday: "今日运行",
        successRate: "攻击成功率",
        trend: "本月新增",
        vsYesterday: "较昨日",
        bestAlgorithm: "最佳算法",
        online: "在线"
      },
      quickStart: {
        title: "快速开始",
        classes: "1000类",
        classes2: "80类",
        classification: "图像分类攻击",
        detection: "目标检测攻击",
        classificationDesc: "针对分类模型的对抗样本生成",
        detectionDesc: "针对检测模型的对抗补丁攻击",
        start: "开始实验",
        comingSoon: "敬请期待",
        inDevelopment: "开发中"
      },
      recent: "近期活动",
      explore: "探索更多",
      algorithms: "算法库",
      models: "模型库",
      docs: "开发文档",
      community: "研究社区",
      footer: "© 2026 星河智安 · AI安全研究平台",
      today: "今天",
      yesterday: "昨天",
      gpuLoad: "GPU负载 {{load}} · 队列 {{queue}}",
      morning: "早上好",
      afternoon: "下午好",
      evening: "晚上好",
      night: "晚上好",
      high: "高",
      medium: "中", 
      low: "低",
      busy: "繁忙",
      normal: "正常",
      researcher: "研究员",
      profile: "个人设置",
      logout: "退出登录"
    }
  },
  en: {
    translation: {
      welcome: "Welcome back, {{username}}",
      date: "MM/DD/YYYY",
      stats: {
        algorithms: "Algorithms",
        models: "Models",
        runsToday: "Today's Runs",
        successRate: "Success Rate",
        trend: "this month",
        vsYesterday: "vs yesterday",
        bestAlgorithm: "best algorithm",
        online: "online"
      },
      quickStart: {
        title: "Quick Start",
        classes: "1000 classes",
        classes2: "80 classes",
        classification: "Image Classification Attack",
        detection: "Object Detection Attack",
        classificationDesc: "Adversarial example generation for classification models",
        detectionDesc: "Adversarial patch attacks for detection models",
        start: "Start Experiment",
        comingSoon: "Coming Soon",
        inDevelopment: "In Development"
      },
      recent: "Recent Activity",
      explore: "Explore",
      algorithms: "Algorithms",
      models: "Models",
      docs: "Documentation",
      community: "Community",
      footer: "© 2026 XingHe ZhiAn · AI Security Research Platform",
      today: "Today",
      yesterday: "Yesterday",
      gpuLoad: "GPU Load {{load}} · Queue {{queue}}",
      morning: "Good Morning",
      afternoon: "Good Afternoon",
      evening: "Good Evening",
      night: "Good Night",
      high: "High",
      medium: "Medium", 
      low: "Low",
      busy: "Busy",
      normal: "Normal",
      researcher: "Researcher",
      profile: "Profile Settings",
      logout: "Logout"
    }
  }
};

// 初始化i18n - 仅支持中文
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 强制中文
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  })
  .then(() => {
    console.log('i18n initialized successfully - Chinese only');
    // 确保localStorage设置为中文
    localStorage.setItem('language', 'zh');
  })
  .catch(error => {
    console.error('i18n initialization failed:', error);
  });

export default i18n;
