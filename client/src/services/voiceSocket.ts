import { io, Socket } from 'socket.io-client';

class VoiceSocketService {
  private socket: Socket | null = null;
  private roomId: string | null = null;

  connect(token: string) {
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🎙️ Voice socket connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Voice socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Voice socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomId = null;
  }

  // ✅ 修复：添加所有必需参数
  joinVoiceRoom(roomId: string, userId: string, personaId: string, personaName: string, username: string, avatar?: string) {
    this.roomId = roomId;
    this.socket?.emit('join-voice-room', { 
      roomId, 
      userId, 
      personaId, 
      personaName, 
      username, 
      avatar 
    });
  }

  // 离开语音房间
  leaveVoiceRoom(roomId: string, userId: string) {
    this.socket?.emit('leave-voice-room', { roomId, userId });
    this.roomId = null;
  }

  // 发送 WebRTC 信令
  sendSignal(roomId: string, targetUserId: string, signal: any) {
    this.socket?.emit('voice-signal', { roomId, targetUserId, signal });
  }

  // 麦克风状态改变
  toggleMute(roomId: string, userId: string, muted: boolean) {
    this.socket?.emit('voice-mute', { roomId, userId, muted });
  }

  // 发送聊天消息
  sendVoiceMessage(roomId: string, message: any) {
    this.socket?.emit('voice-message', { roomId, message });
  }

  // 监听用户加入语音房
  onUserJoinedVoice(callback: (data: any) => void) {
    this.socket?.on('user-joined-voice', callback);
  }

  // 监听用户离开语音房
  onUserLeftVoice(callback: (data: any) => void) {
    this.socket?.on('user-left-voice', callback);
  }

  // 监听 WebRTC 信令
  onSignal(callback: (data: any) => void) {
    this.socket?.on('voice-signal', callback);
  }

  // 监听麦克风状态变化
  onUserMuteChanged(callback: (data: any) => void) {
    this.socket?.on('voice-mute-changed', callback);
  }

  // 监听语音房用户列表
  onVoiceUsers(callback: (data: any) => void) {
    this.socket?.on('voice-users', callback);
  }

  // 监听语音消息
  onVoiceMessage(callback: (data: any) => void) {
    this.socket?.on('voice-message', callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const voiceSocketService = new VoiceSocketService();