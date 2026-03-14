/**
 * 星河智安 (XingHe ZhiAn) - React应用入口
 * AI安全攻击可视化平台前端应用
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import App from './App';
import './index.css';

// 设置dayjs中文语言
dayjs.locale('zh-cn');

// Ant Design主题配置
const theme = {
  token: {
    colorPrimary: '#1E6DF2',
    borderRadius: 8,
    wireframe: false,
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider 
        locale={zhCN}
        theme={theme}
      >
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
