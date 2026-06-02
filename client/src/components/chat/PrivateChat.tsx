// client/src/components/chat/PrivateChat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../../firebase/config';
import { type Message } from '../../services/api';
import { socketService } from '../../services/socket';
import { useFriend } from '../../contexts/FriendContext';
import AvatarFrame from '../common/AvatarFrame';
import LinkPreviewContainer from './LinkPreviewContainer';
import { Send, X, UserPlus, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface Props {
  isOpen: boolean;
  targetPersonaId: string;
  targetPersonaName: string;
  targetPersonaAvatar?: string;
  targetPersonaNumber?: number;
  onClose: () => void;
}

const PrivateChat: React.FC<Props> = ({ 
  isOpen, 
  targetPersonaId, 
  targetPersonaName, 
  targetPersonaAvatar,
  targetPersonaNumber,
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [currentPersona, setCurrentPersona] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;
  const { friends, sendRequest } = useFriend();

  const privateRoomId = currentPersona && targetPersonaId
    ? [currentPersona._id, targetPersonaId].sort().join('-')
    : '';

  // 获取当前角色
  useEffect(() => {
    if (!isOpen) return;
    const fetchCurrentPersona = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/room/active-persona`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.activePersona) {
          setCurrentPersona(data.activePersona.personaId || data.activePersona);
        }
      } catch (error) {
        console.error('获取当前角色失败:', error);
      }
    };
    fetchCurrentPersona();
  }, [isOpen]);

  // 检查好友关系
  useEffect(() => {
    if (!isOpen) return;
    const isFriendNow = friends.some(f => f.friend.id === targetPersonaId);
    setIsFriend(isFriendNow);
    setIsChecking(false);
  }, [friends, targetPersonaId, isOpen]);

  // 加载消息
  useEffect(() => {
    if (!isOpen || !isFriend || !privateRoomId || !currentPersona) return;
    
    const loadMessages = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/private-chat/${targetPersonaId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('加载消息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    
    if (user) {
      socketService.joinRoom(privateRoomId, user.uid, currentPersona._id);
    }

    const handleNewMessage = (message: Message) => {
      setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
    };
    
    socketService.onNewMessage(handleNewMessage);
    
    return () => {
      socketService.leaveRoom();
      socketService.offNewMessage(handleNewMessage);
    };
  }, [isOpen, isFriend, privateRoomId, targetPersonaId, user, currentPersona]);

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || !isFriend || !currentPersona || !user) return;
    setIsSending(true);
    socketService.sendMessage(privateRoomId, user.uid, currentPersona._id, inputValue.trim(), false);
    setInputValue('');
    setTimeout(() => setIsSending(false), 300);
  }, [inputValue, isFriend, currentPersona, user, privateRoomId]);

  const handleSendRequest = async () => {
    const name = currentPersona?.displayName || currentPersona?.name || '用户';
    await sendRequest(targetPersonaId, `你好，我是 ${name}，想和你成为好友`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <AvatarFrame avatarUrl={targetPersonaAvatar || ''} frameName={null} size="md" />
            <div>
              <div className="flex items-center gap-1">
                <h2 className="font-medium text-gray-900 dark:text-white">{targetPersonaName}</h2>
                {targetPersonaNumber && (
                  <span className="text-xs text-gray-400">#{targetPersonaNumber}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">还不是好友</p>
            </div>
          </div>
          <div className="p-8 text-center">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              需要先添加 {targetPersonaName} 为好友才能开始私聊
            </p>
            <button
              onClick={handleSendRequest}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              添加好友
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* 头部 - 只显示角色信息 */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <AvatarFrame avatarUrl={targetPersonaAvatar || ''} frameName={null} size="md" />
          <div>
            <div className="flex items-center gap-1">
              <h2 className="font-medium text-gray-900 dark:text-white">{targetPersonaName}</h2>
              {targetPersonaNumber && (
                <span className="text-xs text-gray-400">#{targetPersonaNumber}</span>
              )}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">好友 · 在线</p>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>开始和 {targetPersonaName} 聊天吧</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isSelf = msg.personaId?._id === currentPersona?._id;
                const urls = msg.content.match(/https?:\/\/[^\s]+/g) || [];
                return (
                  <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                      isSelf 
                        ? 'bg-purple-500 text-white rounded-br-sm' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                      {urls.length > 0 && (
                        <div className="mt-1">
                          <LinkPreviewContainer urls={urls} isSelf={isSelf} />
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 ${isSelf ? 'text-purple-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`发给 ${targetPersonaName}...`}
              className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              maxLength={2000}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isSending}
              className={`p-2 rounded-full transition-all ${
                inputValue.trim() && !isSending
                  ? 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;