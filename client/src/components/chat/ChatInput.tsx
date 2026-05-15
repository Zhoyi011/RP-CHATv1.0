import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from '../common/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { Persona } from '../../services/api';

console.log('🔧 [ChatInput] 组件加载（原生键盘版 - 完美贴合）');

interface ChatInputProps {
  onSendMessage: (content: string, isAction: boolean, personaId?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  roomId?: string | null;
  selectedPersona?: Persona | null;
  roomPersonas?: Persona[];
  onSwitchPersona?: (persona: Persona) => void;
  onLoadRoomPersonas?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "输入消息... 使用 /me 进行动作扮演",
  roomId,
  selectedPersona,
  roomPersonas = [],
  onSwitchPersona,
  onLoadRoomPersonas,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const personaSwitchRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight, isKeyboardOpen, isIOS } = useKeyboardHeight();

  // ✅ 键盘弹出时滚动输入框到可视区域（完美贴合）
  const scrollInputToVisible = () => {
    if (!inputRef.current) return;
    // 等待键盘完全弹出
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      console.log('📱 [ChatInput] 键盘弹出，输入框已滚动到贴合位置');
    }, 100);
  };

  // 监听键盘打开/关闭（来自 useKeyboardHeight 检测）
  useEffect(() => {
    if (isKeyboardOpen && isFocused && inputRef.current) {
      scrollInputToVisible();
    }
  }, [isKeyboardOpen, isFocused]);

  // iOS 下额外监听 resize（备用）
  useEffect(() => {
    const handleResize = () => {
      if (isFocused && inputRef.current && isIOS) {
        scrollInputToVisible();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFocused, isIOS]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (personaSwitchRef.current && !personaSwitchRef.current.contains(e.target as Node)) {
        setShowPersonaSwitch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showPersonaSwitch && onLoadRoomPersonas) {
      onLoadRoomPersonas();
    }
  }, [showPersonaSwitch, onLoadRoomPersonas]);

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
      console.error('简繁转换失败', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    onSendMessage(content, isAction, selectedPersona?._id);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSwitchPersona = (persona: Persona) => {
    onSwitchPersona?.(persona);
    setShowPersonaSwitch(false);
  };

  const hasContent = inputValue.trim().length > 0;
  const canSwitchPersona = roomPersonas.length > 1;
  const currentDisplayName = selectedPersona?.displayName || selectedPersona?.name || '选择角色';

  return (
    <motion.div 
      ref={containerRef}
      className={`bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 transition-shadow duration-300 ${
        isFocused ? 'shadow-lg' : 'shadow-sm'
      }`}
      animate={{ paddingBottom: isKeyboardOpen ? Math.max(keyboardHeight - 40, 0) : 10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ paddingTop: 10, paddingLeft: 12, paddingRight: 12 }}
    >
      {/* 动作提示 */}
      <AnimatePresence>
        {inputValue.startsWith('/me ') && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-1.5 mb-2 px-1 overflow-hidden"
          >
            <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
              🎭 动作扮演
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 当前发言身份 */}
      {selectedPersona && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-2 px-1"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
            {selectedPersona.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            发言身份: <span className="text-blue-600 dark:text-blue-400 font-medium">{currentDisplayName}</span>
          </span>
        </motion.div>
      )}

      <div className="flex items-end gap-2">
        {/* 角色切换 */}
        {canSwitchPersona && (
          <div className="relative flex-shrink-0 pb-0.5" ref={personaSwitchRef}>
            <motion.button
              type="button"
              onClick={() => setShowPersonaSwitch(!showPersonaSwitch)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                showPersonaSwitch ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'text-gray-400 hover:text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </motion.button>
            <AnimatePresence>
              {showPersonaSwitch && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 max-h-60 overflow-y-auto"
                >
                  {roomPersonas.map(persona => (
                    <button
                      key={persona._id}
                      onClick={() => handleSwitchPersona(persona)}
                      className={`w-full px-3 py-2.5 flex items-center gap-3 text-left ${
                        selectedPersona?._id === persona._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                        {persona.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{persona.displayName || persona.name}</p>
                        <p className="text-xs text-gray-400">#{persona.sameNameNumber || '?'}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 表情按钮 */}
        <div className="relative flex-shrink-0 pb-0.5" ref={emojiContainerRef}>
          <motion.button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.button>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2"
              >
                <EmojiPicker onSelect={handleSelectEmoji} onClose={() => setShowEmojiPicker(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 简繁转换 */}
        <motion.button
          type="button"
          onClick={handleTranslate}
          disabled={!hasContent || isTranslating}
          whileTap={hasContent && !isTranslating ? { scale: 0.9 } : {}}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${
            hasContent && !isTranslating ? 'text-blue-500 hover:text-blue-600' : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          {isTranslating ? <span className="animate-spin">⏳</span> : <span>简⇄繁</span>}
        </motion.button>

        {/* ✅ 原生输入框（已通过 CSS 保证字体 ≥ 16px，避免 iOS 缩放） */}
        <div className="flex-1 min-w-0">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              // 聚焦时轻微延迟滚动，确保键盘升起
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 150);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-full bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 outline-none ${
              isFocused ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-400/50 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50' : ''}`}
            disabled={disabled}
            maxLength={2000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </div>

        {/* 发送按钮 */}
        <motion.button 
          onClick={handleSend}
          disabled={disabled || !hasContent}
          whileTap={hasContent && !disabled ? { scale: 0.85 } : {}}
          animate={sendAnimation ? { scale: [1, 0.8, 1], rotate: [0, -15, 0] } : {}}
          className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-medium ${
            hasContent && !disabled
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatInput;