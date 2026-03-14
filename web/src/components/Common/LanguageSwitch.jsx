/**
 * 星河智安 (XingHe ZhiAn) - 语言切换组件
 * 支持中英文双语切换
 */

import React from 'react';
import { Segmented } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitch.module.less';

const LanguageSwitch = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (value) => {
    console.log('Language switch clicked:', value);
    console.log('Current language before switch:', i18n.language);
    
    // 安全检查，确保i18n对象和changeLanguage方法存在
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(value)
        .then(() => {
          console.log('Language changed successfully to:', value);
          localStorage.setItem('language', value);
          console.log('Saved to localStorage:', value);
        })
        .catch(error => {
          console.error('Failed to change language:', error);
          // 备用方案：直接刷新页面并设置localStorage
          localStorage.setItem('language', value);
          window.location.reload();
        });
    } else {
      console.error('i18n.changeLanguage is not available', i18n);
      // 备用方案：直接刷新页面并设置localStorage
      localStorage.setItem('language', value);
      window.location.reload();
    }
  };

  const options = [
    {
      label: 'EN',
      value: 'en'
    },
    {
      label: '中文',
      value: 'zh'
    }
  ];

  // 调试信息
  React.useEffect(() => {
    console.log('LanguageSwitch - Current i18n language:', i18n.language);
    console.log('LanguageSwitch - localStorage language:', localStorage.getItem('language'));
  }, [i18n.language]);

  return (
    <div className={styles.languageSwitch}>
      <GlobalOutlined className={styles.icon} />
      <Segmented
        value={i18n?.language || 'zh'}
        options={options}
        onChange={handleLanguageChange}
        size="small"
      />
    </div>
  );
};

export default LanguageSwitch;
