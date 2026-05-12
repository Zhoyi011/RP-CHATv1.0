import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '../common/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';

interface ChatInputProps {
  onSendMessage: (content: string, isAction: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "输入消息... 使用 /me 进行动作扮演" 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // iOS 键盘修复：初始化
  useEffect(() => {
    setInitialized(true);
  }, []);

  // iOS 键盘修复：聚焦时滚动
  const handleFocus = () => {
    setIsFocused(true);
    
    // 检测是否是 iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS 需要延迟处理键盘弹起
      setTimeout(() => {
        const activeElement = document.activeElement as any;
        if ('scrollIntoViewIfNeeded' in activeElement) {
          activeElement.scrollIntoViewIfNeeded(false);
        }
        // 回退方案
        window.scrollTo(0, document.body.scrollHeight);
      }, 350);
    } else {
      // Android 等即时处理
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 100);
    }
  };

  // iOS 键盘修复：失焦时恢复
  const handleBlur = () => {
    setIsFocused(false);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  };

  // 点击外部关闭表情面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 智能翻译
  const handleTranslate = async () => {
    if (!inputValue.trim() || isTranslating) return;
    
    setIsTranslating(true);
    try {
      const simplified = await traditionalToSimplified(inputValue);
      
      if (simplified === inputValue) {
        const traditional = await simplifiedToTraditional(inputValue);
        setInputValue(traditional);
      } else {
        setInputValue(simplified);
      }
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
    onSendMessage(content, isAction);
    setInputValue('');
    
    // iOS 键盘修复：发送后重新聚焦
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 选择表情
  const handleSelectEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const hasContent = inputValue.trim().length > 0;

  return (
    <div 
      ref={containerRef}
      className={`bg-white border-t border-gray-100 px-3 py-2.5 flex-shrink-0 transition-all duration-300 keyboard-visible ${
        isFocused ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      {/* 快捷提示 */}
      {inputValue.startsWith('/me ') && (
        <div className="flex items-center gap-1.5 mb-2 px-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
            🎭 动作扮演
          </span>
          <span className="text-[10px] text-gray-400">
            你的角色将以第三人称执行这个动作
          </span>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* 表情按钮 */}
        <div className="relative flex-shrink-0" ref={emojiContainerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-full transition-all duration-200 ${
              showEmojiPicker
                ? 'text-blue-500 bg-blue-50 rotate-12 scale-110'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title="表情"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {showEmojiPicker && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-200">
              <EmojiPicker
                onSelect={handleSelectEmoji}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>

        {/* 简繁转换 */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={!hasContent || isTranslating}
          className={`flex-shrink-0 px-2 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
            hasContent && !isTranslating
              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="简繁转换"
        >
          {isTranslating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <span className="whitespace-nowrap">简⇄繁</span>
          )}
        </button>

        {/* 输入框 */}
        <div className="flex-1 relative">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={inputValue.startsWith('/me ') ? '输入动作内容...' : placeholder}
            className={`w-full bg-gray-100 rounded-2xl px-4 py-2.5 pr-10 text-sm transition-all duration-300 outline-none ${
              isFocused
                ? 'bg-white ring-2 ring-blue-400/50 shadow-md'
                : 'hover:bg-gray-50'
            } ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={disabled}
            maxLength={2000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
          />
          
          {inputValue.length > 0 && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] transition-colors duration-200 ${
              inputValue.length > 1800
                ? 'text-red-400'
                : inputValue.length > 1500
                ? 'text-amber-400'
                : 'text-gray-400'
            }`}>
              {inputValue.length}/2000
            </span>
          )}
        </div>
        
        {/* 发送按钮 */}
        <button 
          onClick={handleSend}
          disabled={disabled || !hasContent}
          className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
            hasContent && !disabled
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-cyan-600 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          } ${
            sendAnimation ? 'scale-90' : ''
          }`}
        >
          {sendAnimation ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          <span className="hidden sm:inline">发送</span>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;