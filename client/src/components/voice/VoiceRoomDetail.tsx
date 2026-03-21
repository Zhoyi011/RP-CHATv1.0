import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { voiceSocketService } from '../../services/voiceSocket';
import { webRTCService } from '../../services/webRTCService';
import VoiceControls from './VoiceControls';
import VoiceMessageList from './VoiceMessageList';
import type { VoiceUser, VoiceMessage } from '../../types/voice';

const VoiceRoomDetail: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [users, setUsers] = useState<VoiceUser[]>([]);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const reconnectAttempts = useRef(0);
  const user = auth.currentUser;

  // 加载房间信息
  useEffect(() => {
    loadRoomInfo();
  }, [roomId]);

  const loadRoomInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/voice/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRoom(data);
    } catch (error) {
      console.error('加载房间信息失败:', error);
    }
  };

  // 初始化 WebRTC
  const initWebRTC = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    try {
      const stream = await webRTCService.getLocalStream();
      setIsMuted(webRTCService.isMuted());
      
      webRTCService.onIceCandidate = (targetUserId, candidate) => {
        voiceSocketService.sendSignal(roomId!, targetUserId, {
          type: 'ice-candidate',
          candidate,
        });
      };
      
      webRTCService.setOnSpeakingChange((userId, isSpeaking) => {
        setUsers(prev => prev.map(u => 
          u.userId === userId ? { ...u, speaking: isSpeaking } : u
        ));
      });
      
      setIsConnected(true);
      reconnectAttempts.current = 0;
    } catch (err) {
      console.error('初始化麦克风失败:', err);
      setIsConnected(false);
    }
  }, [roomId]);

  const addSystemMessage = (content: string) => {
    const newMessage: VoiceMessage = {
      _id: Date.now().toString(),
      userId: 'system',
      username: '系统',
      personaName: '系统',
      content,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSignal = async (fromUserId: string, signal: any) => {
    if (fromUserId === user?.uid) return;
    
    let pc = webRTCService.getPeerConnection(fromUserId);
    
    if (!pc) {
      pc = webRTCService.createPeerConnection(fromUserId, (stream) => {
        webRTCService.createAudioElement(fromUserId, stream);
      });
      
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        voiceSocketService.sendSignal(roomId!, fromUserId, answer);
      }
    }
    
    if (signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      voiceSocketService.sendSignal(roomId!, fromUserId, answer);
    } else if (signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.type === 'ice-candidate') {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  };

  const connectToUser = useCallback(async (targetUserId: string) => {
    if (targetUserId === user?.uid) return;
    
    const existingPC = webRTCService.getPeerConnection(targetUserId);
    if (existingPC) return;
    
    const pc = webRTCService.createPeerConnection(targetUserId, (stream) => {
      webRTCService.createAudioElement(targetUserId, stream);
    });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    voiceSocketService.sendSignal(roomId!, targetUserId, offer);
  }, [roomId, user]);

  // 加入语音房间
  const joinVoiceRoom = useCallback(async () => {
    if (!user) return;
    
    if (reconnectAttempts.current > 3) {
      console.log('重连次数过多，停止重试');
      setIsLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    reconnectAttempts.current++;
    
    voiceSocketService.connect(token);
    
    try {
      const activePersonaRes = await fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!activePersonaRes.ok) {
        console.error('获取角色失败:', activePersonaRes.status);
        setIsLoading(false);
        return;
      }
      
      const activePersona = await activePersonaRes.json();
      const personaId = activePersona.activePersona?.personaId?._id || '';
      const personaName = activePersona.activePersona?.personaId?.name || user.email?.split('@')[0] || '用户';
      const username = user.email?.split('@')[0] || '用户';
      const avatar = user.photoURL || '';
      
      voiceSocketService.joinVoiceRoom(roomId!, user.uid, personaId, personaName, username, avatar);
      
      const timeout = setTimeout(() => {
        console.log('语音房连接超时');
        setIsLoading(false);
      }, 10000);
      
      voiceSocketService.onVoiceUsers((data: { users: VoiceUser[] }) => {
        clearTimeout(timeout);
        setUsers(data.users);
        setIsLoading(false);
      });
      
      voiceSocketService.onUserJoinedVoice((data: VoiceUser) => {
        setUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
        addSystemMessage(`${data.personaName} 加入了语音房`);
      });
      
      voiceSocketService.onUserLeftVoice((data: { userId: string }) => {
        const leavingUser = users.find(u => u.userId === data.userId);
        if (leavingUser) {
          addSystemMessage(`${leavingUser.personaName} 离开了语音房`);
        }
        setUsers(prev => prev.filter(u => u.userId !== data.userId));
        webRTCService.closePeerConnection(data.userId);
      });
      
      voiceSocketService.onSignal(async (data: { fromUserId: string, signal: any }) => {
        await handleSignal(data.fromUserId, data.signal);
      });
      
      voiceSocketService.onUserMuteChanged((data: { userId: string, muted: boolean }) => {
        setUsers(prev => prev.map(u => 
          u.userId === data.userId ? { ...u, muted: data.muted } : u
        ));
      });
      
      voiceSocketService.onVoiceMessage((data: VoiceMessage) => {
        setMessages(prev => [...prev, data]);
      });
      
    } catch (error) {
      console.error('加入语音房失败:', error);
      setIsLoading(false);
    }
  }, [roomId, user, users]);

  useEffect(() => {
    users.forEach(u => {
      if (u.userId !== user?.uid) {
        connectToUser(u.userId);
      }
    });
  }, [users, connectToUser, user]);

  useEffect(() => {
    initWebRTC();
    joinVoiceRoom();
    
    return () => {
      voiceSocketService.leaveVoiceRoom(roomId!, user?.uid || '');
      voiceSocketService.removeAllListeners();
      voiceSocketService.disconnect();
      webRTCService.closeAllConnections();
      isInitialized.current = false;
      reconnectAttempts.current = 0;
    };
  }, [roomId, user, initWebRTC, joinVoiceRoom]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    webRTCService.setMute(newMuted);
    setIsMuted(newMuted);
    if (user) {
      voiceSocketService.toggleMute(roomId!, user.uid, newMuted);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const message: VoiceMessage = {
      _id: Date.now().toString(),
      userId: user?.uid || '',
      username: user?.email?.split('@')[0] || '用户',
      personaName: users.find(u => u.userId === user?.uid)?.personaName || '用户',
      content: inputMessage,
      timestamp: new Date(),
      type: 'text'
    };
    
    voiceSocketService.sendVoiceMessage(roomId!, message);
    setMessages(prev => [...prev, message]);
    setInputMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentUser = users.find(u => u.userId === user?.uid);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* 头部 */}
      <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/voice')}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{room?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">{users.length} 人在线</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition"
              title={showChat ? '隐藏聊天' : '显示聊天'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition"
              title={showUserList ? '隐藏成员' : '显示成员'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧：语音用户墙 */}
        <div className={`flex-1 p-4 sm:p-6 transition-all duration-300 ${showUserList ? 'sm:mr-80' : ''} ${showChat ? 'sm:mr-80' : ''}`}>
          <div className="h-full flex flex-col">
            {/* 背景装饰 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
            </div>
            
            {/* 当前语音状态 */}
            <div className="relative z-10 bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-6 border border-white/10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`
                    w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 
                    flex items-center justify-center text-white text-xl sm:text-2xl font-bold
                    ${!isMuted && isConnected ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-gray-900 animate-pulse' : ''}
                  `}>
                    {currentUser?.personaName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">{currentUser?.personaName}</h2>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {isMuted ? '已静音' : isConnected ? '语音中' : '连接中...'}
                    </p>
                  </div>
                </div>
                <VoiceControls
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  onLeave={() => navigate('/voice')}
                  isLoading={!isConnected}
                />
              </div>
            </div>
            
            {/* 用户网格 */}
            <div className="relative z-10 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {users.map(user => (
                  <div
                    key={user.userId}
                    className={`
                      bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border transition-all
                      ${user.speaking ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/10'}
                      ${user.userId === auth.currentUser?.uid ? 'ring-2 ring-emerald-500' : ''}
                    `}
                  >
                    <div className="relative inline-block">
                      <div className={`
                        w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 
                        flex items-center justify-center text-white text-xl sm:text-2xl font-bold
                        ${user.speaking ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-gray-900' : ''}
                      `}>
                        {user.personaName.charAt(0)}
                      </div>
                      {user.muted && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </div>
                      )}
                      {user.isCreator && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs">
                          👑
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-white text-sm mt-2 truncate">{user.personaName}</p>
                    <p className="text-xs text-gray-400 truncate">{user.username}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：成员列表 */}
        {showUserList && (
          <div className="fixed right-0 top-[73px] bottom-0 w-80 bg-black/30 backdrop-blur-xl border-l border-white/10 overflow-y-auto hidden sm:block">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">成员列表</h3>
                <span className="text-xs text-gray-400">{users.length} 人在线</span>
              </div>
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.userId} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition">
                    <div className="relative">
                      <div className={`
                        w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 
                        flex items-center justify-center text-white font-bold
                        ${user.speaking ? 'ring-2 ring-emerald-400' : ''}
                      `}>
                        {user.personaName.charAt(0)}
                      </div>
                      {user.muted && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{user.personaName}</p>
                      <p className="text-xs text-gray-400">{user.username}</p>
                    </div>
                    {user.isCreator && <span className="text-xs text-amber-400">房主</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：聊天区 */}
        {showChat && (
          <div className={`fixed right-0 top-[73px] bottom-0 w-80 bg-black/30 backdrop-blur-xl border-l border-white/10 flex flex-col ${showUserList ? 'hidden sm:block' : ''}`}>
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-medium">聊天</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <VoiceMessageList messages={messages} currentUserId={user?.uid || ''} />
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="发送消息..."
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-400 text-sm"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition text-sm"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRoomDetail;