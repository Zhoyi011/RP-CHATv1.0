import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';
import DesktopLayout from '../layout/DesktopLayout';
import TabletLayout from '../layout/TabletLayout';
import MobileLayout from '../layout/MobileLayout';
import CreateRoom from './CreateRoom';
import PrivateChat from './PrivateChat';
import UserList from '../user/UserList';
import ChatInput from './ChatInput';
import toast, { Toaster } from 'react-hot-toast';
import { notificationService } from '../../services/Notification';
import { 
  roomApi, 
  personaApi,
  authApi,
  type Room, 
  type Persona, 
  type Message, 
  type User 
} from '../../services/api';
import { socketService } from '../../services/socket';
import { extractUrls } from '../../utils/linkParser';

// ========== 消息列表组件 ==========
const MessageList: React.FC<{
  messages: Message[];
  user: any;
  selectedPersona: Persona | null;
  isMobile: boolean;
  navigate: (path: string) => void;
}> = ({ messages, user, selectedPersona, isMobile, navigate }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        还没有消息，开始聊天吧 👋
      </div>
    );
  }

  return (
    <>
      {messages.map(msg => {
        // 系统消息
        if (msg.userId?._id === 'system') {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }
        
        // 动作消息 (/me)
        if (msg.isAction) {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                * {msg.personaId?.name} {msg.content} *
              </span>
            </div>
          );
        }
        
        const isSelf = msg.userId?.firebaseUid === user?.uid || msg.userId?._id === user?.uid;
        const urls = extractUrls(msg.content);
        
        return (
          <div key={msg._id} className={`flex items-start gap-2 ${isSelf ? 'justify-end' : ''}`}>
            {!isSelf && (
              <div 
                onClick={() => {
                  if (msg.personaId?._id) {
                    navigate(`/persona/${msg.personaId._id}`);
                  }
                }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition"
              >
                {msg.personaId?.name?.charAt(0) || '?'}
              </div>
            )}
            
            <div className={`max-w-[70%] ${isSelf ? 'items-end' : ''}`}>
              {!isSelf && (
                <div 
                  onClick={() => {
                    if (msg.personaId?._id) {
                      navigate(`/persona/${msg.personaId._id}`);
                    }
                  }}
                  className="flex items-baseline gap-2 mb-1 ml-1 cursor-pointer hover:text-green-600 transition"
                >
                  <span className="text-sm font-medium text-gray-800 hover:text-green-600">
                    {msg.personaId?.name || '未知用户'}
                  </span>
                </div>
              )}
              <div className="flex items-end gap-2">
                {!isMobile && !isSelf && (
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                )}
                <div className={`px-4 py-2 rounded-2xl ${
                  isSelf 
                    ? 'bg-green-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  
                  {urls.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {urls.map(url => {
                        try {
                          const domain = new URL(url).hostname.replace('www.', '');
                          return (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-blue-500 hover:underline text-xs break-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm(`是否打开链接：${url}`)) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              🔗 {domain}
                            </a>
                          );
                        } catch {
                          return (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-blue-500 hover:underline text-xs break-all"
                            >
                              🔗 链接
                            </a>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
                {isSelf && (
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {isSelf && (
              <div 
                onClick={() => {
                  if (selectedPersona?._id) {
                    navigate(`/persona/${selectedPersona._id}`);
                  }
                }}
                className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition"
              >
                {selectedPersona?.name?.charAt(0) || 'M'}
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
};

// ========== 群组管理菜单组件 ==========
const RoomSettingsMenu: React.FC<{
  roomId: string;
  isAdmin: boolean;
  isOwner: boolean;
  onClose: () => void;
}> = ({ roomId, isAdmin, isOwner, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20 py-1">
      {isAdmin && (
        <>
          <button
            onClick={() => {
              navigate(`/room/${roomId}/pending`);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            待审核申请
          </button>
          <button
            onClick={() => {
              navigate(`/room/${roomId}/members`);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            成员列表
          </button>
          <button
            onClick={() => {
              navigate(`/room/${roomId}/settings`);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            群设置
          </button>
        </>
      )}
      <button
        onClick={() => {
          // TODO: 实现退出群聊逻辑
          alert('退出群聊功能开发中');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        退出群聊
      </button>
    </div>
  );
};

// ========== 主组件 ==========
const ChatHome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [isRoomOwner, setIsRoomOwner] = useState(false);

  const [showUserList, setShowUserList] = useState(tabParam === 'private');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // ========== 认证检查 ==========
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      
      if (!firebaseUser) {
        navigate('/');
      } else {
        setUser(firebaseUser);
        setAuthChecked(true);
        
        // 获取并设置 token
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // 验证 token 是否有效
            await authApi.getCurrentUser();
          }
        } catch (err) {
          console.error('Token 验证失败:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ========== 加载初始数据 ==========
  useEffect(() => {
    if (!authChecked || !user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
      const [roomsData, personasData] = await Promise.all([
      roomApi.getRooms(),
      personaApi.getMyPersonas(),  
  ]);
        
        // 获取每个房间的未读消息数
        const roomsWithUnread = await Promise.all(
          roomsData.map(async (room) => {
            try {
              const unreadData = await roomApi.getUnreadCount(room._id);
              return { 
                ...room, 
                onlineCount: 0,
                unreadCount: unreadData.unreadCount 
              };
            } catch {
              return { ...room, onlineCount: 0, unreadCount: 0 };
            }
          })
        );
        setRooms(roomsWithUnread);
        
        // 只显示已审核的角色
        const approvedPersonas = personasData.filter(p => p.status === 'approved');
        setPersonas(approvedPersonas);
        
        // 获取当前激活的角色
        const activePersona = await roomApi.getActivePersona();
        if (activePersona.activePersona) {
          setSelectedPersona(activePersona.activePersona.personaId);
        }
        
      } catch (err: any) {
        console.error('加载数据失败:', err);
        setError(err.message || '加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [authChecked, user]);

  // ========== 加载房间成员和权限 ==========
  useEffect(() => {
    if (!selectedRoom || !user) return;

    const currentRoom = rooms.find(r => r._id === selectedRoom._id);
    if (currentRoom && 'members' in currentRoom) {
      const members = (currentRoom as any).members || [];
      setRoomMembers(members);
      const currentMember = members.find((m: any) => m.userId === user.uid);
      setIsRoomAdmin(currentMember?.role === 'admin' || currentMember?.role === 'owner');
      setIsRoomOwner(currentMember?.role === 'owner');
    }
  }, [selectedRoom, user, rooms]);

  // ========== Socket 连接和事件监听 ==========
  useEffect(() => {
    if (!authChecked || !user) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    console.log('🔌 Connecting socket...');
    socketService.connect(token);

    // 监听新消息
    socketService.onNewMessage((message: Message) => {
      console.log('📨 收到新消息:', message);
      
      const isSelf = message.userId?.firebaseUid === user?.uid || message.userId?._id === user?.uid;
      
      // 显示通知（如果不是自己发的）
      if (!isSelf) {
        toast.custom((t) => (
          <div 
            className={`bg-white rounded-lg shadow-lg p-3 flex items-center gap-3 transform transition-all ${
              t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
            onClick={() => toast.dismiss(t.id)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
              {message.personaId?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{message.personaId?.name}</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{message.content}</p>
            </div>
          </div>
        ), {
          duration: 3000,
          position: 'top-right',
        });

        notificationService.onNewMessage(message);
      }

      // 更新消息列表
      setMessages(prev => {
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      
      // 更新未读计数
      const messageRoomId = typeof message.roomId === 'string' 
        ? message.roomId 
        : message.roomId?._id;
      
      if (selectedRoom && selectedRoom._id !== messageRoomId && messageRoomId) {
        setRooms(prev => prev.map(room => 
          room._id === messageRoomId 
            ? { ...room, unreadCount: (room.unreadCount || 0) + 1 }
            : room
        ));
      }
    });

    // 监听房间在线人数
    socketService.onRoomOnlineCount((data) => {
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room._id === data.roomId 
            ? { ...room, onlineCount: data.count }
            : room
        )
      );
    });

    // 监听用户加入/离开（可选，用于调试）
    socketService.onUserJoined((data) => {
      console.log('👤 用户加入:', data);
    });

    socketService.onUserLeft((data) => {
      console.log('👋 用户离开:', data);
    });

    socketService.onPersonaSwitched((data) => {
      console.log('🎭 角色切换:', data);
    });

    return () => {
      console.log('🔌 Cleaning up socket listeners...');
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [authChecked, user]);

  // ========== 加入房间并加载消息 ==========
  useEffect(() => {
    if (!selectedRoom || !selectedPersona || !user) return;

    const loadMessages = async () => {
      try {
        console.log('📡 加载房间消息:', selectedRoom._id);
        const messagesData = await roomApi.getMessages(selectedRoom._id);
        
        if (Array.isArray(messagesData)) {
          const processedMessages = messagesData.map(msg => ({
            ...msg,
            userId: {
              ...msg.userId,
              firebaseUid: msg.userId?.firebaseUid || msg.userId?._id
            }
          }));
          setMessages(processedMessages);
        }
        
        // 加入 Socket 房间
        socketService.joinRoom(selectedRoom._id, user.uid, selectedPersona._id);
        
      } catch (err: any) {
        console.error('❌ 加载消息失败:', err);
      }
    };

    loadMessages();

    return () => {
      socketService.leaveRoom();
    };
  }, [selectedRoom, selectedPersona, user]);

  // ========== 添加系统消息 ==========
  const addSystemMessage = useCallback((content: string) => {
    const systemMsg: any = {
      _id: 'system-' + Date.now(),
      content,
      isAction: false,
      createdAt: new Date().toISOString(),
      personaId: { _id: 'system', name: '系统' },
      userId: { _id: 'system', username: '系统' }
    };
    setMessages(prev => [...prev, systemMsg]);
  }, []);

  // ========== 选择房间 ==========
  const handleSelectRoom = useCallback(async (room: Room) => {
    if (!selectedPersona) {
      alert('请先选择一个角色');
      return;
    }
    
    try {
      await roomApi.markRead(room._id);
      setRooms(prev => prev.map(r => 
        r._id === room._id ? { ...r, unreadCount: 0 } : r
      ));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
    
    setSelectedRoom(room);
    setSelectedUser(null);
    setShowUserList(false);
    setShowRoomMenu(false);
    if (isMobile) setShowChatWindow(true);
  }, [selectedPersona, isMobile]);

  // ========== 选择用户（私聊）==========
  const handleSelectUser = useCallback((targetUser: User) => {
    setSelectedUser(targetUser);
    setSelectedRoom(null);
    setShowUserList(false);
    if (isMobile) setShowChatWindow(true);
  }, [isMobile]);

  // ========== 切换角色 ==========
  const handleSelectPersona = useCallback(async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setSelectedPersona(persona);
      
      if (selectedRoom && user) {
        socketService.switchPersona(user.uid, persona._id);
      }
    } catch (err: any) {
      alert(err.message || '切换角色失败');
    }
  }, [selectedRoom, user]);

  // ========== 发送消息 ==========
  const handleSendMessage = useCallback((content: string, isAction = false) => {
    if (!selectedRoom || !selectedPersona || !user) {
      alert('请先选择聊天室和角色');
      return;
    }

    if (!content.trim()) return;

    socketService.sendMessage(
      selectedRoom._id,
      user.uid,
      selectedPersona._id,
      content,
      isAction
    );
  }, [selectedRoom, selectedPersona, user]);

  // ========== 返回列表 ==========
  const handleBackToList = useCallback(() => {
    setShowChatWindow(false);
    setSelectedUser(null);
    setShowRoomMenu(false);
  }, []);

  // ========== 渲染加载状态 ==========
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-green-500 text-white px-4 py-2 rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // ========== 渲染聊天列表 ==========
  const renderChatList = () => (
    <div className="h-full flex flex-col bg-white">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center text-gray-400">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="搜索聊天"
            className="bg-transparent flex-1 outline-none text-gray-600 placeholder-gray-400"
          />
        </div>
      </div>

      {/* 创建房间按钮 */}
      {showCreateRoom && (
        <CreateRoom
          onClose={() => setShowCreateRoom(false)}
          onSuccess={() => window.location.reload()}
        />
      )}

      <div className="px-4 py-2 flex-shrink-0">
        <button
          onClick={() => setShowCreateRoom(true)}
          className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建新聊天室
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => {
            setShowUserList(false);
            setSelectedUser(null);
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            !showUserList ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          群聊
        </button>
        <button
          onClick={() => {
            setShowUserList(true);
            setSelectedRoom(null);
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            showUserList ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500'
          }`}
        >
          私聊
        </button>
      </div>

      {/* 角色选择栏 */}
      {!showUserList && (
        <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="text-sm text-gray-500 mb-2">当前角色：</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {personas.map(persona => (
              <button
                key={persona._id}
                onClick={() => handleSelectPersona(persona)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition flex-shrink-0 ${
                  selectedPersona?._id === persona._id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {persona.name}
              </button>
            ))}
            {personas.length === 0 && (
              <button
                onClick={() => navigate('/persona')}
                className="text-sm text-green-600 hover:text-green-700"
              >
                还没有角色，去申请 →
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto">
        {showUserList ? (
          <UserList onSelectUser={handleSelectUser} />
        ) : (
          <>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">暂无聊天室</div>
            ) : (
              rooms.map(room => (
                <div 
                  key={room._id} 
                  onClick={() => handleSelectRoom(room)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 active:bg-gray-100 transition ${
                    selectedRoom?._id === room._id && !isMobile ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                        {room.name.charAt(0)}
                      </div>
                      {room.onlineCount ? (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white">
                          {room.onlineCount}
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800 truncate">{room.name}</h3>
                          {room.unreadCount && room.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {room.messageCount} 条消息
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {room.description || '暂无描述'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {room.onlineCount ? `${room.onlineCount}人在线` : '暂无在线'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );

  // ========== 渲染聊天窗口 ==========
  const renderChatWindow = () => {
    if (isMobile && !showChatWindow) return null;
    
    if (selectedUser) {
      return (
        <PrivateChat
          targetUser={selectedUser}
          onClose={handleBackToList}
        />
      );
    }
    
    return (
      <div className="h-full flex flex-col bg-gray-50" style={{ height: '100%' }}>
        {/* 聊天头部 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          {isMobile && (
            <button 
              onClick={handleBackToList}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                {selectedRoom?.name.charAt(0) || '?'}
              </div>
              {selectedRoom?.onlineCount ? (
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white">
                  {selectedRoom.onlineCount}
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-gray-800 truncate">{selectedRoom?.name || '请选择聊天室'}</h2>
              <p className="text-xs text-gray-500">
                {selectedPersona ? `使用角色: ${selectedPersona.name}` : '请先选择角色'}
              </p>
            </div>
          </div>
          
          {(isRoomAdmin || isRoomOwner) && (
            <div className="relative">
              <button
                onClick={() => setShowRoomMenu(!showRoomMenu)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showRoomMenu && selectedRoom && (
                <RoomSettingsMenu
                  roomId={selectedRoom._id}
                  isAdmin={isRoomAdmin}
                  isOwner={isRoomOwner}
                  onClose={() => setShowRoomMenu(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <MessageList 
            messages={messages} 
            user={user} 
            selectedPersona={selectedPersona} 
            isMobile={isMobile} 
            navigate={navigate}
          />
        </div>

        {/* 输入框 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!selectedRoom || !selectedPersona}
          placeholder="输入消息... 使用 /me 进行动作扮演"
        />
      </div>
    );
  };

  // ========== 主渲染 ==========
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
      />
      {isDesktop ? (
        <DesktopLayout>
          <div className="h-full flex">
            <div className="w-80 border-r border-gray-200 flex-shrink-0">
              {renderChatList()}
            </div>
            <div className="flex-1">
              {renderChatWindow()}
            </div>
          </div>
        </DesktopLayout>
      ) : isTablet ? (
        <TabletLayout>
          <div className="h-full flex">
            <div className="w-72 border-r border-gray-200 flex-shrink-0">
              {renderChatList()}
            </div>
            <div className="flex-1">
              {renderChatWindow()}
            </div>
          </div>
        </TabletLayout>
      ) : (
        <MobileLayout>
          <div className="h-full">
            {!showChatWindow ? renderChatList() : renderChatWindow()}
          </div>
        </MobileLayout>
      )}
    </>
  );
};

export default ChatHome;