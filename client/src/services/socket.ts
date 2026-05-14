import { io, Socket } from 'socket.io-client';

console.log('🔧 [SocketService] 模块加载');

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    console.log('🔌 [SocketService] Connecting socket...');
    
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { token },
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

  // ✅ 新增：通用事件监听
  on(event: string, callback: (...args: any[]) => void) {
    console.log(`👂 [SocketService] 注册事件监听: ${event}`);
    this.socket?.on(event, callback);
  }

  // ✅ 新增：通用事件移除
  off(event: string, callback?: (...args: any[]) => void) {
    console.log(`🔇 [SocketService] 移除事件监听: ${event}`);
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  // ✅ 新增：通用事件发射
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

  sendMessage(roomId: string, userId: string, personaId: string, content: string, isAction = false) {
    console.log(`📨 [SocketService] Sending message to ${roomId}:`, content.substring(0, 50));
    this.socket?.emit('send-message', { roomId, userId, personaId, content, isAction });
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

  // ✅ 新增：移除特定事件监听器
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

  removeAllListeners() {
    console.log(`🧹 [SocketService] 移除所有监听器`);
    this.socket?.removeAllListeners();
  }

  // ✅ 新增：获取连接状态
  isConnected(): boolean {
    const connected = this.socket?.connected || false;
    console.log(`🔌 [SocketService] 连接状态: ${connected}`);
    return connected;
  }

  // ✅ 新增：获取 socket ID
  getSocketId(): string | undefined {
    const id = this.socket?.id;
    console.log(`🆔 [SocketService] Socket ID: ${id}`);
    return id;
  }
}

// 导出单例
export const socketService = new SocketService();

console.log('✅ [SocketService] 模块加载完成');