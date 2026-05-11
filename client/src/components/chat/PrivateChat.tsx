import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../firebase/config';
import { roomApi, type Message, type User } from '../../services/api';
import { socketService } from '../../services/socket';
import { extractUrls } from '../../utils/linkParser';
import LinkPreviewContainer from './LinkPreviewContainer';

interface Props {
  targetUser: User;
  onClose?: () => void;
}

// ========== 消息气泡组件 ==========
const PrivateMessage: React.FC<{
  message: Message;
  isSelf: boolean;
  targetUser: User;
}> = ({ message, isSelf, targetUser }) => {
  const urls = extractUrls(message.content);

  return (
    <div className={`flex items-start gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
      isSelf ? 'justify-end' : ''
    }`}>
      {/* 对方头像 */}
      {!isSelf && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
          {targetUser.username.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className={`max-w-[70%] ${isSelf ? 'items-end' : ''}`}>
        <div className="flex items-end gap-1.5">
          {/* 时间戳 */}
          <span className="text-[10px] text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className={`px-3.5 py-2 rounded-2xl break-words whitespace-pre-wrap relative ${
            isSelf 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-tr-none shadow-md' 
              : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
          }`}>
            <div className="text-sm leading-relaxed">
              {message.content}
            </div>
            
            {/* 链接预览 */}
            {urls.length > 0 && (
              <div className={isSelf ? 'mt-1' : 'mt-1'}>
                <LinkPreviewContainer urls={urls} isSelf={isSelf} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 自己头像 */}
      {isSelf && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
          {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
    </div>
  );
};

// ========== 主组件 ==========
const PrivateChat: React.FC<Props> = ({ targetUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;
  const privateRoomId = [user?.uid, targetUser._id].sort().join('-');

  // 加载消息
  useEffect(() => {
    loadMessages();
    
    if (user) {
      socketService.joinRoom(privateRoomId, user.uid, 'private');
    }

    const handleNewMessage = (message: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.leaveRoom();
      socketService.removeAllListeners();
    };
  }, [privateRoomId, user]);

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getMessages(privateRoomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  // 发送消息（带动画）
  const handleSendMessage = () => {
    if (!inputValue.trim() || !user || isSending) return;

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

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasContent = inputValue.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 聊天头部 */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
        {/* 关闭按钮 + 滑动动画 */}
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90 group"
          title="关闭私聊"
        >
          <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 头像 + 在线状态 */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          
          {/* 用户信息 */}
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-gray-800 truncate">
              {targetUser.username}
            </h2>
            <p className="text-xs text-green-600 font-medium">在线</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin relative"
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
          <div className="text-center py-12 animate-in fade-in duration-500">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">开始和 {targetUser.username} 聊天吧</p>
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
                targetUser={targetUser}
              />
            );
          })
        )}
        
        {/* 滚动到底部按钮 */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-all duration-200 animate-in slide-in-from-bottom-4 fade-in border border-gray-200"
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
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 px-3 py-2.5 flex-shrink-0 shadow-sm">
        <div className="flex items-end gap-1.5">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`发给 ${targetUser.username}...`}
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:bg-white transition-all duration-300"
            maxLength={2000}
            autoFocus
          />
          <button 
            onClick={handleSendMessage}
            disabled={!hasContent || isSending}
            className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
              hasContent && !isSending
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-pink-600 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
  );
};

export default PrivateChat;