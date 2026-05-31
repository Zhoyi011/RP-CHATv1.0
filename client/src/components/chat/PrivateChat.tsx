// client/src/components/chat/PrivateChat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../../firebase/config';
import { roomApi, type Message, type User } from '../../services/api';
import { socketService } from '../../services/socket';
import { useFriend } from '../../contexts/FriendContext';
import { extractUrls } from '../../utils/linkParser';
import { useLongPress } from '../../hooks/useLongPress';
import { ContextMenu } from '../common/ContextMenu';
import type { MenuItem } from '../common/ContextMenu';
import LinkPreviewContainer from './LinkPreviewContainer';
import toast from 'react-hot-toast';

console.log('🔧 [PrivateChat] 组件模块加载');

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface Props {
  isOpen: boolean;  // 🔥 添加 isOpen 属性
  targetUserId: string;
  targetUsername: string;
  targetAvatar?: string;
  onClose: () => void;
}

// ========== 消息气泡组件 ==========
const PrivateMessage: React.FC<{
  message: Message;
  isSelf: boolean;
  targetUsername: string;
  onMessageDeleted?: (messageId: string) => void;
  onMessageRecalled?: (messageId: string, newContent: string) => void;
}> = ({ message, isSelf, targetUsername, onMessageDeleted, onMessageRecalled }) => {
  const urls = extractUrls(message.content);
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const handleReply = useCallback(() => {
    toast.success(`回复功能开发中...`, { icon: '💬' });
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('消息已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  }, [message.content]);

  const handleDelete = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/room/message/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messageId: message._id })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('消息已删除');
        onMessageDeleted?.(message._id);
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  }, [message._id, onMessageDeleted]);

  const handleRecall = useCallback(async () => {
    const messageTime = new Date(message.createdAt).getTime();
    const diffMinutes = (Date.now() - messageTime) / 1000 / 60;
    
    if (diffMinutes > 5) {
      toast.error('只能撤回5分钟内的消息');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/room/message/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messageId: message._id })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('消息已撤回');
        onMessageRecalled?.(message._id, '该消息已被撤回');
      } else {
        toast.error(data.error || '撤回失败');
      }
    } catch (error) {
      toast.error('撤回失败');
    }
  }, [message._id, message.createdAt, onMessageRecalled]);

  const handleLongPress = useCallback((position: { x: number; y: number }) => {
    setContextMenu({ visible: true, x: position.x, y: position.y });
  }, []);

  const getMenuItems = useCallback((): MenuItem[] => {
    const items: MenuItem[] = [
      { key: 'reply', label: '回复', onClick: handleReply },
      { key: 'share', label: '分享', onClick: handleShare },
    ];
    
    if (isSelf) {
      items.push({
        key: 'delete',
        label: '删除',
        danger: true,
        onClick: handleDelete,
      });
      
      const canRecall = Date.now() - new Date(message.createdAt).getTime() <= 5 * 60 * 1000;
      if (canRecall) {
        items.push({
          key: 'recall',
          label: '撤回',
          onClick: handleRecall,
        });
      }
    }
    
    return items;
  }, [isSelf, handleReply, handleShare, handleDelete, handleRecall, message.createdAt]);

  const longPressProps = useLongPress({
    duration: 500,
    enableMobile: true,
    enableContextMenu: true,
    onLongPress: (e, pos) => {
      if (pos) handleLongPress(pos);
    },
  });

  if (message.isRecalled) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full italic">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-start gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
        isSelf ? 'justify-end' : ''
      }`}>
        {!isSelf && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {targetUsername.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className={`max-w-[70%] ${isSelf ? 'items-end' : ''}`}>
          <div className="flex items-end gap-1.5">
            <span className="text-[10px] text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            <div
              {...longPressProps}
              className={`px-3.5 py-2 rounded-2xl break-words whitespace-pre-wrap relative transition-all duration-200 ${
                isSelf 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-tr-none shadow-md' 
                  : 'bg-white text-gray-800 rounded-tl-none shadow-sm hover:shadow-md'
              }`}
            >
              <div className="text-sm leading-relaxed">
                {message.content}
              </div>
              
              {urls.length > 0 && (
                <div className={isSelf ? 'mt-1' : 'mt-1'}>
                  <LinkPreviewContainer urls={urls} isSelf={isSelf} />
                </div>
              )}
            </div>
          </div>
        </div>

        {isSelf && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
      
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={getMenuItems()}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        theme="dark"
      />
    </>
  );
};

// ========== 主组件 ==========
const PrivateChat: React.FC<Props> = ({ isOpen, targetUserId, targetUsername, targetAvatar, onClose }) => {
  console.log(`🎨 [PrivateChat] 初始化私聊, 目标用户: ${targetUsername}, isOpen: ${isOpen}`);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isCheckingFriend, setIsCheckingFriend] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;
  const { friends, sendRequest } = useFriend();
  
  // 私聊房间ID（使用用户ID排序后拼接）
  const privateRoomId = user && targetUserId 
    ? [user.uid, targetUserId].sort().join('-')
    : '';

  console.log(`📋 [PrivateChat] 私聊房间ID: ${privateRoomId}`);

  // 检查是否是好友
  useEffect(() => {
    if (!isOpen) return;
    
    const checkFriendship = () => {
      const isFriendNow = friends.some(f => f.friend.id === targetUserId);
      setIsFriend(isFriendNow);
      setIsCheckingFriend(false);
    };
    checkFriendship();
  }, [friends, targetUserId, isOpen]);

  // 加载消息（仅好友）
  useEffect(() => {
    if (!isOpen || !isFriend || !privateRoomId) return;
    
    const loadMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/private-chat/${targetUserId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setMessages(data.messages || []);
        console.log(`✅ [PrivateChat] 加载消息完成，数量: ${data.messages?.length || 0}`);
      } catch (error) {
        console.error('❌ [PrivateChat] 加载消息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    
    if (user) {
      socketService.joinRoom(privateRoomId, user.uid, 'private');
    }

    const handleNewMessage = (message: Message) => {
      console.log(`📨 [PrivateChat] 收到新消息: ${message._id}`);
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    const handleMessageRecalled = (data: { messageId: string; content: string }) => {
      setMessages(prev => prev.map(m => 
        m._id === data.messageId 
          ? { ...m, content: data.content, isRecalled: true }
          : m
      ));
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.on('message-recalled', handleMessageRecalled);

    return () => {
      socketService.leaveRoom();
      socketService.off('message-recalled', handleMessageRecalled);
    };
  }, [isOpen, isFriend, privateRoomId, targetUserId, user]);

  // 滚动到底部
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // 监听滚动位置
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!inputValue.trim() || !user || isSending || !isFriend) return;

    console.log(`📤 [PrivateChat] 发送消息: ${inputValue.substring(0, 30)}`);
    setIsSending(true);
    
    socketService.sendMessage(
      privateRoomId,
      user.uid,
      'private',
      inputValue.trim(),
      false
    );

    setInputValue('');
    inputRef.current?.focus();
    
    setTimeout(() => setIsSending(false), 300);
  };

  // 发送好友申请
  const handleSendFriendRequest = async () => {
    const success = await sendRequest(targetUserId, `你好，我是 ${localStorage.getItem('username') || '用户'}，想和你成为好友`);
    if (success) {
      toast.success('好友申请已发送');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasContent = inputValue.trim().length > 0;

  // 如果未打开，不渲染
  if (!isOpen) return null;

  // 正在检查好友状态
  if (isCheckingFriend) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-500 mt-3">加载中...</p>
        </div>
      </div>
    );
  }

  // 非好友：显示添加好友界面
  if (!isFriend) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-white/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                  {targetUsername.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-gray-800 dark:text-gray-200 truncate">{targetUsername}</h2>
                <p className="text-xs text-gray-400">还不是好友</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">还不是好友</h3>
            <p className="text-sm text-gray-500 mb-6">
              需要先添加 {targetUsername} 为好友才能开始私聊
            </p>
            <button
              onClick={handleSendFriendRequest}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              添加好友
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 好友：正常显示聊天界面
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* 聊天头部 */}
        <div className="bg-white/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                {targetUsername.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                {targetUsername}
              </h2>
              <p className="text-xs text-green-600 font-medium">好友 · 在线</p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">开始和 {targetUsername} 聊天吧</p>
              <p className="text-gray-400 text-sm mt-1">发送第一条消息打个招呼 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.userId?.firebaseUid === user?.uid || 
                            msg.userId?._id === user?.uid;
              
              return (
                <PrivateMessage
                  key={msg._id}
                  message={msg}
                  isSelf={isSelf}
                  targetUsername={targetUsername}
                  onMessageDeleted={(msgId) => {
                    setMessages(prev => prev.filter(m => m._id !== msgId));
                  }}
                  onMessageRecalled={(msgId, newContent) => {
                    setMessages(prev => prev.map(m => 
                      m._id === msgId 
                        ? { ...m, content: newContent, isRecalled: true }
                        : m
                    ));
                  }}
                />
              );
            })
          )}
          
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-all"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              最新消息
            </button>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="bg-white/95 dark:bg-gray-800/95 border-t border-gray-100 dark:border-gray-700 px-3 py-2.5 flex-shrink-0">
          <div className="flex items-end gap-1.5">
            <input 
              ref={inputRef}
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`发给 ${targetUsername}...`}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:bg-white dark:focus:bg-gray-600 transition-all"
              maxLength={2000}
              autoFocus
            />
            <button 
              onClick={handleSendMessage}
              disabled={!hasContent || isSending}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                hasContent && !isSending
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;