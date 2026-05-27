// client/src/components/chat/TranslatableMessage.tsx
import React, { useState, useEffect } from 'react';
import { translateApi } from '../../services/api';

interface TranslatableMessageProps {
  content: string;
  isOwn?: boolean;
  className?: string;
}

const TranslatableMessage: React.FC<TranslatableMessageProps> = ({ 
  content, 
  isOwn = false,
  className = ''
}) => {
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [targetLang, setTargetLang] = useState<string>('zh');

  // 获取用户设置的翻译目标语言
  useEffect(() => {
    const savedLang = localStorage.getItem('translateTargetLang');
    if (savedLang) {
      setTargetLang(savedLang);
    }
  }, []);

  // 判断是否需要显示翻译按钮
  const needsTranslation = () => {
    // 自己的消息不显示翻译按钮
    if (isOwn) return false;
    
    // 如果目标语言是中文，检测内容是否已经是中文
    if (targetLang === 'zh' || targetLang === 'zh-CN' || targetLang === 'zh-TW') {
      const hasChinese = /[\u4e00-\u9fa5]/.test(content);
      if (hasChinese) return false;
    }
    // 如果目标语言是英文，检测是否已经是英文
    if (targetLang === 'en') {
      const isEnglish = /^[a-zA-Z0-9\s\.,!?;:'"()-]+$/.test(content);
      if (isEnglish && content.length > 0) return false;
    }
    return true;
  };

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedContent) {
      setIsTranslated(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await translateApi.lang(content, targetLang);
      if (res.result) {
        setTranslatedContent(res.result);
        setIsTranslated(true);
      }
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 如果不显示翻译按钮，直接显示原文
  if (!needsTranslation()) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className="relative group">
      <div className={className}>
        {isTranslated && translatedContent ? translatedContent : content}
      </div>
      
      {/* 翻译按钮 - 悬停显示 */}
      <button
        onClick={handleTranslate}
        disabled={isLoading}
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 hover:text-white"
        title={isTranslated ? '显示原文' : '翻译'}
      >
        {isLoading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default TranslatableMessage;