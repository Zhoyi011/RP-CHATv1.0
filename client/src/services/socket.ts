// client/src/services/socket.ts
import { io, Socket } from 'socket.io-client';

console.log('🔧 [SocketService] 模块加载');

class SocketService {
  private socket: Socket | null = null;

  connect(token: string, userId?: string) {
    console.log('🔌 [SocketService] Connecting socket...');
    
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { 
        token,
        userId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ [SocketService] Socket connected, ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ [SocketService] Socket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔴 [SocketService] Socket disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 [SocketService] Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    console.log(`👂 [SocketService] 注册事件监听: ${event}`);
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    console.log(`🔇 [SocketService] 移除事件监听: ${event}`);
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, ...args: any[]) {
    console.log(`📤 [SocketService] 发射事件: ${event}`, args);
    this.socket?.emit(event, ...args);
  }

  joinRoom(roomId: string, userId: string, personaId: string) {
    console.log(`📡 [SocketService] Joining room ${roomId} as persona ${personaId}`);
    this.socket?.emit('join-room', { roomId, userId, personaId });
  }

  leaveRoom() {
    console.log('📡 [SocketService] Leaving room');
    this.socket?.emit('leave-room');
  }

  sendMessage(roomId: string, userId: string, personaId: string, content: string, isAction = false, replyToId?: string, mentions?: string[]) {
    console.log(`📨 [SocketService] Sending message to ${roomId}:`, content.substring(0, 50));
    this.socket?.emit('send-message', { roomId, userId, personaId, content, isAction, replyToId, mentions });
  }

  switchPersona(userId: string, newPersonaId: string) {
    console.log(`🔄 [SocketService] Switching to persona ${newPersonaId}`);
    this.socket?.emit('switch-persona', { userId, newPersonaId });
  }

  onNewMessage(callback: (message: any) => void) {
    console.log(`👂 [SocketService] 注册 new-message 监听`);
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 user-joined 监听`);
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 user-left 监听`);
    this.socket?.on('user-left', callback);
  }

  onPersonaSwitched(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 persona-switched 监听`);
    this.socket?.on('persona-switched', callback);
  }

  onRoomOnlineCount(callback: (data: { roomId: string; count: number }) => void) {
    console.log(`👂 [SocketService] 注册 room-online-count 监听`);
    this.socket?.on('room-online-count', callback);
  }

  // 好友相关事件监听
  onFriendRequestReceived(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 friend-request-received 监听`);
    this.socket?.on('friend-request-received', callback);
  }

  onFriendRequestAccepted(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 friend-request-accepted 监听`);
    this.socket?.on('friend-request-accepted', callback);
  }

  onFriendRemoved(callback: (data: any) => void) {
    console.log(`👂 [SocketService] 注册 friend-removed 监听`);
    this.socket?.on('friend-removed', callback);
  }

  // 移除消息监听
  offNewMessage(callback?: (message: any) => void) {
    console.log(`🔇 [SocketService] 移除 new-message 监听`);
    if (callback) {
      this.socket?.off('new-message', callback);
    } else {
      this.socket?.off('new-message');
    }
  }

  offRoomOnlineCount(callback?: (data: { roomId: string; count: number }) => void) {
    console.log(`🔇 [SocketService] 移除 room-online-count 监听`);
    if (callback) {
      this.socket?.off('room-online-count', callback);
    } else {
      this.socket?.off('room-online-count');
    }
  }

  // 移除好友事件监听
  offFriendRequestReceived(callback?: (data: any) => void) {
    console.log(`🔇 [SocketService] 移除 friend-request-received 监听`);
    if (callback) {
      this.socket?.off('friend-request-received', callback);
    } else {
      this.socket?.off('friend-request-received');
    }
  }

  offFriendRequestAccepted(callback?: (data: any) => void) {
    console.log(`🔇 [SocketService] 移除 friend-request-accepted 监听`);
    if (callback) {
      this.socket?.off('friend-request-accepted', callback);
    } else {
      this.socket?.off('friend-request-accepted');
    }
  }

  offFriendRemoved(callback?: (data: any) => void) {
    console.log(`🔇 [SocketService] 移除 friend-removed 监听`);
    if (callback) {
      this.socket?.off('friend-removed', callback);
    } else {
      this.socket?.off('friend-removed');
    }
  }

  removeAllListeners() {
    console.log(`🧹 [SocketService] 移除所有监听器`);
    this.socket?.removeAllListeners();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();

console.log('✅ [SocketService] 模块加载完成');