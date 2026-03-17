import React from 'react';
import { useTranslation } from 'react-i18next';

const I18nTest = () => {
  const { t, i18n } = useTranslation();
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '10px', 
      border: '1px solid #ccc',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div>当前语言: {i18n.language}</div>
      <div>可用算法: {t('stats.algorithms')}</div>
      <div>快速开始: {t('quickStart.title')}</div>
      <div>研究员: {t('researcher')}</div>
    </div>
  );
};

export default I18nTest;
