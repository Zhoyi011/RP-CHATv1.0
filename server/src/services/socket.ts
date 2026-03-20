import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io('https://rp-chat-backend.onrender.com', {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 加入房间
  joinRoom(roomId: string, userId: string, personaId: string) {
    this.socket?.emit('join-room', { roomId, userId, personaId });
  }

  // 离开房间
  leaveRoom() {
    this.socket?.emit('leave-room');
  }

  // 发送消息
  sendMessage(roomId: string, userId: string, personaId: string, content: string, isAction = false) {
    this.socket?.emit('send-message', { roomId, userId, personaId, content, isAction });
  }

  // 切换角色
  switchPersona(userId: string, newPersonaId: string) {
    this.socket?.emit('switch-persona', { userId, newPersonaId });
  }

  // 监听新消息
  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new-message', callback);
  }

  // 监听用户加入
  onUserJoined(callback: (data: any) => void) {
    this.socket?.on('user-joined', callback);
  }

  // 监听用户离开
  onUserLeft(callback: (data: any) => void) {
    this.socket?.on('user-left', callback);
  }

  // 监听角色切换
  onPersonaSwitched(callback: (data: any) => void) {
    this.socket?.on('persona-switched', callback);
  }

  // 移除所有监听
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
