import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from '../common/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { Persona } from '../../services/api';

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

  // 键盘弹出时确保输入框可见
  useEffect(() => {
    if (isFocused && isIOS && isKeyboardOpen) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isKeyboardOpen, isFocused, isIOS]);

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

  // 加载群内 Persona
  useEffect(() => {
    if (showPersonaSwitch && onLoadRoomPersonas) {
      onLoadRoomPersonas();
    }
  }, [showPersonaSwitch]);

  // 翻译
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
    } finally {
      setIsTranslating(false);
    }
  };

  // 发送
  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
    onSendMessage(content, isAction, selectedPersona?._id);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 50);
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
      className={`bg-white border-t border-gray-100 flex-shrink-0 transition-shadow duration-300 ${
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
            <span className="text-xs text-gray-500">
              发言身份: <span className="text-blue-600 font-medium">{currentDisplayName}</span>
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
                showPersonaSwitch ? 'text-purple-500 bg-purple-50' : 'text-gray-400 hover:text-purple-500 hover:bg-gray-100'
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
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-60 overflow-y-auto"
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">切换发言角色</p>
                  </div>
                  {roomPersonas.map(persona => (
                    <motion.button
                      key={persona._id}
                      onClick={() => handleSwitchPersona(persona)}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full px-3 py-2.5 flex items-center gap-3 transition text-left ${
                        selectedPersona?._id === persona._id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {persona.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{persona.displayName || persona.name}</p>
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
              showEmojiPicker ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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

        {/* 简繁转换 */}
        <motion.button
          type="button"
          onClick={handleTranslate}
          disabled={!hasContent || isTranslating}
          whileTap={hasContent && !isTranslating ? { scale: 0.9 } : {}}
          whileHover={hasContent && !isTranslating ? { scale: 1.1 } : {}}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            hasContent && !isTranslating
              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
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

        {/* 输入框 */}
        <motion.div
          className="flex-1 min-w-0"
          animate={{ scale: isFocused ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-full bg-gray-100 rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 outline-none ${
              isFocused ? 'bg-white ring-2 ring-blue-400/50 shadow-md' : 'hover:bg-gray-50'
            } ${disabled ? 'opacity-50' : ''}`}
            disabled={disabled}
            maxLength={2000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </motion.div>
        
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
              : 'bg-gray-200 text-gray-400'
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