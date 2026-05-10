import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '../common/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';

interface ChatInputProps {
  onSendMessage: (content: string, isAction: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

// 检测文本是否包含繁体字
const containsTraditional = (text: string): boolean => {
  const traditionalChars = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼]/;
  return traditionalChars.test(text);
};

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "输入消息... 使用 /me 进行动作扮演" 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);

  // 修复手机键盘问题
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleFocus);
    }

    return () => {
      if (input) {
        input.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

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

  // ✅ 智能翻译：自动检测并转换
  const handleTranslate = async () => {
    if (!inputValue.trim() || isTranslating) return;
    
    setIsTranslating(true);
    try {
      let translated: string;
      
      // 检测输入框当前文字是简体还是繁体
      if (containsTraditional(inputValue)) {
        // 繁体 → 简体
        translated = await traditionalToSimplified(inputValue);
      } else {
        // 简体 → 繁体
        translated = await simplifiedToTraditional(inputValue);
      }
      
      setInputValue(translated);
    } catch (error) {
      console.error('翻译失败:', error);
      alert('翻译失败，请稍后重试');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    
    onSendMessage(content, isAction);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0 relative">
      <div className="flex items-center gap-2">
        {/* 表情按钮 */}
        <div className="relative" ref={emojiContainerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 flex-shrink-0"
            title="表情"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleSelectEmoji}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>

        {/* ✅ 翻译按钮 - 简繁切换 */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={!inputValue.trim() || isTranslating}
          className={`px-2 py-1.5 rounded-full text-xs font-medium transition flex-shrink-0 ${
            !inputValue.trim() || isTranslating
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="简繁转换"
        >
          {isTranslating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <span>简⇄繁</span>
          )}
        </button>

        {/* 输入框 */}
        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
        
        {/* 发送按钮 */}
        <button 
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatInput;