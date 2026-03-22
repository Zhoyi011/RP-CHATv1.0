const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===== 中间件 =====
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'https://rp-chat-v1-0.vercel.app',
    'https://rp-chatv1-0.onrender.com',
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json());

// ===== 限流配置 =====
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  skip: (req) => {
    return req.path.includes('/voice') || req.path.includes('/socket.io');
  }
});
app.use('/api', limiter);

// ===== 数据库连接 =====
console.log('📡 正在连接 MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(async () => {
  console.log('✅ MongoDB 连接成功');
  
  setTimeout(() => {
    console.log('📡 后台启动更新日志同步...');
    try {
      const { fetchAndSaveGitHubCommits } = require('./routes/changelog');
      fetchAndSaveGitHubCommits().catch(err => {
        console.error('⚠️ 更新日志同步失败:', err.message);
      });
    } catch (err) {
      console.error('⚠️ 加载更新日志模块失败:', err.message);
    }
  }, 15000);
  
  console.log('🚀 服务已就绪');
})
.catch(err => {
  console.error('❌ MongoDB 连接失败:', err.message);
});

// ===== 测试路由 =====
app.get('/api/test', (req, res) => {
  res.json({ message: 'RP Chat API 运行正常!', timestamp: new Date().toISOString() });
});

// ===== 路由 =====
const authRoutes = require('./routes/auth');
const personaRoutes = require('./routes/persona');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/user');
const changelogRoutes = require('./routes/changelog');
const searchRoutes = require('./routes/search');
const voiceRoutes = require('./routes/voice');

app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/user', userRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/voice', voiceRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ===== 错误处理 =====
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 API 地址: http://localhost:${PORT}/api/test`);
});

// ===== Socket.IO 配置 =====
const io = require('socket.io')(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'https://rp-chat-v1-0.vercel.app',
      'https://rp-chatv1-0.onrender.com',
      /\.vercel\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000
});

console.log('🎙️ Socket.IO 服务已启动');

// ========== 在线用户存储 ==========
const onlineUsers = new Map();

// ========== 语音房间存储 ==========
const voiceRooms = new Map();

// ========== 定期清理无效连接 ==========
setInterval(() => {
  voiceRooms.forEach((roomUsers, roomId) => {
    roomUsers.forEach((userInfo, socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        roomUsers.delete(socketId);
        console.log(`清理无效连接: ${userInfo.userId}`);
      }
    });
    if (roomUsers.size === 0) {
      voiceRooms.delete(roomId);
      console.log(`📭 语音房 ${roomId} 已空`);
    }
  });
}, 60000);

// ========== Socket 事件处理 ==========
io.on('connection', (socket) => {
  console.log('🟢 新客户端连接:', socket.id);
  
  // 立即发送连接确认
  socket.emit('connected', { id: socket.id });
  
  // 心跳保活
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    } else {
      clearInterval(heartbeat);
    }
  }, 25000);
  
  socket.on('pong', () => {
    // 心跳响应
  });
  
  // ========== 文字聊天室 ==========
  socket.on('join-room', async ({ roomId, userId, personaId }) => {
    try {
      socket.join(roomId);
      onlineUsers.set(socket.id, { userId, roomId, personaId, socketId: socket.id });
      const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === roomId);
      io.to(roomId).emit('room-online-count', { roomId, count: roomUsers.length });
      console.log(`👤 用户 ${userId} 加入房间 ${roomId}`);
    } catch (error) {
      console.error('加入房间失败:', error);
    }
  });
  
  socket.on('send-message', async (data) => {
    const { roomId, userId, personaId, content, isAction } = data;
    
    try {
      if (!roomId || !userId || !personaId || !content) {
        socket.emit('error', { message: '消息格式错误' });
        return;
      }
      
      const User = require('./models/User');
      const user = await User.findOne({ firebaseUid: userId });
      
      if (!user) {
        socket.emit('error', { message: '用户不存在' });
        return;
      }
      
      const Message = require('./models/Message');
      const message = new Message({
        roomId,
        userId: user._id,
        personaId,
        content,
        isAction: isAction || false
      });
      
      await message.save();
      
      const Persona = require('./models/Persona');
      const persona = await Persona.findById(personaId);
      
      if (!persona) return;
      
      const messageToSend = {
        _id: message._id,
        content: message.content,
        isAction: message.isAction,
        createdAt: message.createdAt,
        roomId: roomId,
        personaId: { _id: persona._id, name: persona.name },
        userId: { _id: user._id, username: user.username, firebaseUid: user.firebaseUid }
      };
      
      io.to(roomId).emit('new-message', messageToSend);
    } catch (error) {
      console.error('❌ 保存消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  socket.on('switch-persona', ({ userId, newPersonaId }) => {
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      userInfo.personaId = newPersonaId;
      onlineUsers.set(socket.id, userInfo);
      socket.to(userInfo.roomId).emit('persona-switched', { userId, newPersonaId });
    }
  });
  
  socket.on('leave-room', () => {
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      socket.leave(userInfo.roomId);
      onlineUsers.delete(socket.id);
      const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === userInfo.roomId);
      io.to(userInfo.roomId).emit('room-online-count', { roomId: userInfo.roomId, count: roomUsers.length });
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
  });
  
  // ========== 语音房 ==========
  socket.on('join-voice-room', ({ roomId, userId, personaId, personaName, username, avatar }) => {
    console.log(`🎙️ 用户 ${username} (${userId}) 加入语音房 ${roomId}`);
    
    if (!voiceRooms.has(roomId)) {
      voiceRooms.set(roomId, new Map());
    }
    
    const roomUsers = voiceRooms.get(roomId);
    
    // 检查是否是房主
    let isCreator = false;
    const VoiceRoom = require('./models/VoiceRoom');
    VoiceRoom.findById(roomId).then(room => {
      if (room && room.creatorId && room.creatorId.toString() === userId) {
        isCreator = true;
      }
    }).catch(console.error);
    
    const userInfo = { 
      userId, 
      personaId, 
      personaName, 
      username, 
      avatar, 
      muted: false, 
      speaking: false, 
      socketId: socket.id,
      isCreator: isCreator
    };
    roomUsers.set(socket.id, userInfo);
    
    socket.join(`voice-${roomId}`);
    socket.data.voiceRoomId = roomId;
    socket.data.userId = userId;
    socket.data.userInfo = userInfo;
    
    socket.to(`voice-${roomId}`).emit('user-joined-voice', userInfo);
    
    const userList = Array.from(roomUsers.values()).map(u => ({
      userId: u.userId,
      personaId: u.personaId,
      personaName: u.personaName,
      username: u.username,
      avatar: u.avatar,
      muted: u.muted,
      speaking: u.speaking,
      isCreator: u.isCreator
    }));
    socket.emit('voice-users', { users: userList });
    
    const VoiceRoomModel = require('./models/VoiceRoom');
    VoiceRoomModel.findByIdAndUpdate(roomId, { memberCount: roomUsers.size }).catch(console.error);
  });
  
  socket.on('leave-voice-room', ({ roomId, userId }) => {
    console.log(`🎙️ 用户 ${userId} 离开语音房 ${roomId}`);
    
    const roomUsers = voiceRooms.get(roomId);
    if (roomUsers) {
      let leftUserInfo = null;
      for (const [sid, info] of roomUsers.entries()) {
        if (info.userId === userId) {
          leftUserInfo = info;
          roomUsers.delete(sid);
          break;
        }
      }
      
      if (leftUserInfo) {
        socket.to(`voice-${roomId}`).emit('user-left-voice', { userId });
        console.log(`👋 用户 ${leftUserInfo.username} 离开了语音房`);
      }
      
      if (roomUsers.size === 0) {
        voiceRooms.delete(roomId);
        console.log(`📭 语音房 ${roomId} 已空`);
      } else {
        const VoiceRoomModel = require('./models/VoiceRoom');
        VoiceRoomModel.findByIdAndUpdate(roomId, { memberCount: roomUsers.size }).catch(console.error);
      }
    }
    
    socket.leave(`voice-${roomId}`);
    delete socket.data.voiceRoomId;
    delete socket.data.userId;
    delete socket.data.userInfo;
  });
  
  socket.on('voice-signal', ({ roomId, targetUserId, signal }) => {
    socket.to(`voice-${roomId}`).emit('voice-signal', {
      fromUserId: socket.data.userId,
      signal
    });
  });
  
  socket.on('voice-mute', ({ roomId, userId, muted }) => {
    const roomUsers = voiceRooms.get(roomId);
    if (roomUsers) {
      for (const [sid, info] of roomUsers.entries()) {
        if (info.userId === userId) {
          info.muted = muted;
          roomUsers.set(sid, info);
          break;
        }
      }
    }
    socket.to(`voice-${roomId}`).emit('voice-mute-changed', { userId, muted });
  });
  
  socket.on('voice-message', ({ roomId, message }) => {
    socket.to(`voice-${roomId}`).emit('voice-message', message);
  });
  
  // ========== 断开连接 ==========
  socket.on('disconnect', () => {
    console.log('🔌 客户端断开:', socket.id);
    clearInterval(heartbeat);
    
    // 处理文字聊天室
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      onlineUsers.delete(socket.id);
      const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === userInfo.roomId);
      io.to(userInfo.roomId).emit('room-online-count', { roomId: userInfo.roomId, count: roomUsers.length });
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
    
    // 处理语音房
    const voiceRoomId = socket.data.voiceRoomId;
    if (voiceRoomId) {
      const roomUsers = voiceRooms.get(voiceRoomId);
      if (roomUsers) {
        let leftUserId = null;
        let leftUserInfo = null;
        for (const [sid, info] of roomUsers.entries()) {
          if (sid === socket.id) {
            leftUserId = info.userId;
            leftUserInfo = info;
            roomUsers.delete(sid);
            break;
          }
        }
        if (leftUserId) {
          socket.to(`voice-${voiceRoomId}`).emit('user-left-voice', { userId: leftUserId });
          console.log(`👋 用户 ${leftUserInfo?.username} 断开连接，离开语音房`);
        }
        if (roomUsers.size === 0) {
          voiceRooms.delete(voiceRoomId);
          console.log(`📭 语音房 ${voiceRoomId} 已空`);
        } else {
          const VoiceRoomModel = require('./models/VoiceRoom');
          VoiceRoomModel.findByIdAndUpdate(voiceRoomId, { memberCount: roomUsers.size }).catch(console.error);
        }
      }
    }
  });
});

module.exports.io = io;
module.exports.server = server;