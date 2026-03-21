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

// ===== 限流 =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: '请求过于频繁，请稍后再试',
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
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
  
  // 不阻塞启动，延迟执行更新日志同步
  setTimeout(() => {
    console.log('📡 后台启动更新日志同步（不阻塞服务）...');
    try {
      const { fetchAndSaveGitHubCommits } = require('./routes/changelog');
      fetchAndSaveGitHubCommits().catch(err => {
        console.error('⚠️ 更新日志同步失败:', err.message);
      });
    } catch (err) {
      console.error('⚠️ 加载更新日志模块失败:', err.message);
    }
  }, 15000); // 15秒后执行
  
  console.log('🚀 服务已就绪，等待请求...');
})
.catch(err => {
  console.error('❌ MongoDB 连接失败:', err.message);
  // 即使数据库连接失败，服务器也要启动（至少返回错误信息）
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

app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/user', userRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/search', searchRoutes);

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

// ===== Socket.IO =====
const io = require('socket.io')(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'https://rp-chat-v1-0.vercel.app',
      /\.vercel\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// 存储在线用户
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 新客户端连接:', socket.id);
  
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
  
  socket.on('disconnect', () => {
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      onlineUsers.delete(socket.id);
      const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === userInfo.roomId);
      io.to(userInfo.roomId).emit('room-online-count', { roomId: userInfo.roomId, count: roomUsers.length });
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
    console.log('🔌 客户端断开:', socket.id);
  });
});

module.exports.io = io;
module.exports.server = server;