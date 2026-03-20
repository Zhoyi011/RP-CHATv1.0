import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '../common/EmojiPicker';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);  // 改成 HTMLDivElement

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
        {/* 表情按钮容器 */}
        <div className="relative" ref={emojiContainerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 flex-shrink-0"
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

        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={disabled}
        />
        <button 
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatInput;