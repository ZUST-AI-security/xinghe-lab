import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import App from './App';
import './index.css';

dayjs.locale('zh-cn');

const theme = {
  cssVar: true,
  token: {
    colorPrimary: '#1677ff',
    colorInfo: '#1677ff',
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#dc2626',
    colorBgBase: '#f3f6fb',
    colorBgLayout: '#f3f6fb',
    colorBgContainer: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#d9e2ef',
    colorBorderSecondary: '#e7edf5',
    fontFamily: "'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: 14,
    borderRadiusLG: 20,
    boxShadowSecondary: '0 12px 32px rgba(15, 23, 42, 0.08)',
    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: '#f3f6fb',
      headerBg: 'rgba(255,255,255,0.92)',
      siderBg: '#0f172a',
    },
    Menu: {
      itemBg: '#0f172a',
      itemColor: 'rgba(226, 232, 240, 0.84)',
      itemHoverBg: 'rgba(255,255,255,0.08)',
      itemHoverColor: '#ffffff',
      itemSelectedBg: '#1677ff',
      itemSelectedColor: '#ffffff',
      subMenuItemBg: 'transparent',
      darkItemBg: '#0f172a',
      darkSubMenuItemBg: '#0f172a',
    },
    Card: {
      colorBorderSecondary: '#e7edf5',
      boxShadowTertiary: '0 8px 24px rgba(15, 23, 42, 0.06)',
    },
    Button: {
      borderRadius: 12,
      controlHeight: 40,
    },
    Input: {
      hoverBorderColor: '#1677ff',
      activeBorderColor: '#1677ff',
    },
    Select: {
      optionSelectedBg: '#e8f1ff',
    },
    Table: {
      headerBg: '#f8fbff',
      headerColor: '#334155',
      borderColor: '#e7edf5',
    },
    Tag: {
      borderRadiusSM: 999,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={zhCN} theme={theme}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
