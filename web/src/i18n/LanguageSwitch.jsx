import React from 'react';
import { Segmented } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './LanguageSwitch.css';

const LanguageSwitch = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
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
    <div className="language-switch">
      <GlobalOutlined className="language-icon" />
      <Segmented
        options={options}
        value={i18n.language}
        onChange={handleLanguageChange}
        size="small"
      />
    </div>
  );
};

export default LanguageSwitch;
