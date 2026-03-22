import { io, Socket } from 'socket.io-client';

class VoiceSocketService {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private isConnecting = false;

  connect(token: string) {
    if (this.socket && this.socket.connected) {
      console.log('语音 Socket 已连接, ID:', this.socket.id);
      return this.socket;
    }
    
    if (this.isConnecting) {
      console.log('语音 Socket 正在连接中...');
      return;
    }
    
    this.isConnecting = true;
    console.log('🔌 正在连接语音 Socket...');
    
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('🎙️ Voice socket connected, ID:', this.socket?.id);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Voice socket connection error:', error.message);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Voice socket disconnected:', reason);
    });

    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Socket 连接确认:', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 断开语音 Socket');
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomId = null;
    this.isConnecting = false;
  }

  joinVoiceRoom(roomId: string, userId: string, personaId: string, personaName: string, username: string, avatar?: string) {
    this.roomId = roomId;
    console.log(`📡 加入语音房: ${roomId}, 用户: ${username}`);
    this.socket?.emit('join-voice-room', { 
      roomId, 
      userId, 
      personaId, 
      personaName, 
      username, 
      avatar 
    });
  }

  leaveVoiceRoom(roomId: string, userId: string) {
    console.log(`📡 离开语音房: ${roomId}`);
    this.socket?.emit('leave-voice-room', { roomId, userId });
    this.roomId = null;
  }

  sendSignal(roomId: string, targetUserId: string, signal: any) {
    this.socket?.emit('voice-signal', { roomId, targetUserId, signal });
  }

  toggleMute(roomId: string, userId: string, muted: boolean) {
    this.socket?.emit('voice-mute', { roomId, userId, muted });
  }

  sendVoiceMessage(roomId: string, message: any) {
    this.socket?.emit('voice-message', { roomId, message });
  }

  onUserJoinedVoice(callback: (data: any) => void) {
    this.socket?.on('user-joined-voice', callback);
  }

  onUserLeftVoice(callback: (data: any) => void) {
    this.socket?.on('user-left-voice', callback);
  }

  onSignal(callback: (data: any) => void) {
    this.socket?.on('voice-signal', callback);
  }

  onUserMuteChanged(callback: (data: any) => void) {
    this.socket?.on('voice-mute-changed', callback);
  }

  onVoiceUsers(callback: (data: any) => void) {
    this.socket?.on('voice-users', callback);
  }

  onVoiceMessage(callback: (data: any) => void) {
    this.socket?.on('voice-message', callback);
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const voiceSocketService = new VoiceSocketService();