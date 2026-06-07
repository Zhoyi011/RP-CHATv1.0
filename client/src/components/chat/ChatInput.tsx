// client/src/components/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiPicker } from '../emoji/EmojiPicker';
import { simplifiedToTraditional, traditionalToSimplified } from '../../services/translateApi';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { Persona } from '../../services/api';
import AvatarFrame from '../common/AvatarFrame';
import { GiftModal } from '../gift/GiftModal';
import { RedPacketModal } from '../redpacket/RedPacketModal';
import toast from 'react-hot-toast';
import { Gift, Music2, Send, Mic, Loader2, Coins, Sparkles } from 'lucide-react';

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
  // 🧠 AI 建议相关 props
  aiSuggestion?: string | null;
  onUseSuggestion?: () => void;
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
  aiSuggestion,
  onUseSuggestion,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // 礼物/红包相关状态
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showRedPacketModal, setShowRedPacketModal] = useState(false);
  const [selectedItemForGift, setSelectedItemForGift] = useState<{ id: string; name: string; image: string; price: number } | null>(null);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // 录音相关
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
  const giftMenuRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const { keyboardHeight, isKeyboardOpen, isIOS } = useKeyboardHeight();

  const hasContent = inputValue.trim().length > 0;
  const canSwitchPersona = roomPersonas.length > 1;
  
  // 计算最终 placeholder
  const finalPlaceholder = aiSuggestion 
    ? `✨ AI 建议: ${aiSuggestion} ✨` 
    : placeholder;

  // 使用 AI 建议
  const handleUseSuggestion = () => {
    if (aiSuggestion) {
      setInputValue(aiSuggestion);
      if (onUseSuggestion) onUseSuggestion();
      // 聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // 加载用户背包物品（用于快捷赠送）
  const loadUserItems = async () => {
    setLoadingItems(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://rp-chatv1-0.onrender.com/api/shop/my-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // 只显示可赠送的物品
        const giftableItems = data.filter((item: any) => item.shopItem?.isGiftable !== false);
        setUserItems(giftableItems);
      }
    } catch (error) {
      console.error('加载物品失败:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  // 点击外部关闭礼物菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (giftMenuRef.current && !giftMenuRef.current.contains(e.target as Node)) {
        setShowGiftMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 键盘事件
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
    
    if (e.key === 'Enter' && !e.shiftKey && !showMentionPanel && !showGiftMenu) {
      e.preventDefault();
      if (hasContent) {
        handleSend();
      }
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

  // 发送文本消息
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

  // ========== 长按录音功能 ==========
  const startRecording = async () => {
    if (!onSendAudio) return;
    if (!selectedPersona) {
      toast.error('请选择发言角色');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = recordingDuration;
        
        // 清理计时器
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        if (duration >= 1 && onSendAudio) {
          await onSendAudio(audioBlob, duration);
        } else if (duration < 1) {
          toast.error('录音时间太短');
        }
        
        setIsRecording(false);
        setRecordingDuration(0);
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // 计时器
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 60) {
            // 最长60秒，自动停止
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      toast.error('无法获取麦克风权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // 处理发送按钮：有文字时发送，无文字时长按录音
  const handleSendButtonMouseDown = (e: React.MouseEvent) => {
    if (hasContent) return;
    e.preventDefault();
    startRecording();
  };

  const handleSendButtonMouseUp = () => {
    if (hasContent) return;
    if (isRecording) {
      stopRecording();
    }
  };

  const handleSendButtonMouseLeave = () => {
    if (hasContent) return;
    if (isRecording) {
      stopRecording();
    }
  };

  const handleSendButtonTouchStart = (e: React.TouchEvent) => {
    if (hasContent) return;
    e.preventDefault();
    startRecording();
  };

  const handleSendButtonTouchEnd = () => {
    if (hasContent) return;
    if (isRecording) {
      stopRecording();
    }
  };

  // 🎨 发送表情消息
  const handleSelectEmoji = (emojiUrl: string, emojiId: string) => {
    if (!selectedPersona) {
      toast.error('请选择发言角色');
      return;
    }
    
    setSendAnimation(true);
    setTimeout(() => setSendAnimation(false), 400);
    
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

  // 快捷赠送礼物
  const handleQuickGift = (item: any) => {
    setSelectedItemForGift({
      id: item.shopItem?._id || item.itemId,
      name: item.shopItem?.name || item.name,
      image: item.shopItem?.previewImage || item.shopItem?.image || '',
      price: item.shopItem?.price || 0,
    });
    setShowGiftModal(true);
    setShowGiftMenu(false);
  };

  // 打开发红包弹窗
  const handleOpenRedPacket = () => {
    setShowRedPacketModal(true);
    setShowGiftMenu(false);
  };

  // 打开礼物菜单前加载物品
  const handleOpenGiftMenu = () => {
    if (!showGiftMenu) {
      loadUserItems();
    }
    setShowGiftMenu(!showGiftMenu);
  };

  // 格式化录音时间
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
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
                <Music2 className="w-5 h-5" />
              </motion.button>
            </div>
          )}

          {/* 🎁 礼物按钮（包含红包和赠送礼物） */}
          <div className="relative flex-shrink-0 pb-0.5" ref={giftMenuRef}>
            <motion.button
              type="button"
              onClick={handleOpenGiftMenu}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all duration-200"
              title="礼物/红包"
            >
              <Gift className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {showGiftMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 overflow-hidden"
                >
                  {/* 红包选项 */}
                  <button
                    onClick={handleOpenRedPacket}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                  >
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <Coins className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">发红包</p>
                      <p className="text-xs text-gray-400">在群里发钻石红包</p>
                    </div>
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                  {/* 快捷赠送礼物 */}
                  <div className="px-3 py-1">
                    <p className="text-xs text-gray-400 mb-2">快捷赠送</p>
                    {loadingItems ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    ) : userItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">暂无可用礼物，先去商城购买~</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {userItems.slice(0, 5).map((item) => (
                          <button
                            key={item.itemId}
                            onClick={() => handleQuickGift(item)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <img
                              src={item.shopItem?.previewImage || item.shopItem?.image || ''}
                              alt=""
                              className="w-6 h-6 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left">
                              {item.shopItem?.name || item.name}
                            </span>
                            <span className="text-xs text-yellow-500">💎{item.shopItem?.price || 0}</span>
                          </button>
                        ))}
                        {userItems.length > 5 && (
                          <button
                            onClick={() => {
                              setShowGiftMenu(false);
                              window.location.href = '/shop';
                            }}
                            className="w-full text-center text-xs text-blue-500 py-1 hover:underline"
                          >
                            查看更多...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${hasContent && !isTranslating ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
            title="简繁转换"
          >
            {isTranslating ? <motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></motion.svg> : <span className="text-sm tracking-wide">简⇄繁</span>}
          </motion.button>

          {/* 输入框容器 */}
          <div className="flex-1 min-w-0 relative">
            <div className="relative">
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
                placeholder={finalPlaceholder}
                className={`w-full rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 outline-none bg-gray-100 dark:bg-gray-800 ${isFocused ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500/50 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${aiSuggestion ? 'border-2 border-yellow-400/50' : ''}`}
                disabled={disabled}
                maxLength={2000}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="send"
              />
              
              {/* AI 建议标记和使用按钮 */}
              {aiSuggestion && (
                <button
                  onClick={handleUseSuggestion}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  使用建议
                </button>
              )}
            </div>
            
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

          {/* 发送/录音按钮 */}
          <motion.button 
            ref={sendButtonRef}
            onClick={hasContent ? handleSend : undefined}
            onMouseDown={!hasContent ? handleSendButtonMouseDown : undefined}
            onMouseUp={!hasContent ? handleSendButtonMouseUp : undefined}
            onMouseLeave={!hasContent ? handleSendButtonMouseLeave : undefined}
            onTouchStart={!hasContent ? handleSendButtonTouchStart : undefined}
            onTouchEnd={!hasContent ? handleSendButtonTouchEnd : undefined}
            disabled={disabled || (!hasContent && !onSendAudio)}
            whileTap={hasContent && !disabled ? { scale: 0.85 } : {}}
            whileHover={hasContent && !disabled ? { scale: 1.05 } : {}}
            animate={sendAnimation ? { scale: [1, 0.8, 1], rotate: [0, -15, 0] } : {}}
            transition={{ duration: 0.3 }}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              hasContent 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg active:shadow-sm' 
                : isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500'
            }`}
            title={hasContent ? "发送" : (isRecording ? `录音中 ${formatDuration(recordingDuration)}` : "长按录音")}
          >
            {hasContent ? (
              <Send className="w-4 h-4" />
            ) : isRecording ? (
              <span className="text-xs font-medium">{formatDuration(recordingDuration)}</span>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* 礼物弹窗 */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => {
          setShowGiftModal(false);
          setSelectedItemForGift(null);
        }}
        itemId={selectedItemForGift?.id || ''}
        itemName={selectedItemForGift?.name || ''}
        itemImage={selectedItemForGift?.image || ''}
        itemPrice={selectedItemForGift?.price || 0}
        onSuccess={() => {
          setShowGiftModal(false);
          setSelectedItemForGift(null);
          loadUserItems();
        }}
      />

      {/* 红包弹窗 */}
      {roomId && (
        <RedPacketModal
          isOpen={showRedPacketModal}
          onClose={() => setShowRedPacketModal(false)}
          roomId={roomId}
          onSuccess={() => {
            setShowRedPacketModal(false);
          }}
        />
      )}
    </>
  );
};

export default ChatInput;