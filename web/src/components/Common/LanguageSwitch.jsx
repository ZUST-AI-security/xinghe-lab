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
    i18n.changeLanguage(value);
    localStorage.setItem('language', value);
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

  return (
    <div className={styles.languageSwitch}>
      <GlobalOutlined className={styles.icon} />
      <Segmented
        value={i18n.language}
        options={options}
        onChange={handleLanguageChange}
        size="small"
      />
    </div>
  );
};

export default LanguageSwitch;
