import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from '../common/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useResponsive } from '../../hooks/useResponsive';
import { CustomKeyboard } from '../keyboard/CustomKeyboard';
import type { Persona } from '../../services/api';

console.log('🔧 [ChatInput] 组件模块加载');

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
  console.log('🎨 [ChatInput] 组件渲染', { roomId, disabled, selectedPersonaId: selectedPersona?._id });

  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fakeInputRef = useRef<HTMLDivElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const personaSwitchRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight, isKeyboardOpen, isIOS } = useKeyboardHeight();
  const { isMobile } = useResponsive(); // 用于判断是否移动端

  console.log(`📱 [ChatInput] 设备类型: ${isMobile ? '移动端' : 'PC端'}, showCustomKeyboard=${showCustomKeyboard}`);

  // 键盘弹出时滚动到视图
  useEffect(() => {
    if (isFocused && isIOS && isKeyboardOpen) {
      console.log('📱 [ChatInput] iOS键盘弹出，滚动到视图');
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isKeyboardOpen, isFocused, isIOS]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        console.log('🔽 [ChatInput] 关闭表情面板');
        setShowEmojiPicker(false);
      }
      if (personaSwitchRef.current && !personaSwitchRef.current.contains(e.target as Node)) {
        console.log('🔽 [ChatInput] 关闭角色切换面板');
        setShowPersonaSwitch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      console.log('🧹 [ChatInput] 清理点击外部监听');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 加载群内 Persona
  useEffect(() => {
    if (showPersonaSwitch && onLoadRoomPersonas) {
      console.log('🔄 [ChatInput] 加载群内角色列表');
      onLoadRoomPersonas();
    }
  }, [showPersonaSwitch, onLoadRoomPersonas]);

  // 翻译
  const handleTranslate = async () => {
    console.log('🌐 [ChatInput] 开始简繁转换', { inputLength: inputValue.length });
    if (!inputValue.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const simplified = await traditionalToSimplified(inputValue);
      if (simplified === inputValue) {
        const traditional = await simplifiedToTraditional(inputValue);
        console.log('✅ [ChatInput] 转换为繁体');
        setInputValue(traditional);
      } else {
        console.log('✅ [ChatInput] 转换为简体');
        setInputValue(simplified);
      }
    } catch (error) {
      console.error('❌ [ChatInput] 简繁转换失败', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // 发送消息
  const handleSend = () => {
    console.log('📤 [ChatInput] 尝试发送消息', { hasContent: !!inputValue.trim(), disabled });
    if (!inputValue.trim() || disabled) return;
    
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    
    console.log('✅ [ChatInput] 发送消息', { 
      isAction, 
      contentLength: content.length, 
      personaId: selectedPersona?._id,
      contentPreview: content.substring(0, 50)
    });
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
    onSendMessage(content, isAction, selectedPersona?._id);
    setInputValue('');
    setShowCustomKeyboard(false);
    
    // 移动端：重新打开键盘？
    if (isMobile) {
      setTimeout(() => {
        console.log('🔧 [ChatInput] 移动端发送后重新打开自定义键盘');
        setShowCustomKeyboard(true);
      }, 50);
    } else {
      // PC端：聚焦原生输入框
      inputRef.current?.focus();
    }
  };

  // 移动端：打开自定义键盘
  const openCustomKeyboard = () => {
    console.log('🔧 [ChatInput] 移动端打开自定义键盘');
    setShowCustomKeyboard(true);
    setIsFocused(true);
    // 强制模糊原生输入框（如果有）
    if (inputRef.current) inputRef.current.blur();
  };

  // PC端：键盘事件（原生输入框）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('⌨️ [ChatInput] PC端原生键盘发送');
      handleSend();
    }
  };

  // 移动端：自定义键盘值变化
  const handleKeyboardChange = (value: string) => {
    console.log('⌨️ [ChatInput] 自定义键盘输入', { valueLength: value.length, preview: value.substring(0, 30) });
    setInputValue(value);
  };

  // 移动端：关闭自定义键盘
  const handleKeyboardClose = () => {
    console.log('🔽 [ChatInput] 关闭自定义键盘');
    setShowCustomKeyboard(false);
    setIsFocused(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    console.log('😊 [ChatInput] 选择表情', { emoji });
    setInputValue(prev => prev + emoji);
    // 移动端保持键盘打开
    if (isMobile && showCustomKeyboard) {
      // 键盘已打开，不需要额外操作
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSwitchPersona = (persona: Persona) => {
    console.log('🔄 [ChatInput] 切换角色', { from: selectedPersona?._id, to: persona._id, name: persona.name });
    onSwitchPersona?.(persona);
    setShowPersonaSwitch(false);
  };

  const hasContent = inputValue.trim().length > 0;
  const canSwitchPersona = roomPersonas.length > 1;
  const currentDisplayName = selectedPersona?.displayName || selectedPersona?.name || '选择角色';

  // ========== 根据设备类型渲染不同的输入区域 ==========
  const renderInputArea = () => {
    if (isMobile) {
      // 移动端：使用只读模拟框 + 自定义键盘
      return (
        <>
          <div
            ref={fakeInputRef}
            onClick={openCustomKeyboard}
            className={`w-full bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm cursor-text transition-all duration-300 min-h-[44px] ${
              isFocused ? 'ring-2 ring-blue-400/50 bg-white dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            {inputValue ? (
              <span className="text-gray-800 dark:text-gray-200 break-words">{inputValue}</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
            )}
          </div>
          <CustomKeyboard
            value={inputValue}
            onChange={handleKeyboardChange}
            onClose={handleKeyboardClose}
            placeholder={placeholder}
            maxLength={2000}
            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            enableSound={false}
          />
        </>
      );
    } else {
      // PC端：使用原生输入框（物理键盘）
      return (
        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
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
      );
    }
  };

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
      {/* 快捷提示 */}
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
            <span className="text-[10px] text-gray-400">你的角色将以第三人称执行这个动作</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 当前发言身份 */}
      <AnimatePresence>
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
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* 切皮按钮 */}
        {canSwitchPersona && (
          <div className="relative flex-shrink-0 pb-0.5" ref={personaSwitchRef}>
            <motion.button
              type="button"
              onClick={() => setShowPersonaSwitch(!showPersonaSwitch)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              animate={{ rotate: showPersonaSwitch ? 12 : 0, scale: showPersonaSwitch ? 1.1 : 1 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                showPersonaSwitch ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'text-gray-400 hover:text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="切换发言角色"
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
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 max-h-60 overflow-y-auto"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">切换发言角色</p>
                  </div>
                  {roomPersonas.map(persona => (
                    <motion.button
                      key={persona._id}
                      onClick={() => handleSwitchPersona(persona)}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full px-3 py-2.5 flex items-center gap-3 transition text-left ${
                        selectedPersona?._id === persona._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {persona.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{persona.displayName || persona.name}</p>
                        <p className="text-xs text-gray-400">#{persona.sameNameNumber || '?'}</p>
                      </div>
                      {selectedPersona?._id === persona._id && (
                        <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </motion.button>
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
            animate={{ rotate: showEmojiPicker ? 12 : 0, scale: showEmojiPicker ? 1.1 : 1 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              showEmojiPicker ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="表情"
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

        {/* 简繁转换按钮 */}
        <motion.button
          type="button"
          onClick={handleTranslate}
          disabled={!hasContent || isTranslating}
          whileTap={hasContent && !isTranslating ? { scale: 0.9 } : {}}
          whileHover={hasContent && !isTranslating ? { scale: 1.1 } : {}}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            hasContent && !isTranslating
              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="简繁转换"
        >
          {isTranslating ? (
            <motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </motion.svg>
          ) : (
            <span>简⇄繁</span>
          )}
        </motion.button>

        {/* 输入区域：移动端 vs PC端 */}
        <div className="flex-1 min-w-0">
          {renderInputArea()}
        </div>

        {/* 发送按钮 */}
        <motion.button 
          onClick={handleSend}
          disabled={disabled || !hasContent}
          whileTap={hasContent && !disabled ? { scale: 0.85 } : {}}
          whileHover={hasContent && !disabled ? { scale: 1.05 } : {}}
          animate={sendAnimation ? { scale: [1, 0.8, 1], rotate: [0, -15, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
            hasContent && !disabled
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          <motion.span
            animate={sendAnimation ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </motion.span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatInput;