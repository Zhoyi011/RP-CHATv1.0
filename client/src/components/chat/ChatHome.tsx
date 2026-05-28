// client/src/components/chat/ChatHome.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';
import { useLongPress } from '../../hooks/useLongPress';
import { ContextMenu, type MenuItem } from '../common/ContextMenu';
import DesktopLayout from '../layout/DesktopLayout';
import TabletLayout from '../layout/TabletLayout';
import MobileLayout from '../layout/MobileLayout';
import CreateRoom from './CreateRoom';
import PrivateChat from './PrivateChat';
import UserList from '../user/UserList';
import ChatInput from './ChatInput';
import AIChatRoom from './AIChatRoom';
import LinkPreviewContainer from './LinkPreviewContainer';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import toast, { Toaster } from 'react-hot-toast';
import { notificationService } from '../../services/Notification';
import { roomApi, personaApi, authApi, type Room, type Persona, type Message, type User, type ReplyToInfo } from '../../services/api';
import { socketService } from '../../services/socket';
import { extractUrls } from '../../utils/linkParser';
import { parseMarkdown } from '../../utils/renderMarkdown';
import { smartConvert } from '../../services/translateApi';
import AvatarFrame from '../common/AvatarFrame';
import { useQuickSwitchPersona } from '../../hooks/useQuickSwitchPersona';
import TranslatableMessage from './TranslatableMessage';
import PatPanel from './PatPanel';

console.log('🔧 [ChatHome] 组件模块加载');

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// ========== 动画变体 ==========
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { type: 'spring' as const, damping: 20, stiffness: 300 } 
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

const patMessageVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring' as const, damping: 15, stiffness: 400 } 
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } }
};

// ========== 辅助函数 ==========
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

// ========== 时间分隔线 ==========
const shouldShowTimeDivider = (prevMsg: Message | null, currentMsg: Message): boolean => {
  if (!prevMsg) return true;
  const prevTime = new Date(prevMsg.createdAt).getTime();
  const currentTime = new Date(currentMsg.createdAt).getTime();
  const diffMinutes = (currentTime - prevTime) / 1000 / 60;
  return diffMinutes > 30;
};

const formatDividerTime = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (msgDate.getTime() === today.getTime()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (msgDate.getTime() === today.getTime() - 86400000) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else {
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
};

// ========== 回复预览组件 ==========
const ReplyPreviewBar: React.FC<{
  replyTo: ReplyToInfo;
  onCancel: () => void;
}> = ({ replyTo, onCancel }) => {
  const isHidden = replyTo.isRecalled || replyTo.isDeleted;
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border-l-4 border-blue-500 mb-2"
    >
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">回复消息</span>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {isHidden ? '[消息已不可见]' : replyTo.content}
        </p>
      </div>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

// ========== 消息气泡组件 ==========
const MessageBubble: React.FC<{
  message: Message;
  isSelf: boolean;
  isMobile: boolean;
  navigate: (path: string) => void;
  selectedPersona: Persona | null;
  onTranslate: (content: string, msgId: string) => void;
  translatingMsgId: string | null;
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
  onReply: (message: Message) => void;
}> = ({ message, isSelf, isMobile, navigate, selectedPersona, onTranslate, translatingMsgId, onLongPress, onReply }) => {
  const urls = extractUrls(message.content);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);
  
  // 拍一拍相关
  const [showPatPanel, setShowPatPanel] = useState(false);
  const [patTarget, setPatTarget] = useState<{ id: string; name: string } | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDoubleClickRef = useRef(false);
  
  // 长按事件
  const longPressProps = useLongPress({
    duration: 500,
    enableMobile: true,
    enableContextMenu: true,
    onLongPress: (e, pos) => {
      if (pos) onLongPress(message, pos);
    },
  });

  const getSenderDisplayName = () => {
    let name = message.personaId?.displayName || message.personaId?.name || '?';
    const number = message.personaId?.sameNameNumber;
    const hasNumberInName = /#\d+/.test(name);
    if (hasNumberInName) return name;
    return number ? `${name} #${number}` : name;
  };
  
  const formatBubbleTime = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const isReplyHidden = message.replyTo && (message.replyTo.isRecalled || message.replyTo.isDeleted);

  const getFrameName = (): string | null => {
    const frameUrl = message.personaId?.avatarFrame || message.personaId?.equipped?.avatarFrame;
    return getFrameNameFromUrl(frameUrl);
  };

  // 处理单击（进入详情页）
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDoubleClickRef.current) return;
    
    clickTimeoutRef.current = setTimeout(() => {
      if (!isDoubleClickRef.current && message.personaId?._id) {
        navigate(`/persona/${message.personaId._id}`);
      }
      clickTimeoutRef.current = null;
    }, 250);
  };

  // 处理双击（拍一拍）
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    isDoubleClickRef.current = true;
    
    if (message.isRecalled) {
      setTimeout(() => { isDoubleClickRef.current = false; }, 300);
      return;
    }
    
    const roomId = typeof message.roomId === 'string' ? message.roomId : message.roomId?._id;
    if (!roomId) {
      setTimeout(() => { isDoubleClickRef.current = false; }, 300);
      return;
    }
    
    setPatTarget({
      id: message.personaId?._id || '',
      name: getSenderDisplayName()
    });
    setShowPatPanel(true);
    
    setTimeout(() => { isDoubleClickRef.current = false; }, 500);
  };

  // 滑动回复处理
  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const maxOffset = 80;
    if (isSelf) {
      const newOffset = Math.max(-maxOffset, Math.min(0, info.offset.x));
      setSwipeOffset(newOffset);
    } else {
      const newOffset = Math.min(maxOffset, Math.max(0, info.offset.x));
      setSwipeOffset(newOffset);
    }
  };

  const handleDragEnd = () => {
    const threshold = 50;
    if (Math.abs(swipeOffset) >= threshold) {
      onReply(message);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      toast.success(`回复 ${getSenderDisplayName()}`, { icon: '💬', duration: 1500 });
    }
    setSwipeOffset(0);
  };

  const getBubbleClasses = () => {
    const baseClasses = "relative px-4 py-2.5 rounded-2xl max-w-full transition-all duration-200 select-text";
    if (isSelf) {
      return `${baseClasses} bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-md shadow-md`;
    }
    return `${baseClasses} bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm hover:shadow-md`;
  };

  const getBubbleStyle = (): React.CSSProperties => {
    if (swipeOffset !== 0) {
      return {
        transform: `translateX(${swipeOffset}px)`,
        transition: 'transform 0.1s ease-out',
      };
    }
    return {};
  };

  const replyButtonClasses = `absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600 transition-all duration-200 z-10 ${
    isSelf ? '-left-12' : '-right-12'
  }`;

  const roomId = typeof message.roomId === 'string' ? message.roomId : message.roomId?._id;

  return (
    <>
      <motion.div 
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`flex items-start gap-2 ${isSelf ? 'justify-end' : ''} group relative`}
      >
        {/* 对方头像 */}
        {!isSelf && (
          <AvatarFrame
            avatarUrl={message.personaId?.avatar || ''}
            frameName={getFrameName()}
            size="sm"
            className="flex-shrink-0 cursor-pointer hover:scale-105 transition"
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        )}
        
        {/* 消息主体区域 */}
        <div className={`relative ${isSelf ? 'items-end' : ''} max-w-[75%]`}>
          {/* 发送者名称 */}
          {!isSelf && (
            <div 
              onClick={() => { if (message.personaId?._id) navigate(`/persona/${message.personaId._id}`); }}
              className="flex items-baseline gap-2 mb-1 ml-1 cursor-pointer hover:text-blue-600 transition"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {getSenderDisplayName()}
              </span>
            </div>
          )}
          
          {isSelf && (
            <div className="flex justify-end mb-1 mr-1">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {getSenderDisplayName()}
              </span>
            </div>
          )}
          
          {/* 可拖拽的气泡容器 */}
          <motion.div
            ref={dragRef}
            drag={isMobile ? "x" : false}
            dragConstraints={{ left: isSelf ? -80 : 0, right: isSelf ? 0 : 80 }}
            dragElastic={0.5}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={getBubbleStyle()}
            className={getBubbleClasses()}
            {...longPressProps}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* 回复引用区域 */}
            {message.replyTo && (
              <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">回复</span>
                </div>
                <p className={`text-xs truncate ${isSelf ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isReplyHidden ? '[消息已不可见]' : message.replyTo.content}
                </p>
              </div>
            )}
            
            {/* 消息内容 */}
            <TranslatableMessage 
              content={message.content}
              isOwn={isSelf}
              className={`break-words whitespace-pre-wrap ${
                isSelf 
                  ? '[&_a]:text-yellow-200 [&_a]:underline [&_a]:hover:text-yellow-100 [&_a]:break-all' 
                  : '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800 dark:[&_a]:text-blue-400 [&_a]:break-all'
              }`}
            />
            
            {/* 链接预览 */}
            {urls.length > 0 && <LinkPreviewContainer urls={urls} isSelf={isSelf} />}
            
            {/* 时间戳 */}
            <div className={`flex items-center gap-1 mt-1.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isSelf ? 'text-blue-200' : 'text-gray-400'}`}>
                {formatBubbleTime(new Date(message.createdAt))}
              </span>
            </div>
          </motion.div>

          {/* 回复按钮 */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onReply(message)}
            className={`${replyButtonClasses} opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95`}
            title="回复"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </motion.button>
        </div>

        {/* 自己头像 */}
        {isSelf && selectedPersona && (
          <AvatarFrame
            avatarUrl={selectedPersona.avatar || ''}
            frameName={getFrameNameFromUrl(selectedPersona.avatarFrame || selectedPersona.equipped?.avatarFrame)}
            size="sm"
            className="flex-shrink-0 cursor-pointer"
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        )}
      </motion.div>

      {/* 拍一拍面板 */}
      {patTarget && roomId && (
        <PatPanel
          isOpen={showPatPanel}
          onClose={() => {
            setShowPatPanel(false);
            setPatTarget(null);
          }}
          targetPersonaId={patTarget.id}
          targetPersonaName={patTarget.name}
          roomId={roomId}
          onSuccess={() => {}}
        />
      )}
    </>
  );
};

// ========== 消息列表组件 ==========
const MessageList: React.FC<{
  messages: Message[];
  user: any;
  selectedPersona: Persona | null;
  isMobile: boolean;
  navigate: (path: string) => void;
  onMessagesChange?: (newMessages: Message[]) => void;
  onReply: (message: Message) => void;
  onRecall: (message: Message) => void;
  onDeleteSelf: (message: Message) => void;
}> = ({ messages, user, selectedPersona, isMobile, navigate, onMessagesChange, onReply, onRecall, onDeleteSelf }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleShare = useCallback(async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('消息已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  }, []);

  const handleMessageLongPress = useCallback((message: Message, position: { x: number; y: number }) => {
    setContextMenu({ visible: true, x: position.x, y: position.y, message });
  }, []);

  const getMenuItems = useCallback((message: Message): MenuItem[] => {
    const isSelf = selectedPersona && message.personaId?._id === selectedPersona._id;
    const canRecall = isSelf && !message.isRecalled && (Date.now() - new Date(message.createdAt).getTime()) <= 5 * 60 * 1000;
    const canDelete = isSelf && !message.isDeleted;
    
    const items: MenuItem[] = [
      { key: 'reply', label: '回复', onClick: () => onReply(message) },
      { key: 'share', label: '分享', onClick: () => handleShare(message) },
    ];
    
    if (canRecall) {
      items.push({ key: 'recall', label: '撤回消息', onClick: () => onRecall(message) });
    }
    
    if (canDelete) {
      items.push({ key: 'delete', label: '删除（仅自己）', danger: true, onClick: () => onDeleteSelf(message) });
    }
    
    return items;
  }, [selectedPersona, onReply, handleShare, onRecall, onDeleteSelf]);

  const handleTranslate = async (content: string, msgId: string) => {
    if (translatingMsgId === msgId) return;
    setTranslatingMsgId(msgId);
    try {
      const translated = await smartConvert(content);
      toast.success(`译文：${translated}`, { duration: 5000 });
    } catch { 
      toast.error('翻译失败'); 
    } finally { 
      setTranslatingMsgId(null); 
    }
  };

  if (messages.length === 0) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-8">还没有消息，开始聊天吧 👋</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const showDivider = shouldShowTimeDivider(prevMsg, msg);
        
        return (
          <React.Fragment key={msg._id}>
            {showDivider && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center my-4"
              >
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  {formatDividerTime(new Date(msg.createdAt))}
                </span>
              </motion.div>
            )}
            
            {(() => {
              // 撤回消息
              if (msg.isRecalled) {
                return (
                  <motion.div 
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex justify-center my-1"
                  >
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full italic">
                      {msg.content}
                    </span>
                  </motion.div>
                );
              }
              
              // 系统消息
              if (msg.userId?._id === 'system') {
                return (
                  <motion.div 
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex justify-center my-1"
                  >
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </motion.div>
                );
              }
              
              // 🔥 拍一拍消息 - 通过内容关键词判断
                const patKeywords = ['拍了拍', '抱了抱', '亲了亲', '贴了贴', '戳了戳', '揉了揉', '摸了摸', '点了点', '推了推', '挠了挠'];
                const isPatByContent = patKeywords.some(keyword => msg.content.includes(keyword));
                const isPat = msg.isPat || (msg.isAction && isPatByContent);

                if (isPat) {
                  return (
                    <motion.div 
                      variants={patMessageVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex justify-center my-1"
                    >
                      <motion.span 
                        whileHover={{ scale: 1.02 }}
                        className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full cursor-default shadow-sm"
                      >
                        ✨ {msg.content} ✨
                      </motion.span>
                    </motion.div>
                  );
                }
              
              // 普通动作消息
              if (msg.isAction) {
                return (
                  <motion.div 
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex justify-center my-1"
                  >
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                      * {msg.personaId?.displayName || msg.personaId?.name} {msg.content} *
                    </span>
                  </motion.div>
                );
              }
              
              // 普通消息气泡
              const isSelf = selectedPersona && msg.personaId?._id === selectedPersona._id;
              
              return (
                <MessageBubble
                  message={msg}
                  isSelf={isSelf}
                  isMobile={isMobile}
                  navigate={navigate}
                  selectedPersona={selectedPersona}
                  onTranslate={handleTranslate}
                  translatingMsgId={translatingMsgId}
                  onLongPress={handleMessageLongPress}
                  onReply={onReply}
                />
              );
            })()}
          </React.Fragment>
        );
      })}
      <div ref={messagesEndRef} />
      
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.message ? getMenuItems(contextMenu.message) : []}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        theme="dark"
      />
    </motion.div>
  );
};

// ========== 主组件 ==========
const ChatHome = () => {
  console.log('🎨 [ChatHome] 主组件渲染');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [roomPersonas, setRoomPersonas] = useState<Persona[]>([]);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showUserList, setShowUserList] = useState(tabParam === 'private');
  const [showAIChat, setShowAIChat] = useState(tabParam === 'ai');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  
  const [showPersonaQuickSwitch, setShowPersonaQuickSwitch] = useState(false);
  const [personaSearchTerm, setPersonaSearchTerm] = useState('');
  const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
  const personaSwitchPanelRef = useRef<HTMLDivElement>(null);

  const saveLastUsedPersona = useCallback((personaId: string) => {
    localStorage.setItem('lastUsedPersonaId', personaId);
  }, []);

  const loadAvailablePersonas = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${selectedRoom._id}/my-personas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const available = data.filter((p: Persona) => p.status === 'approved');
        setAvailablePersonas(available);
      } else {
        setAvailablePersonas([]);
      }
    } catch (error) {
      console.error('加载可用角色失败:', error);
      setAvailablePersonas([]);
    }
  }, [selectedRoom]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaSwitchPanelRef.current && !personaSwitchPanelRef.current.contains(e.target as Node)) {
        setShowPersonaQuickSwitch(false);
        setPersonaSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadAvailablePersonas();
    }
  }, [selectedRoom, loadAvailablePersonas]);

  const handleQuickSwitchPersona = useCallback(async (persona: Persona) => {
    if (!selectedRoom) return;
    
    if (selectedPersona?._id === persona._id) {
      setShowPersonaQuickSwitch(false);
      return;
    }
    
    try {
      await roomApi.setActivePersona(persona._id);
      setSelectedPersona(persona);
      saveLastUsedPersona(persona._id);
      
      const token = localStorage.getItem('token');
      const roomsRes = await fetch(`${API_BASE}/room/my-rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await roomsRes.json();
      setRooms(data.rooms || []);
      if (data.currentPersona) setCurrentPersona(data.currentPersona);
      
      if (selectedRoom && user) {
        socketService.switchPersona(user.uid, persona._id);
      }
      
      toast.success(`已切换至 ${persona.displayName || persona.name}`, { icon: '🎭', duration: 2000 });
      setShowPersonaQuickSwitch(false);
      setPersonaSearchTerm('');
    } catch (err: any) {
      toast.error(err.message || '切换失败');
    }
  }, [selectedRoom, selectedPersona, user, saveLastUsedPersona]);

  const { personaCount } = useQuickSwitchPersona({
    enabled: selectedRoom !== null && availablePersonas.length > 1,
    personas: availablePersonas,
    currentPersona: selectedPersona,
    onSwitch: handleQuickSwitchPersona,
    shortcutKey: 'Tab'
  });
  const filteredPersonas = availablePersonas.filter(p =>
    (p.displayName || p.name).toLowerCase().includes(personaSearchTerm.toLowerCase())
  );

  const handleMessagesChange = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  const fetchPendingCount = useCallback(async () => {
    if (!selectedRoom || (!isRoomAdmin && !isRoomOwner)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${selectedRoom._id}/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setPendingCount(Array.isArray(data) ? data.length : 0);
    } catch (error) { console.error('获取待审核数量失败:', error); }
  }, [selectedRoom, isRoomAdmin, isRoomOwner]);

  useEffect(() => {
    if (selectedRoom && (isRoomAdmin || isRoomOwner)) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom, isRoomAdmin, isRoomOwner, fetchPendingCount]);

  const handleRecall = useCallback(async (message: Message) => {
    const diffMinutes = (Date.now() - new Date(message.createdAt).getTime()) / 1000 / 60;
    if (diffMinutes > 5) {
      toast.error('只能撤回5分钟内的消息');
      return;
    }
    
    try {
      await roomApi.recallMessage(message._id);
      toast.success('消息已撤回');
      
      setMessages(prev => prev.map(msg => 
        msg._id === message._id 
          ? { 
              ...msg, 
              content: `${msg.personaId?.displayName || msg.personaId?.name || '用户'} 撤回了一条消息`, 
              isRecalled: true 
            }
          : msg
      ));
    } catch (error: any) {
      toast.error(error.message || '撤回失败');
    }
  }, []);

  const handleDeleteSelf = useCallback(async (message: Message) => {
    if (!confirm('删除后仅你自己看不到这条消息，其他人仍可见。确定吗？')) return;
    
    try {
      await roomApi.deleteMessage(message._id);
      toast.success('消息已删除（仅自己不可见）');
      setMessages(prev => prev.filter(m => m._id !== message._id));
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  }, []);

  const handleReply = useCallback((message: Message) => {
    setReplyToMessage(message);
    toast.success(`正在回复 ${message.personaId?.displayName || message.personaId?.name}`, { icon: '💬', duration: 2000 });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { navigate('/'); return; }
      setUser(firebaseUser);
      setAuthChecked(true);
      try { const token = localStorage.getItem('token'); if (token) await authApi.getCurrentUser(); } catch {}
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked || !user) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const [roomsRes, personasData, activePersonaRes] = await Promise.all([
          fetch(`${API_BASE}/room/my-rooms`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          personaApi.getMyPersonas(),
          roomApi.getActivePersona()
        ]);
        setRooms(roomsRes.rooms || []);
        if (roomsRes.currentPersona) setCurrentPersona(roomsRes.currentPersona);
        const approved = personasData.filter((p: Persona) => p.status === 'approved');
        setPersonas(approved);
        
        if (activePersonaRes.activePersona) {
          setSelectedPersona(activePersonaRes.activePersona.personaId);
        } else if (approved.length > 0) {
          const lastUsedId = localStorage.getItem('lastUsedPersonaId');
          if (lastUsedId) {
            const lastUsed = approved.find(p => p._id === lastUsedId);
            if (lastUsed) {
              await roomApi.setActivePersona(lastUsed._id);
              setSelectedPersona(lastUsed);
            } else {
              await roomApi.setActivePersona(approved[0]._id);
              setSelectedPersona(approved[0]);
            }
          } else {
            await roomApi.setActivePersona(approved[0]._id);
            setSelectedPersona(approved[0]);
          }
        }
      } catch (err: any) { setError(err.message || '加载失败'); } finally { setLoading(false); }
    };
    loadData();
  }, [authChecked, user]);

  useEffect(() => {
    const handlePersonaChanged = (e: CustomEvent) => {
      const newPersona = e.detail;
      if (newPersona) {
        setSelectedPersona(newPersona);
        setCurrentPersona(newPersona);
      }
    };
    
    window.addEventListener('personaChanged', handlePersonaChanged as EventListener);
    return () => window.removeEventListener('personaChanged', handlePersonaChanged as EventListener);
  }, []);

  useEffect(() => {
    if (!selectedRoom || !selectedPersona) return;
    const loadPermissions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/room/${selectedRoom._id}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { setIsRoomAdmin(false); setIsRoomOwner(false); return; }
        const members = await res.json();
        const current = members.find((m: any) => m.personaId?._id === selectedPersona._id);
        setIsRoomAdmin(current?.role === 'admin' || current?.role === 'owner');
        setIsRoomOwner(current?.role === 'owner');
      } catch { setIsRoomAdmin(false); setIsRoomOwner(false); }
    };
    loadPermissions();
  }, [selectedRoom, selectedPersona]);

  const loadRoomPersonas = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${selectedRoom._id}/my-personas`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRoomPersonas(data);
        if (!data.find((p: Persona) => p._id === selectedPersona?._id)) setSelectedPersona(data[0]);
      }
    } catch (error) { console.error('加载群 Persona 失败:', error); }
  }, [selectedRoom, selectedPersona]);

  useEffect(() => { if (selectedRoom) loadRoomPersonas(); }, [selectedRoom]);

  useEffect(() => {
    if (!authChecked || !user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    socketService.connect(token);

    const handleNewMessage = (message: Message) => {
      const isSelf = selectedPersona && message.personaId?._id === selectedPersona._id;
      if (!isSelf) {
        const frameName = getFrameNameFromUrl(message.personaId?.avatarFrame || message.personaId?.equipped?.avatarFrame);
        toast.custom((t) => (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 flex items-center gap-3 cursor-pointer ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
            onClick={() => toast.dismiss(t.id)}>
            <AvatarFrame
              avatarUrl={message.personaId?.avatar || ''}
              frameName={frameName}
              size="sm"
              className="notification"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">{message.personaId?.displayName || message.personaId?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{message.content}</p>
            </div>
          </div>
        ), { duration: 3000, position: 'top-right' });
        notificationService.onNewMessage(message);
      }
      setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
      const msgRoomId = typeof message.roomId === 'string' ? message.roomId : message.roomId?._id;
      if (msgRoomId && selectedRoom && selectedRoom._id !== msgRoomId) {
        setRooms(prev => prev.map(room => room._id === msgRoomId ? { ...room, unreadCount: (room.unreadCount || 0) + 1 } : room));
      }
    };

    const handleMessageRecalled = (data: { messageId: string; recalledByName: string }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, content: `${msg.personaId?.displayName || msg.personaId?.name || '用户'} 撤回了一条消息`, isRecalled: true }
          : msg
      ));
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      console.log('其他用户删除了消息:', data.messageId);
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.on('message-recalled', handleMessageRecalled);
    socketService.on('message-deleted', handleMessageDeleted);
    socketService.onRoomOnlineCount((data) => {
      setRooms(prev => prev.map(room => room._id === data.roomId ? { ...room, onlineCount: data.count } : room));
    });

    return () => {
      socketService.off('message-recalled', handleMessageRecalled);
      socketService.off('message-deleted', handleMessageDeleted);
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [authChecked, user, selectedPersona, selectedRoom]);

  useEffect(() => {
    if (!selectedRoom || !selectedPersona || !user) return;
    const loadMessages = async () => {
      try {
        const data = await roomApi.getMessages(selectedRoom._id);
        if (Array.isArray(data)) {
          setMessages(data);
        }
        socketService.joinRoom(selectedRoom._id, user.uid, selectedPersona._id);
      } catch (err) { console.error('加载消息失败:', err); }
    };
    loadMessages();
    return () => { socketService.leaveRoom(); };
  }, [selectedRoom, selectedPersona, user]);

  const handleSelectRoom = useCallback(async (room: Room) => {
    let persona = selectedPersona;
    
    if (!persona) {
      const lastUsedId = localStorage.getItem('lastUsedPersonaId');
      if (lastUsedId && personas.length > 0) {
        persona = personas.find(p => p._id === lastUsedId);
        if (persona) {
          try {
            await roomApi.setActivePersona(persona._id);
            setSelectedPersona(persona);
          } catch (e) {
            console.error('恢复角色失败:', e);
          }
        }
      }
    }
    
    if (!persona) { 
      toast.error('请先选择一个角色'); 
      return; 
    }
    
    try { 
      await roomApi.markRead(room._id); 
      setRooms(prev => prev.map(r => r._id === room._id ? { ...r, unreadCount: 0 } : r)); 
    } catch {}
    
    setSelectedRoom(room);
    setSelectedUser(null);
    setShowUserList(false);
    setShowAIChat(false);
    setReplyToMessage(null);
    if (isMobile) setShowChatWindow(true);
  }, [selectedPersona, personas, isMobile]);

  const handleSelectUser = useCallback((targetUser: User) => {
    setSelectedUser(targetUser);
    setSelectedRoom(null);
    setShowUserList(false);
    setShowAIChat(false);
    setReplyToMessage(null);
    if (isMobile) setShowChatWindow(true);
  }, [isMobile]);

  const handleSelectPersona = useCallback(async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setSelectedPersona(persona);
      saveLastUsedPersona(persona._id);
      const token = localStorage.getItem('token');
      const roomsRes = await fetch(`${API_BASE}/room/my-rooms`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await roomsRes.json();
      setRooms(data.rooms || []);
      if (data.currentPersona) setCurrentPersona(data.currentPersona);
      if (selectedRoom && user) socketService.switchPersona(user.uid, persona._id);
    } catch (err: any) { toast.error(err.message || '切换失败'); }
  }, [selectedRoom, user, saveLastUsedPersona]);

  const handleSwitchRoomPersona = useCallback(async (persona: Persona) => {
    setSelectedPersona(persona);
    saveLastUsedPersona(persona._id);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/room/active-persona`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId: persona._id })
      });
    } catch {}
  }, [saveLastUsedPersona]);

  const handleSendMessage = useCallback((content: string, isAction = false, personaId?: string) => {
    if (!selectedRoom || !user) { toast.error('请先选择聊天室'); return; }
    if (!content.trim()) return;
    const pid = personaId || selectedPersona?._id;
    if (!pid) { toast.error('请选择发言角色'); return; }
    
    socketService.emit('send-message', {
      roomId: selectedRoom._id,
      userId: user.uid,
      personaId: pid,
      content: isAction ? `/me ${content}` : content,
      isAction,
      replyToId: replyToMessage?._id
    });
    
    setReplyToMessage(null);
  }, [selectedRoom, selectedPersona, user, replyToMessage]);

  const handleBackToList = useCallback(() => { 
    setShowChatWindow(false); 
    setSelectedUser(null);
    setSelectedRoom(null);
    setShowAIChat(false);
    setReplyToMessage(null);
  }, []);

  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;
    toast.custom((t) => (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm mx-4 border border-gray-100 dark:border-gray-700 ${t.visible ? 'animate-in fade-in slide-in-from-bottom-2' : 'animate-out fade-out slide-out-to-bottom-2'}`}>
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">退出群聊</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">确定要退出「{selectedRoom.name}」吗？</p>
        <div className="flex gap-3">
          <button onClick={() => toast.dismiss(t.id)} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">取消</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`${API_BASE}/room/${selectedRoom._id}/leave`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
              });
              const data = await res.json();
              if (res.ok) {
                toast.success(data.message || '已退出');
                const roomsRes = await fetch(`${API_BASE}/room/my-rooms`, { headers: { 'Authorization': `Bearer ${token}` } });
                const roomsData = await roomsRes.json();
                setRooms(roomsData.rooms || []);
                setSelectedRoom(null);
                setMessages([]);
                setReplyToMessage(null);
              } else toast.error(data.error || '退出失败');
            } catch { toast.error('退出失败'); }
          }} className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition shadow-md">确定退出</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleReport = () => toast('举报功能开发中，请通过邮件联系我们：zhoyi.lee@gmail.com', { icon: '📧', duration: 5000 });

  if (!authChecked) return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><div className="text-white/60 text-lg animate-pulse">加载中...</div></div>;
  if (error) return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-center"><div className="text-6xl mb-4">😢</div><p className="text-red-500 mb-6">{error}</p><button onClick={() => window.location.reload()} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition">重试</button></div></div>;

  const renderChatList = () => (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 flex items-center text-gray-400">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="搜索聊天" className="bg-transparent flex-1 outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 text-sm" />
        </div>
      </div>
      <div className="px-4 py-2 flex-shrink-0">
        <button onClick={() => setShowCreateRoom(true)} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition flex items-center justify-center gap-2 shadow-md text-sm font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>创建新聊天室
        </button>
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <button 
          onClick={() => { setShowAIChat(true); setShowUserList(false); setSelectedRoom(null); setSelectedUser(null); setShowChatWindow(isMobile); }} 
          className={`flex-1 py-2.5 text-sm font-medium transition relative ${showAIChat ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          🤖 AI 对戏
          {showAIChat && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />}
        </button>
        <button 
          onClick={() => { setShowAIChat(false); setShowUserList(false); setSelectedUser(null); setShowChatWindow(isMobile); }} 
          className={`flex-1 py-2.5 text-sm font-medium transition relative ${!showUserList && !showAIChat ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          群聊
          {!showUserList && !showAIChat && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />}
        </button>
        <button 
          onClick={() => { setShowUserList(true); setShowAIChat(false); setSelectedRoom(null); setShowChatWindow(isMobile); }} 
          className={`flex-1 py-2.5 text-sm font-medium transition relative ${showUserList ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          私聊
          {showUserList && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {showCreateRoom && <CreateRoom onClose={() => setShowCreateRoom(false)} onSuccess={() => window.location.reload()} />}
        {showUserList ? <UserList onSelectUser={handleSelectUser} /> :
          showAIChat ? null :
          loading ? <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div> :
          rooms.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3 px-4">
              <svg className="w-20 h-20 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-gray-400 dark:text-gray-500">还没有加入任何聊天室</p>
              <button onClick={() => setShowCreateRoom(true)} className="mt-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transition shadow-md">创建新聊天室 →</button>
            </div>
          ) : (
            rooms.map(room => (
              <div 
                key={room._id} 
                onClick={() => handleSelectRoom(room)} 
                className={`px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 active:bg-gray-100 transition ${selectedRoom?._id === room._id && !isMobile ? 'bg-blue-50 dark:bg-gray-800 border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {room.name.charAt(0)}
                    </div>
                    {room.onlineCount ? (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white font-medium">
                        {room.onlineCount}
                      </div>
                    ) : (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">{room.name}</h3>
                        {room.unreadCount > 0 ? (
                          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{room.messageCount || 0} 条</span>
                    </div>
                    
                    {room.lastMessage ? (
                      <div className="mt-0.5">
                        {room.lastMessage.isAction ? (
                          <p className="text-xs text-purple-500 dark:text-purple-400 truncate">
                            * {room.lastMessage.senderName} {room.lastMessage.content} *
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 truncate">
                            <span className="font-medium text-gray-500 dark:text-gray-400">{room.lastMessage.senderName}:</span>{' '}
                            {room.lastMessage.content.length > 35 ? room.lastMessage.content.substring(0, 35) + '...' : room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">暂无消息</p>
                    )}
                    
                    <p className="text-[10px] text-gray-400 mt-0.5">群主: {room.creatorName || '?'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
      </div>
    </div>
  );

  const renderChatWindow = () => {
    if (isMobile && !showChatWindow) return null;
    
    if (showAIChat) {
      return <AIChatRoom onClose={isMobile ? handleBackToList : undefined} />;
    }
    
    if (selectedUser) {
      return <PrivateChat targetUser={selectedUser} onClose={handleBackToList} />;
    }
    
    if (!selectedRoom) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          选择一个聊天室开始聊天
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          {isMobile && <button onClick={handleBackToList} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md">{selectedRoom?.name?.charAt(0) || '?'}</div>
              {selectedRoom?.onlineCount ? <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">{selectedRoom.onlineCount}</div> : <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>}
            </div>
            <div className="min-w-0 flex-1"><h2 className="font-medium text-gray-800 dark:text-gray-200 truncate">{selectedRoom?.name || '请选择聊天室'}</h2><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedPersona ? `发言: ${selectedPersona.displayName || selectedPersona.name}` : '请先选择角色'}</p></div>
          </div>
          <div className="flex items-center gap-1">
            {selectedRoom && (isRoomAdmin || isRoomOwner) && (
              <button onClick={() => navigate(`/room/${selectedRoom._id}/pending`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition relative" title="待审核申请">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {pendingCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
            )}
            {selectedRoom && (
              <button onClick={() => setShowRoomMenu(!showRoomMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition" title="群菜单">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 bg-inherit">
          <MessageList 
            messages={messages} 
            user={user} 
            selectedPersona={selectedPersona} 
            isMobile={isMobile} 
            navigate={navigate}
            onMessagesChange={handleMessagesChange}
            onReply={handleReply}
            onRecall={handleRecall}
            onDeleteSelf={handleDeleteSelf}
          />
        </div>

        {replyToMessage && (
          <div className="px-4">
            <ReplyPreviewBar
              replyTo={{
                _id: replyToMessage._id,
                content: replyToMessage.content,
                isRecalled: replyToMessage.isRecalled || false,
                isDeleted: replyToMessage.isDeleted || false
              }}
              onCancel={handleCancelReply}
            />
          </div>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!selectedRoom}
          roomId={selectedRoom?._id}
          selectedPersona={selectedPersona}
          roomPersonas={roomPersonas}
          onSwitchPersona={handleSwitchRoomPersona}
          onLoadRoomPersonas={loadRoomPersonas}
          placeholder="输入消息... "
        />
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-inherit">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 3000,
          className: '!bg-gray-800 !text-white dark:!bg-gray-800 dark:!text-white !rounded-xl !shadow-lg',
          style: { background: '#1f2937', color: '#ffffff', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: '500' },
          success: { className: '!bg-green-600 !text-white', style: { background: '#10b981', color: '#ffffff' } },
          error: { className: '!bg-red-600 !text-white', style: { background: '#ef4444', color: '#ffffff' } },
          loading: { className: '!bg-blue-600 !text-white', style: { background: '#3b82f6', color: '#ffffff' } },
        }} 
      />
      {isDesktop && (
        <DesktopLayout>
          <div className="h-full flex">
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
              {renderChatList()}
            </div>
            <div className="flex-1 bg-inherit">
              {renderChatWindow()}
            </div>
          </div>
        </DesktopLayout>
      )}
      {isTablet && (
        <TabletLayout>
          <div className="h-full flex">
            <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
              {renderChatList()}
            </div>
            <div className="flex-1 bg-inherit">
              {renderChatWindow()}
            </div>
          </div>
        </TabletLayout>
      )}
      {isMobile && (
        <MobileLayout>
          <div className="h-full bg-inherit">
            {!showChatWindow ? renderChatList() : renderChatWindow()}
          </div>
        </MobileLayout>
      )}
      
      <AnimatePresence>
        {showRoomMenu && selectedRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999]" onClick={() => setShowRoomMenu(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="absolute right-4 top-20 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { navigate(`/group/${selectedRoom._id}`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition">群资料</button>
              <button onClick={() => { navigate(`/room/${selectedRoom._id}/members`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition">成员列表</button>
              {(isRoomAdmin || isRoomOwner) && <button onClick={() => { navigate(`/group/${selectedRoom._id}/settings`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-3 transition">群管理</button>}
              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
              <button onClick={() => { handleReport(); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 flex items-center gap-3 transition">举报群组</button>
              <button onClick={() => { setShowRoomMenu(false); setTimeout(handleLeaveRoom, 150); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 transition">退出群聊</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatHome;