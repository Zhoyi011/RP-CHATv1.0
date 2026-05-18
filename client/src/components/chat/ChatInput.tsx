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
  placeholder = "输入消息... ",
  roomId,
  selectedPersona,
  roomPersonas = [],
  onSwitchPersona,
  onLoadRoomPersonas,
}) => {
  console.log(`🎨 [ChatInput] 渲染, roomId=${roomId}, disabled=${disabled}, persona=${selectedPersona?.displayName || selectedPersona?.name}`);

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

  console.log(`📊 [ChatInput] 状态: inputLength=${inputValue.length}, isFocused=${isFocused}, isKeyboardOpen=${isKeyboardOpen}`);

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
      console.log('📱 [ChatInput] 检测到键盘打开，触发滚动');
    }
  }, [isKeyboardOpen, isFocused]);

  // iOS 下额外监听 resize（备用）
  useEffect(() => {
    const handleResize = () => {
      if (isFocused && inputRef.current && isIOS) {
        console.log('📱 [ChatInput] iOS resize 事件触发，滚动输入框');
        scrollInputToVisible();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      console.log('🧹 [ChatInput] 移除 resize 监听');
    };
  }, [isFocused, isIOS]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
        console.log('🔽 [ChatInput] 关闭表情面板');
      }
      if (personaSwitchRef.current && !personaSwitchRef.current.contains(e.target as Node)) {
        setShowPersonaSwitch(false);
        console.log('🔽 [ChatInput] 关闭角色切换面板');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      console.log('🧹 [ChatInput] 清理点击外部监听');
    };
  }, []);

  // 加载群内 Persona
  useEffect(() => {
    if (showPersonaSwitch && onLoadRoomPersonas) {
      console.log('🔄 [ChatInput] 加载群内角色列表');
      onLoadRoomPersonas();
    }
  }, [showPersonaSwitch, onLoadRoomPersonas]);

  // 简繁转换
  const handleTranslate = async () => {
    console.log(`🌐 [ChatInput] 开始简繁转换, 内容长度: ${inputValue.length}`);
    if (!inputValue.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const simplified = await traditionalToSimplified(inputValue);
      if (simplified === inputValue) {
        const traditional = await simplifiedToTraditional(inputValue);
        setInputValue(traditional);
        console.log(`✅ [ChatInput] 转换为繁体: ${traditional.substring(0, 30)}...`);
      } else {
        setInputValue(simplified);
        console.log(`✅ [ChatInput] 转换为简体: ${simplified.substring(0, 30)}...`);
      }
    } catch (error) {
      console.error('❌ [ChatInput] 简繁转换失败:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // 发送消息
  const handleSend = () => {
    console.log(`📤 [ChatInput] 尝试发送消息, 内容: "${inputValue.substring(0, 30)}", hasContent=${!!inputValue.trim()}, disabled=${disabled}`);
    if (!inputValue.trim() || disabled) return;
    
    const isAction = inputValue.startsWith('/me ');
    const content = isAction ? inputValue.slice(4) : inputValue;
    
    console.log(`✅ [ChatInput] 发送消息, isAction=${isAction}, 角色=${selectedPersona?.displayName || selectedPersona?.name}`);
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
    onSendMessage(content, isAction, selectedPersona?._id);
    setInputValue('');
    
    // 发送后重新聚焦
    setTimeout(() => {
      inputRef.current?.focus();
      console.log('📱 [ChatInput] 发送后重新聚焦输入框');
    }, 50);
  };

  // PC 端键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('⌨️ [ChatInput] Enter 键发送');
      handleSend();
    }
  };

  // 选择表情
  const handleSelectEmoji = (emoji: string) => {
    console.log(`😊 [ChatInput] 选择表情: ${emoji}`);
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // 切换角色
  const handleSwitchPersona = (persona: Persona) => {
    console.log(`🔄 [ChatInput] 切换角色: ${persona.displayName || persona.name}`);
    onSwitchPersona?.(persona);
    setShowPersonaSwitch(false);
  };

  const hasContent = inputValue.trim().length > 0;
  const canSwitchPersona = roomPersonas.length > 1;

  return (
    <motion.div 
      ref={containerRef}
      className={`
        bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 
        flex-shrink-0 transition-all duration-300
        ${isFocused ? 'shadow-lg' : 'shadow-sm'}
      `}
      animate={{ paddingBottom: isKeyboardOpen ? Math.max(keyboardHeight - 40, 0) : 12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}
    >
      {/* 动作扮演提示 */}
      <AnimatePresence>
        {inputValue.startsWith('/me ') && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-2 mb-2 px-1 overflow-hidden"
          >
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
              🎭 动作扮演模式
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              你的角色将以第三人称执行动作
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ❌ 已删除重复的"当前发言身份"显示区块 */}
      {/* 发言身份现在只在 ChatHome 中统一显示 */}

      <div className="flex items-end gap-2">
        {/* 角色切换按钮 */}
        {canSwitchPersona && (
          <div className="relative flex-shrink-0 pb-0.5" ref={personaSwitchRef}>
            <motion.button
              type="button"
              onClick={() => {
                setShowPersonaSwitch(!showPersonaSwitch);
                console.log(`🔘 [ChatInput] 点击角色切换按钮, 展开=${!showPersonaSwitch}`);
              }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              animate={{ rotate: showPersonaSwitch ? 12 : 0, scale: showPersonaSwitch ? 1.05 : 1 }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                ${showPersonaSwitch 
                  ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm' 
                  : 'text-gray-400 hover:text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title="切换发言角色"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </motion.button>

            {/* 角色切换下拉菜单 */}
            <AnimatePresence>
              {showPersonaSwitch && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">切换发言角色</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {roomPersonas.map(persona => {
                      const isActive = selectedPersona?._id === persona._id;
                      return (
                        <motion.button
                          key={persona._id}
                          onClick={() => handleSwitchPersona(persona)}
                          whileHover={{ backgroundColor: '#f9fafb' }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 text-left
                            ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                          `}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                            {persona.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {persona.displayName || persona.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              #{persona.sameNameNumber || '?'}
                            </p>
                          </div>
                          {isActive && (
                            <motion.svg 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }} 
                              className="w-4 h-4 text-blue-500 flex-shrink-0" 
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 表情按钮 */}
        <div className="relative flex-shrink-0 pb-0.5" ref={emojiContainerRef}>
          <motion.button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              console.log(`😊 [ChatInput] 点击表情按钮, 展开=${!showEmojiPicker}`);
            }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            animate={{ rotate: showEmojiPicker ? 12 : 0, scale: showEmojiPicker ? 1.05 : 1 }}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
              ${showEmojiPicker 
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
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
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-0 mb-2 z-50"
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
          whileHover={hasContent && !isTranslating ? { scale: 1.05 } : {}}
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
            ${hasContent && !isTranslating 
              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30' 
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }
          `}
          title="简繁转换"
        >
          {isTranslating ? (
            <motion.svg 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
              className="w-4 h-4" 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </motion.svg>
          ) : (
            <span className="text-sm tracking-wide">简⇄繁</span>
          )}
        </motion.button>

        {/* 原生输入框 */}
        <div className="flex-1 min-w-0">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              console.log(`⌨️ [ChatInput] 输入变化: ${e.target.value.substring(0, 30)}`);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              console.log('🔍 [ChatInput] 输入框获得焦点');
              // 聚焦时滚动，确保键盘升起后输入框可见
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                console.log('📱 [ChatInput] 聚焦后滚动输入框');
              }, 150);
            }}
            onBlur={() => {
              setIsFocused(false);
              console.log('🔍 [ChatInput] 输入框失去焦点');
            }}
            placeholder={placeholder}
            className={`
              w-full rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 outline-none
              bg-gray-100 dark:bg-gray-800
              ${isFocused 
                ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500/50 shadow-md' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
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
          whileHover={hasContent && !disabled ? { scale: 1.05 } : {}}
          animate={sendAnimation ? { scale: [1, 0.8, 1], rotate: [0, -15, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`
            flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200
            flex items-center justify-center gap-1.5
            ${hasContent && !disabled
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg active:shadow-sm'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <motion.span
            animate={sendAnimation ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </motion.span>
          <span className="hidden sm:inline text-sm">发送</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatInput;