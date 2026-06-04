// client/src/components/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiPicker } from '../emoji/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { Persona } from '../../services/api';
import AvatarFrame from '../common/AvatarFrame';
import AudioRecorderButton from './AudioRecorderButton';
import toast from 'react-hot-toast';

console.log('🔧 [ChatInput] 组件加载');

interface ChatInputProps {
  onSendMessage: (content: string, isAction: boolean, personaId?: string, isEmoji?: boolean, emojiId?: string) => void;
  onSendAudio?: (audioBlob: Blob, duration: number) => Promise<void>;
  onOpenMusicSearch?: () => void;
  disabled?: boolean;
  placeholder?: string;
  roomId?: string | null;
  selectedPersona?: Persona | null;
  roomPersonas?: Persona[];
  onSwitchPersona?: (persona: Persona) => void;
  onLoadRoomPersonas?: () => void;
}

interface MentionableMember {
  _id: string;
  displayName: string;
  avatar?: string;
  title?: string;
  role?: string;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onSendAudio,
  onOpenMusicSearch,
  disabled = false, 
  placeholder = "输入消息... ",
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
  
  // @ 提及相关状态
  const [showMentionPanel, setShowMentionPanel] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionList, setMentionList] = useState<MentionableMember[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const personaSwitchRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mentionPanelRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight, isKeyboardOpen, isIOS } = useKeyboardHeight();

  // 获取可提及的成员
  const fetchMentionableMembers = async (search: string) => {
    if (!roomId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/mentionable`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter((m: MentionableMember) => 
          m.displayName.toLowerCase().includes(search.toLowerCase()) ||
          (m.title && m.title.toLowerCase().includes(search.toLowerCase()))
        );
        setMentionList(filtered);
        setSelectedMentionIndex(0);
      }
    } catch (error) {
      console.error('获取提及列表失败:', error);
    }
  };

  // 检测 @ 符号
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInputValue(value);
    setCursorPosition(cursorPos);
    
    // 查找最近输入的 @
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    
    if (atMatch) {
      const searchTerm = atMatch[1];
      setMentionSearch(searchTerm);
      setShowMentionPanel(true);
      fetchMentionableMembers(searchTerm);
    } else {
      setShowMentionPanel(false);
    }
  };

  // 插入提及
  const insertMention = (member: MentionableMember) => {
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const textAfterCursor = inputValue.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + 
      `@${member.displayName} ` + textAfterCursor;
    
    setInputValue(newText);
    setShowMentionPanel(false);
    setMentionSearch('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // 键盘事件（支持上下键选择提及）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionPanel && mentionList.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % mentionList.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + mentionList.length) % mentionList.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionList[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionPanel(false);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showMentionPanel) {
      e.preventDefault();
      handleSend();
    }
  };

  // 点击外部关闭提及面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionPanelRef.current && !mentionPanelRef.current.contains(e.target as Node)) {
        setShowMentionPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 简繁转换
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
      console.error('简繁转换失败:', error);
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
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // 🎨 发送表情消息
  const handleSelectEmoji = (emojiUrl: string, emojiId: string) => {
    if (!selectedPersona) {
      toast.error('请选择发言角色');
      return;
    }
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
    // 发送表情消息：content 存储 emojiUrl，isEmoji 标记为 true
    onSendMessage(emojiUrl, false, selectedPersona._id, true, emojiId);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSwitchPersona = (persona: Persona) => {
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

      <div className="flex items-end gap-2 relative">
        {/* 角色切换按钮 */}
        {canSwitchPersona && (
          <div className="relative flex-shrink-0 pb-0.5" ref={personaSwitchRef}>
            <motion.button
              type="button"
              onClick={() => setShowPersonaSwitch(!showPersonaSwitch)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
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

            <AnimatePresence>
              {showPersonaSwitch && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">切换发言角色</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {roomPersonas.map(persona => {
                      const isActive = selectedPersona?._id === persona._id;
                      const frameName = getFrameNameFromUrl(persona.avatarFrame || persona.equipped?.avatarFrame);
                      return (
                        <motion.button
                          key={persona._id}
                          onClick={() => handleSwitchPersona(persona)}
                          whileHover={{ backgroundColor: '#f9fafb' }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 text-left ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          <AvatarFrame avatarUrl={persona.avatar || ''} frameName={frameName} size="sm" className="chat-input-menu flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{persona.displayName || persona.name}</p>
                            <p className="text-[10px] text-gray-400">#{persona.sameNameNumber || '?'}</p>
                          </div>
                          {isActive && <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 🎨 表情按钮 */}
        <div className="relative flex-shrink-0 pb-0.5" ref={emojiContainerRef}>
          <motion.button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${showEmojiPicker ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="表情"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.button>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="absolute bottom-full left-0 mb-2 z-50">
                <EmojiPicker onSelect={handleSelectEmoji} onClose={() => setShowEmojiPicker(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🎙️ 录音按钮 */}
        {onSendAudio && (
          <div className="flex-shrink-0 pb-0.5">
            <AudioRecorderButton onSendAudio={onSendAudio} disabled={disabled} />
          </div>
        )}

        {/* 🎵 音乐分享按钮 */}
        {onOpenMusicSearch && (
          <div className="flex-shrink-0 pb-0.5">
            <motion.button
              type="button"
              onClick={onOpenMusicSearch}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-all duration-200"
              title="分享音乐"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* 简繁转换按钮 */}
        <motion.button
          type="button"
          onClick={handleTranslate}
          disabled={!hasContent || isTranslating}
          whileTap={hasContent && !isTranslating ? { scale: 0.9 } : {}}
          whileHover={hasContent && !isTranslating ? { scale: 1.05 } : {}}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${hasContent && !isTranslating ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
          title="简繁转换"
        >
          {isTranslating ? <motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></motion.svg> : <span className="text-sm tracking-wide">简⇄繁</span>}
        </motion.button>

        {/* 输入框容器 */}
        <div className="flex-1 min-w-0 relative">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 150);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-full rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 outline-none bg-gray-100 dark:bg-gray-800 ${isFocused ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500/50 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
            maxLength={2000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
          />
          
          {/* @ 提及面板 */}
          <AnimatePresence>
            {showMentionPanel && mentionList.length > 0 && (
              <motion.div
                ref={mentionPanelRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
              >
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  提及成员
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {mentionList.map((member, index) => (
                    <button
                      key={member._id}
                      onClick={() => insertMention(member)}
                      onMouseEnter={() => setSelectedMentionIndex(index)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 transition ${index === selectedMentionIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {member.displayName}
                        </div>
                        {member.title && (
                          <div className="text-xs text-gray-400 truncate">
                            {member.title}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  按 ↑ ↓ 选择，Enter 确认
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 发送按钮 */}
        <motion.button 
          onClick={handleSend}
          disabled={disabled || !hasContent}
          whileTap={hasContent && !disabled ? { scale: 0.85 } : {}}
          whileHover={hasContent && !disabled ? { scale: 1.05 } : {}}
          animate={sendAnimation ? { scale: [1, 0.8, 1], rotate: [0, -15, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${hasContent && !disabled ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg active:shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
        >
          <motion.span animate={sendAnimation ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
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