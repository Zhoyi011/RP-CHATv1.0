import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    console.log('Connecting socket with token');
    
    this.socket = io('https://rp-chatv1-0.onrender.com', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  joinRoom(roomId: string, userId: string, personaId: string) {
    console.log(`Joining room ${roomId} as ${personaId}`);
    this.socket?.emit('join-room', { roomId, userId, personaId });
  }

  leaveRoom() {
    console.log('Leaving room');
    this.socket?.emit('leave-room');
  }

  sendMessage(roomId: string, userId: string, personaId: string, content: string, isAction = false) {
    console.log(`Sending message to ${roomId}:`, content);
    this.socket?.emit('send-message', { roomId, userId, personaId, content, isAction });
  }

  switchPersona(userId: string, newPersonaId: string) {
    console.log(`Switching to persona ${newPersonaId}`);
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

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
