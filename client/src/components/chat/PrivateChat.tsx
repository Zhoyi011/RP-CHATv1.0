import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { roomApi, type Message, type User } from '../../services/api';
import { socketService } from '../../services/socket'

interface Props {
  targetUser: User;
  onClose?: () => void;
}

const PrivateChat: React.FC<Props> = ({ targetUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  // 私聊房间ID（由两个用户ID组成）
  const privateRoomId = [user?.uid, targetUser._id].sort().join('-');

  useEffect(() => {
    loadMessages();
    
    // 加入私聊房间
    if (user) {
      socketService.joinRoom(privateRoomId, user.uid, 'private');
    }

    // 监听新消息
    socketService.onNewMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socketService.leaveRoom();
      socketService.removeAllListeners();
    };
  }, [privateRoomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // 这里需要后端支持获取私聊消息
      const data = await roomApi.getMessages(privateRoomId);
      setMessages(data);
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !user) return;

    socketService.sendMessage(
      privateRoomId,
      user.uid,
      'private', // 私聊用固定角色ID
      inputValue,
      false
    );

    setInputValue('');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 聊天头部 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-gray-800 truncate">{targetUser.username}</h2>
            <p className="text-xs text-green-600">在线</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            开始和 {targetUser.username} 聊天吧 👋
          </div>
        ) : (
          messages.map(msg => {
            const isSelf = msg.userId?._id === user?.uid;
            
            return (
              <div key={msg._id} className={`flex items-start gap-2 ${isSelf ? 'justify-end' : ''}`}>
                {!isSelf && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    {targetUser.username.charAt(0)}
                  </div>
                )}
                
                <div className={`max-w-[70%] ${isSelf ? 'items-end' : ''}`}>
                  <div className="flex items-end gap-2">
                    <div className={`px-4 py-2 rounded-2xl ${
                      isSelf 
                        ? 'bg-green-500 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {isSelf && (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`发给 ${targetUser.username}...`}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;
