import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';
import { useLongPress } from '../../hooks/useLongPress';
import { ContextMenu } from '../common/ContextMenu';
import type { MenuItem } from '../common/ContextMenu';
import DesktopLayout from '../layout/DesktopLayout';
import TabletLayout from '../layout/TabletLayout';
import MobileLayout from '../layout/MobileLayout';
import CreateRoom from './CreateRoom';
import PrivateChat from './PrivateChat';
import UserList from '../user/UserList';
import ChatInput from './ChatInput';
import LinkPreviewContainer from './LinkPreviewContainer';
import toast, { Toaster } from 'react-hot-toast';
import { notificationService } from '../../services/Notification';
import { roomApi, personaApi, authApi, type Room, type Persona, type Message, type User } from '../../services/api';
import { socketService } from '../../services/socket';
import { extractUrls } from '../../utils/linkParser';
import { parseMarkdown } from '../../utils/renderMarkdown';
import { formatMessageTime } from '../../utils/timeFormat';
import { smartConvert } from '../../services/translateApi';

console.log('🔧 [ChatHome] 组件模块加载');

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// ========== 消息列表组件 ==========
const MessageList: React.FC<{
  messages: Message[];
  user: any;
  selectedPersona: Persona | null;
  isMobile: boolean;
  navigate: (path: string) => void;
  onMessagesChange?: (newMessages: Message[]) => void;
}> = ({ messages, user, selectedPersona, isMobile, navigate, onMessagesChange }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  
  // ✅ 右键/长按菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  console.log(`📋 [MessageList] 初始化，消息数量: ${messages.length}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ 回复消息
  const handleReply = useCallback((message: Message) => {
    console.log(`💬 [MessageList] 回复消息: ${message._id}, 内容: ${message.content.substring(0, 30)}`);
    toast.success(`回复功能开发中...`, { icon: '💬' });
  }, []);

  // ✅ 分享消息（复制到剪贴板）
  const handleShare = useCallback(async (message: Message) => {
    console.log(`📤 [MessageList] 分享消息: ${message._id}`);
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('消息已复制到剪贴板');
      console.log(`✅ [MessageList] 消息已复制到剪贴板`);
    } catch (error) {
      console.error(`❌ [MessageList] 复制失败:`, error);
      toast.error('复制失败');
    }
  }, []);

  // ✅ 删除消息（软删除，仅自己可见）
  const handleDelete = useCallback(async (message: Message) => {
    console.log(`🗑️ [MessageList] 删除消息: ${message._id}`);
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
        console.log(`✅ [MessageList] 消息删除成功`);
        toast.success('消息已删除');
        // 从本地消息列表中过滤掉该消息
        if (onMessagesChange) {
          onMessagesChange(messages.filter(m => m._id !== message._id));
        }
      } else {
        console.error(`❌ [MessageList] 删除失败:`, data.error);
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error(`❌ [MessageList] 删除异常:`, error);
      toast.error('删除失败');
    }
  }, [messages, onMessagesChange]);

  // ✅ 撤回消息（仅自己，5分钟内）
  const handleRecall = useCallback(async (message: Message) => {
    console.log(`⏪ [MessageList] 撤回消息: ${message._id}`);
    
    // 检查是否在5分钟内
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - messageTime) / 1000 / 60;
    
    console.log(`⏱️ [MessageList] 消息发送于 ${diffMinutes.toFixed(1)} 分钟前`);
    
    if (diffMinutes > 5) {
      console.log(`❌ [MessageList] 超过撤回时间限制 (5分钟)`);
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
        console.log(`✅ [MessageList] 消息撤回成功`);
        toast.success('消息已撤回');
        // 更新本地消息内容
        message.content = '该消息已被撤回';
        message.isRecalled = true;
        if (onMessagesChange) {
          onMessagesChange([...messages]);
        }
      } else {
        console.error(`❌ [MessageList] 撤回失败:`, data.error);
        toast.error(data.error || '撤回失败');
      }
    } catch (error) {
      console.error(`❌ [MessageList] 撤回异常:`, error);
      toast.error('撤回失败');
    }
  }, [messages, onMessagesChange]);

  // ✅ 处理长按/右键
  const handleMessageLongPress = useCallback((message: Message, position: { x: number; y: number }) => {
    console.log(`👆 [MessageList] 长按/右键消息: ${message._id}, 位置: (${position.x}, ${position.y})`);
    setContextMenu({
      visible: true,
      x: position.x,
      y: position.y,
      message,
    });
  }, []);

  // ✅ 获取菜单项
  const getMenuItems = useCallback((message: Message, isSelf: boolean): MenuItem[] => {
    console.log(`📋 [MessageList] 生成菜单项, isSelf=${isSelf}`);
    const items: MenuItem[] = [];
    
    // 回复（所有人都可以）
    items.push({
      key: 'reply',
      label: '回复',
      onClick: () => handleReply(message),
    });
    
    // 分享
    items.push({
      key: 'share',
      label: '分享',
      onClick: () => handleShare(message),
    });
    
    // 删除（仅自己）
    if (isSelf) {
      items.push({
        key: 'delete',
        label: '删除',
        danger: true,
        onClick: () => handleDelete(message),
      });
    }
    
    // 撤回（仅自己，5分钟内）
    if (isSelf) {
      const messageTime = new Date(message.createdAt).getTime();
      const canRecall = Date.now() - messageTime <= 5 * 60 * 1000;
      console.log(`⏱️ [MessageList] 撤回可用: ${canRecall}`);
      if (canRecall) {
        items.push({
          key: 'recall',
          label: '撤回',
          onClick: () => handleRecall(message),
        });
      }
    }
    
    console.log(`✅ [MessageList] 生成 ${items.length} 个菜单项: ${items.map(i => i.label).join(', ')}`);
    return items;
  }, [handleReply, handleShare, handleDelete, handleRecall]);

  const handleTranslate = async (content: string, msgId: string) => {
    if (translatingMsgId === msgId) return;
    console.log(`🌐 [MessageList] 翻译消息: ${msgId}`);
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
    return <div className="text-center text-gray-400 py-8">还没有消息，开始聊天吧 👋</div>;
  }

  return (
    <>
      {messages.map(msg => {
        // 检查是否被撤回或删除
        if (msg.isRecalled) {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full italic">
                {msg.content}
              </span>
            </div>
          );
        }
        
        if (msg.userId?._id === 'system') {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
            </div>
          );
        }
        
        if (msg.isAction) {
          return (
            <div key={msg._id} className="flex justify-center">
              <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                * {msg.personaId?.displayName || msg.personaId?.name} {msg.content} *
              </span>
            </div>
          );
        }
        
        const isSelf = selectedPersona && msg.personaId?._id === selectedPersona._id;
        const urls = extractUrls(msg.content);
        
        return (
          <motion.div
            key={msg._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`group flex items-start gap-2 ${isSelf ? 'justify-end' : ''}`}
          >
            {/* 对方头像 */}
            {!isSelf && (
              <div 
                onClick={() => { if (msg.personaId?._id) navigate(`/persona/${msg.personaId._id}`); }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition shadow-sm"
              >
                {(msg.personaId?.displayName || msg.personaId?.name || '?').charAt(0)}
              </div>
            )}
            
            <div className={`max-w-[70%] ${isSelf ? 'items-end' : ''}`}>
              {/* 发送者名称 */}
              {!isSelf && (
                <div 
                  onClick={() => { if (msg.personaId?._id) navigate(`/persona/${msg.personaId._id}`); }}
                  className="flex items-baseline gap-2 mb-1 ml-1 cursor-pointer hover:text-blue-600 transition"
                >
                  <span className="text-sm font-medium text-gray-800">{msg.personaId?.displayName || msg.personaId?.name || '?'}</span>
                  {msg.personaId?.sameNameNumber && <span className="text-[10px] text-gray-400">#{msg.personaId.sameNameNumber}</span>}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                {/* 时间戳（对方消息左侧） */}
                {!isMobile && !isSelf && (
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatMessageTime(msg.createdAt)}</span>
                )}
                
                {/* ✅ 消息气泡 - 添加长按/右键事件 */}
                <div
                  {...useLongPress({
                    duration: 500,
                    enableMobile: true,
                    enableContextMenu: true,
                    onLongPress: (e, pos) => {
                      if (pos) handleMessageLongPress(msg, pos);
                    },
                    onClick: () => {
                      console.log(`🔘 [MessageList] 点击消息: ${msg._id}`);
                    },
                  })}
                  className={`px-4 py-2 rounded-2xl max-w-full relative transition-all duration-200 ${
                    isSelf 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-tr-none shadow-md' 
                      : 'bg-white text-gray-800 rounded-tl-none shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                  {urls.length > 0 && <LinkPreviewContainer urls={urls} isSelf={isSelf} />}
                </div>
                
                {/* 时间戳（自己消息右侧） */}
                {isSelf && <span className="text-xs text-gray-400 flex-shrink-0">{formatMessageTime(msg.createdAt)}</span>}
              </div>
            </div>

            {/* 自己头像 */}
            {isSelf && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {(selectedPersona?.displayName || selectedPersona?.name || '?').charAt(0)}
              </div>
            )}

            {/* 翻译按钮（对方消息） */}
            {!isSelf && (
              <button 
                onClick={() => handleTranslate(msg.content, msg._id)} 
                disabled={translatingMsgId === msg._id}
                className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex-shrink-0" 
                title="简繁转换"
              >
                {translatingMsgId === msg._id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                )}
              </button>
            )}
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
      
      {/* ✅ 右键/长按菜单 */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.message ? getMenuItems(contextMenu.message, contextMenu.message.personaId?._id === selectedPersona?._id) : []}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        theme="dark"
      />
    </>
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  console.log(`📊 [ChatHome] 状态: authChecked=${authChecked}, loading=${loading}, selectedRoom=${selectedRoom?._id}`);

  // ✅ 消息变化时的回调
  const handleMessagesChange = useCallback((newMessages: Message[]) => {
    console.log(`🔄 [ChatHome] 消息列表更新，数量: ${newMessages.length}`);
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
        if (activePersonaRes.activePersona) setSelectedPersona(activePersonaRes.activePersona.personaId);
        else if (approved.length > 0) setSelectedPersona(approved[0]);
      } catch (err: any) { setError(err.message || '加载失败'); } finally { setLoading(false); }
    };
    loadData();
  }, [authChecked, user]);

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
        toast.custom((t) => (
          <div className={`bg-white rounded-xl shadow-lg p-3 flex items-center gap-3 cursor-pointer ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
            onClick={() => toast.dismiss(t.id)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
              {(message.personaId?.displayName || message.personaId?.name || '?').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{message.personaId?.displayName || message.personaId?.name}</p>
              <p className="text-xs text-gray-500 truncate">{message.content}</p>
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

    // ✅ 监听消息撤回事件
    const handleMessageRecalled = (data: { messageId: string; content: string }) => {
      console.log(`🔔 [ChatHome] 消息被撤回: ${data.messageId}`);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, content: data.content, isRecalled: true }
          : msg
      ));
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.on('message-recalled', handleMessageRecalled);
    socketService.onRoomOnlineCount((data) => {
      setRooms(prev => prev.map(room => room._id === data.roomId ? { ...room, onlineCount: data.count } : room));
    });

    return () => {
      socketService.off('message-recalled', handleMessageRecalled);
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
          setMessages(data.map(msg => ({ ...msg, userId: { ...msg.userId, firebaseUid: msg.userId?.firebaseUid || msg.userId?._id } })));
        }
        socketService.joinRoom(selectedRoom._id, user.uid, selectedPersona._id);
      } catch (err) { console.error('加载消息失败:', err); }
    };
    loadMessages();
    return () => { socketService.leaveRoom(); };
  }, [selectedRoom, selectedPersona, user]);

  const handleSelectRoom = useCallback(async (room: Room) => {
    if (!selectedPersona) { toast.error('请先选择一个角色'); return; }
    try { await roomApi.markRead(room._id); setRooms(prev => prev.map(r => r._id === room._id ? { ...r, unreadCount: 0 } : r)); } catch {}
    setSelectedRoom(room); setSelectedUser(null); setShowUserList(false);
    if (isMobile) setShowChatWindow(true);
  }, [selectedPersona, isMobile]);

  const handleSelectUser = useCallback((targetUser: User) => {
    setSelectedUser(targetUser); setSelectedRoom(null); setShowUserList(false);
    if (isMobile) setShowChatWindow(true);
  }, [isMobile]);

  const handleSelectPersona = useCallback(async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setSelectedPersona(persona);
      const token = localStorage.getItem('token');
      const roomsRes = await fetch(`${API_BASE}/room/my-rooms`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await roomsRes.json();
      setRooms(data.rooms || []);
      if (data.currentPersona) setCurrentPersona(data.currentPersona);
      if (selectedRoom && user) socketService.switchPersona(user.uid, persona._id);
    } catch (err: any) { toast.error(err.message || '切换失败'); }
  }, [selectedRoom, user]);

  const handleSwitchRoomPersona = useCallback(async (persona: Persona) => {
    setSelectedPersona(persona);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/room/active-persona`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId: persona._id })
      });
    } catch {}
  }, []);

  const handleSendMessage = useCallback((content: string, isAction = false, personaId?: string) => {
    if (!selectedRoom || !user) { toast.error('请先选择聊天室'); return; }
    if (!content.trim()) return;
    const pid = personaId || selectedPersona?._id;
    if (!pid) { toast.error('请选择发言角色'); return; }
    socketService.sendMessage(selectedRoom._id, user.uid, pid, content, isAction);
  }, [selectedRoom, selectedPersona, user]);

  const handleBackToList = useCallback(() => { setShowChatWindow(false); setSelectedUser(null); }, []);

  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;
    toast.custom((t) => (
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4">
        <p className="text-lg font-semibold text-gray-800 mb-2">退出群聊</p>
        <p className="text-sm text-gray-600 mb-4">确定要退出「{selectedRoom.name}」吗？</p>
        <div className="flex gap-3">
          <button onClick={() => toast.dismiss(t.id)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">取消</button>
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
                setRooms(roomsData.rooms || []); setSelectedRoom(null); setMessages([]);
              } else toast.error(data.error || '退出失败');
            } catch { toast.error('退出失败'); }
          }} className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition shadow-md">确定退出</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleReport = () => toast('举报功能开发中，请通过邮件联系我们：zhoyi.lee@gmail.com', { icon: '📧', duration: 5000 });

  if (!authChecked) return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><div className="text-white/60 text-lg animate-pulse">加载中...</div></div>;
  if (error) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="text-6xl mb-4">😢</div><p className="text-red-500 mb-6">{error}</p><button onClick={() => window.location.reload()} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition">重试</button></div></div>;

  const renderChatList = () => (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="bg-gray-100 rounded-full px-4 py-2.5 flex items-center text-gray-400">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="搜索聊天" className="bg-transparent flex-1 outline-none text-gray-600 placeholder-gray-400 text-sm" />
        </div>
      </div>
      <div className="px-4 py-2 flex-shrink-0">
        <button onClick={() => setShowCreateRoom(true)} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition flex items-center justify-center gap-2 shadow-md text-sm font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>创建新聊天室
        </button>
      </div>
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button onClick={() => { setShowUserList(false); setSelectedUser(null); }} className={`flex-1 py-2.5 text-sm font-medium transition relative ${!showUserList ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>群聊{!showUserList && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />}</button>
        <button onClick={() => { setShowUserList(true); setSelectedRoom(null); }} className={`flex-1 py-2.5 text-sm font-medium transition relative ${showUserList ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>私聊{showUserList && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />}</button>
      </div>
      {!showUserList && (
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">当前角色：{currentPersona && <span className="ml-1 text-blue-600 font-medium">{currentPersona.displayName || currentPersona.name}</span>}</span>
            <button onClick={() => navigate('/persona')} className="text-xs text-blue-500 hover:text-blue-600 transition">管理角色</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {personas.map(persona => (
              <button key={persona._id} onClick={() => handleSelectPersona(persona)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition flex-shrink-0 ${selectedPersona?._id === persona._id ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>{persona.displayName || persona.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {showCreateRoom && <CreateRoom onClose={() => setShowCreateRoom(false)} onSuccess={() => window.location.reload()} />}
        {showUserList ? <UserList onSelectUser={handleSelectUser} /> :
          loading ? <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div> :
          rooms.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3 px-4">
              <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-gray-400">还没有加入任何聊天室</p>
              <button onClick={() => setShowCreateRoom(true)} className="mt-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transition shadow-md">创建新聊天室 →</button>
            </div>
          ) : (
            rooms.map(room => (
              <div key={room._id} onClick={() => handleSelectRoom(room)} className={`px-4 py-3.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 active:bg-gray-100 transition ${selectedRoom?._id === room._id && !isMobile ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">{room.name.charAt(0)}</div>
                    {room.onlineCount ? <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white font-medium">{room.onlineCount}</div> : <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">{room.name}</h3>
                        {room.unreadCount ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span> : null}
                      </div>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{room.messageCount || 0} 条</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">群主: {room.creatorName || '?'}</p>
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
    if (selectedUser) return <PrivateChat targetUser={selectedUser} onClose={handleBackToList} />;
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          {isMobile && <button onClick={handleBackToList} className="p-1.5 hover:bg-gray-100 rounded-full transition"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md">{selectedRoom?.name?.charAt(0) || '?'}</div>
              {selectedRoom?.onlineCount ? <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">{selectedRoom.onlineCount}</div> : <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>}
            </div>
            <div className="min-w-0 flex-1"><h2 className="font-medium text-gray-800 truncate">{selectedRoom?.name || '请选择聊天室'}</h2><p className="text-xs text-gray-500 truncate">{selectedPersona ? `发言: ${selectedPersona.displayName || selectedPersona.name}` : '请先选择角色'}</p></div>
          </div>
          <div className="flex items-center gap-1">
            {selectedRoom && (isRoomAdmin || isRoomOwner) && (
              <button onClick={() => navigate(`/room/${selectedRoom._id}/pending`)} className="p-2 hover:bg-gray-100 rounded-full transition relative" title="待审核申请">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {pendingCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
            )}
            {selectedRoom && (
              <button onClick={() => setShowRoomMenu(!showRoomMenu)} className="p-2 hover:bg-gray-100 rounded-full transition" title="群菜单">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <MessageList 
            messages={messages} 
            user={user} 
            selectedPersona={selectedPersona} 
            isMobile={isMobile} 
            navigate={navigate}
            onMessagesChange={handleMessagesChange}
          />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!selectedRoom}
          roomId={selectedRoom?._id}
          selectedPersona={selectedPersona}
          roomPersonas={roomPersonas}
          onSwitchPersona={handleSwitchRoomPersona}
          onLoadRoomPersonas={loadRoomPersonas}
          placeholder="输入消息... 使用 /me 进行动作扮演"
        />
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: 'transparent', boxShadow: 'none', padding: 0 } }} />
      {isDesktop ? <DesktopLayout><div className="h-full flex"><div className="w-80 border-r border-gray-200 flex-shrink-0">{renderChatList()}</div><div className="flex-1">{renderChatWindow()}</div></div></DesktopLayout>
      : isTablet ? <TabletLayout><div className="h-full flex"><div className="w-72 border-r border-gray-200 flex-shrink-0">{renderChatList()}</div><div className="flex-1">{renderChatWindow()}</div></div></TabletLayout>
      : <MobileLayout><div className="h-full">{!showChatWindow ? renderChatList() : renderChatWindow()}</div></MobileLayout>}
      
      <AnimatePresence>
        {showRoomMenu && selectedRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999]" onClick={() => setShowRoomMenu(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="absolute right-4 top-20 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { navigate(`/group/${selectedRoom._id}`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">群资料</button>
              <button onClick={() => { navigate(`/room/${selectedRoom._id}/members`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">成员列表</button>
              {(isRoomAdmin || isRoomOwner) && <button onClick={() => { navigate(`/group/${selectedRoom._id}/settings`); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition">群管理</button>}
              <div className="border-t border-gray-100 my-1"></div>
              <button onClick={() => { handleReport(); setShowRoomMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition">举报群组</button>
              <button onClick={() => { setShowRoomMenu(false); setTimeout(handleLeaveRoom, 150); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition">退出群聊</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatHome;