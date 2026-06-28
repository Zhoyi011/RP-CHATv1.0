// client/src/components/chat/MessageBubble.tsx
import React, { useState, useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLongPress } from '../../hooks/useLongPress';
import { useResponsive } from '../../hooks/useResponsive';
import AvatarFrame from '../common/AvatarFrame';
import { LevelBadge } from '../common/LevelBadge';
import TranslatableMessage from './TranslatableMessage';
import LinkPreviewContainer from './LinkPreviewContainer';
import PatPanel from './PatPanel';
import { type Message, type Persona } from '../../services/api';
import { extractUrls } from '../../utils/linkParser';
import toast from 'react-hot-toast';

// ========== 辅助函数 ==========
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

// ========== 检查消息类型 ==========
const isMusicMessage = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed?.type === 'music';
  } catch {
    return false;
  }
};

const isGiftMessage = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed?.type === 'gift';
  } catch {
    return false;
  }
};

const isRedPacketMessage = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed?.type === 'redpacket' || 
           parsed?.type === 'random' || 
           parsed?.type === 'fixed' || 
           parsed?.type === 'personal';
  } catch {
    return false;
  }
};

// ========== 动画变体 ==========
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

// ========== 子组件：回复预览 ==========
const ReplyPreview: React.FC<{
  replyTo: { content: string; isRecalled: boolean; isDeleted: boolean };
  isSelf: boolean;
}> = ({ replyTo, isSelf }) => {
  const isHidden = replyTo.isRecalled || replyTo.isDeleted;
  return (
    <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 mb-1">
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">回复</span>
      </div>
      <p className={`text-xs truncate ${isSelf ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
        {isHidden ? '[消息已不可见]' : replyTo.content}
      </p>
    </div>
  );
};

// ========== 主组件 ==========
interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  isMobile: boolean;
  navigate: (path: string) => void;
  selectedPersona: Persona | null;
  onTranslate: (content: string, msgId: string) => void;
  translatingMsgId: string | null;
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
  onReply: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isMobile,
  navigate,
  selectedPersona,
  onTranslate,
  translatingMsgId,
  onLongPress,
  onReply,
}) => {
  const urls = extractUrls(message.content);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);
  
  const [showPatPanel, setShowPatPanel] = useState(false);
  const [patTarget, setPatTarget] = useState<{ id: string; name: string } | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDoubleClickRef = useRef(false);

  // ========== 长按 ==========
  const longPressProps = useLongPress({
    duration: 500,
    enableMobile: true,
    enableContextMenu: true,
    onLongPress: (e, pos) => {
      if (pos) onLongPress(message, pos);
    },
  });

  // ========== 获取发送者名称 ==========
  const getSenderDisplayName = (): string => {
    let name = message.personaId?.displayName || message.personaId?.name || '?';
    const number = message.personaId?.sameNameNumber;
    const hasNumberInName = /#\d+/.test(name);
    if (hasNumberInName) return name;
    return number ? `${name} #${number}` : name;
  };

  // ========== 格式化时间 ==========
  const formatBubbleTime = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // ========== 获取头像框名称 ==========
  const getFrameName = (): string | null => {
    const frameUrl = message.personaId?.avatarFrame || message.personaId?.equipped?.avatarFrame;
    return getFrameNameFromUrl(frameUrl);
  };

  // ========== 获取等级 ==========
  const getSenderLevel = (): number => {
    return message.personaId?.level || 1;
  };

  const getSenderTitle = (): string => {
    return message.personaId?.title || '🌱 初入万物';
  };

  // ========== 点击事件（单击跳转角色页，双击拍一拍） ==========
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

  // ========== 滑动回复 ==========
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

  // ========== 气泡样式 ==========
  const getBubbleClasses = (): string => {
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

  const isReplyHidden = message.replyTo && (message.replyTo.isRecalled || message.replyTo.isDeleted);
  const roomId = typeof message.roomId === 'string' ? message.roomId : message.roomId?._id;

  // ========== 渲染 ==========
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
        
        {/* 消息内容容器 */}
        <div className={`relative ${isSelf ? 'items-end' : ''} max-w-[75%]`}>
          {/* 发送者名称 + 等级 + 头衔 */}
          {!isSelf && (
            <div 
              onClick={() => { if (message.personaId?._id) navigate(`/persona/${message.personaId._id}`); }}
              className="flex items-center gap-1.5 mb-1 ml-1 cursor-pointer hover:text-blue-600 transition flex-wrap"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {getSenderDisplayName()}
              </span>
              {/* 🆕 等级徽章 */}
              <LevelBadge level={getSenderLevel()} size="sm" />
              {/* 🆕 头衔 */}
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {getSenderTitle()}
              </span>
            </div>
          )}
          
          {/* 自己的名称 */}
          {isSelf && (
            <div className="flex items-center justify-end gap-1.5 mb-1 mr-1 flex-wrap">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {getSenderTitle()}
              </span>
              <LevelBadge level={getSenderLevel()} size="sm" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {getSenderDisplayName()}
              </span>
            </div>
          )}
          
          {/* 消息气泡 */}
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
            {/* 回复引用 */}
            {message.replyTo && (
              <ReplyPreview 
                replyTo={message.replyTo} 
                isSelf={isSelf} 
              />
            )}
            
            {/* 消息内容 */}
            <TranslatableMessage 
              content={message.content}
              isOwn={isSelf}
              isAudio={message.isAudio}
              audioUrl={message.audioUrl}
              audioDuration={message.audioDuration}
              className={`break-words whitespace-pre-wrap ${
                isSelf 
                  ? '[&_a]:text-yellow-200 [&_a]:underline [&_a]:hover:text-yellow-100 [&_a]:break-all' 
                  : '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800 dark:[&_a]:text-blue-400 [&_a]:break-all'
              }`}
            />
            
            {/* 链接预览 */}
            {!isMusicMessage(message.content) && urls.length > 0 && (
              <LinkPreviewContainer urls={urls} isSelf={isSelf} />
            )}
            
            {/* 时间戳 */}
            <div className={`flex items-center gap-1 mt-1.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isSelf ? 'text-blue-200' : 'text-gray-400'}`}>
                {formatBubbleTime(new Date(message.createdAt))}
              </span>
            </div>
          </motion.div>

          {/* 回复按钮（悬浮） */}
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

        {/* 自己的头像 */}
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

// ========== 导出 ==========
export default MessageBubble;