import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    console.log('🔌 Connecting socket...');
    
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected, ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔴 Socket disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string, userId: string, personaId: string) {
    console.log(`📡 Joining room ${roomId} as persona ${personaId}`);
    this.socket?.emit('join-room', { roomId, userId, personaId });
  }

  leaveRoom() {
    console.log('📡 Leaving room');
    this.socket?.emit('leave-room');
  }

  sendMessage(roomId: string, userId: string, personaId: string, content: string, isAction = false) {
    console.log(`📨 Sending message to ${roomId}:`, content.substring(0, 50));
    this.socket?.emit('send-message', { roomId, userId, personaId, content, isAction });
  }

  switchPersona(userId: string, newPersonaId: string) {
    console.log(`🔄 Switching to persona ${newPersonaId}`);
    this.socket?.emit('switch-persona', { userId, newPersonaId });
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: any) => void) {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: any) => void) {
    this.socket?.on('user-left', callback);
  }

  onPersonaSwitched(callback: (data: any) => void) {
    this.socket?.on('persona-switched', callback);
  }

  onRoomOnlineCount(callback: (data: { roomId: string; count: number }) => void) {
    this.socket?.on('room-online-count', callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

// 导出单例
export const socketService = new SocketService();