const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const searchRoutes = require('./routes/search');
require('dotenv').config();

const app = express();

// ===== 中间件 =====
// Helmet 配置（允许弹窗，解决 Firebase 登录问题）
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false,
}));

// CORS 配置
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

// 预检请求处理
app.options('*', cors());

app.use(express.json());

// ===== 限流配置 =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 每个IP最多500个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  // 解决 X-Forwarded-For 警告
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});
app.use('/api', limiter);

// ===== 数据库连接 =====
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => console.log('✅ MongoDB 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err.message));

// ===== 测试路由 =====
app.get('/api/test', (req, res) => {
  res.json({ message: 'RP Chat API 运行正常!' });
});

// ===== 路由 =====
const authRoutes = require('./routes/auth');
const personaRoutes = require('./routes/persona');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/user');
const changelogRoutes = require('./routes/changelog');

app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/user', userRoutes);
app.use('/api/changelog', changelogRoutes);

// ===== 错误处理中间件 =====
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
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
  
  // 用户加入房间
  socket.on('join-room', async ({ roomId, userId, personaId }) => {
    try {
      socket.join(roomId);
      
      // 记录用户
      onlineUsers.set(socket.id, { userId, roomId, personaId, socketId: socket.id });
      
      // 更新房间在线人数
      const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === roomId);
      io.to(roomId).emit('room-online-count', { roomId, count: roomUsers.length });
      
      console.log(`用户 ${userId} 使用皮 ${personaId} 加入房间 ${roomId}`);
    } catch (error) {
      console.error('加入房间失败:', error);
    }
  });
  
  // 发送消息
  socket.on('send-message', async (data) => {
    const { roomId, userId, personaId, content, isAction } = data;
    
    try {
      console.log('📨 收到消息:', { roomId, userId, personaId, content });
      
      // 验证必要字段
      if (!roomId || !userId || !personaId || !content) {
        console.error('消息缺少必要字段');
        socket.emit('error', { message: '消息格式错误' });
        return;
      }
      
      // 先根据 Firebase UID 查找对应的 MongoDB 用户 ID
      const User = require('./models/User');
      const user = await User.findOne({ firebaseUid: userId });
      
      if (!user) {
        console.error('❌ 找不到对应的 MongoDB 用户:', userId);
        socket.emit('error', { message: '用户不存在' });
        return;
      }
      
      // 保存消息到数据库
      const Message = require('./models/Message');
      const message = new Message({
        roomId,
        userId: user._id,
        personaId,
        content,
        isAction: isAction || false
      });
      
      await message.save();
      console.log('✅ 消息保存成功:', message._id);
      
      // 获取角色信息
      const Persona = require('./models/Persona');
      const persona = await Persona.findById(personaId);
      
      if (!persona) {
        console.error('❌ 角色不存在:', personaId);
        return;
      }
      
      // 广播消息给房间所有人
      const messageToSend = {
        _id: message._id,
        content: message.content,
        isAction: message.isAction,
        createdAt: message.createdAt,
        roomId: roomId,
        personaId: {
          _id: persona._id,
          name: persona.name
        },
        userId: {
          _id: user._id,
          username: user.username,
          firebaseUid: user.firebaseUid
        }
      };
      
      console.log('📢 广播消息到房间:', roomId);
      io.to(roomId).emit('new-message', messageToSend);
      
    } catch (error) {
      console.error('❌ 保存消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  // 切换皮
  socket.on('switch-persona', ({ userId, newPersonaId }) => {
    try {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        userInfo.personaId = newPersonaId;
        onlineUsers.set(socket.id, userInfo);
        
        // 通知房间
        socket.to(userInfo.roomId).emit('persona-switched', {
          userId,
          newPersonaId,
          message: '用户切换了角色'
        });
      }
    } catch (error) {
      console.error('切换角色失败:', error);
    }
  });
  
  // 离开房间
  socket.on('leave-room', () => {
    try {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        socket.leave(userInfo.roomId);
        
        // 更新房间在线人数
        onlineUsers.delete(socket.id);
        const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === userInfo.roomId);
        io.to(userInfo.roomId).emit('room-online-count', { 
          roomId: userInfo.roomId, 
          count: roomUsers.length 
        });
        
        socket.to(userInfo.roomId).emit('user-left', {
          userId: userInfo.userId,
          message: '用户离开了聊天室'
        });
      }
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    try {
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) {
        // 更新房间在线人数
        onlineUsers.delete(socket.id);
        const roomUsers = Array.from(onlineUsers.values()).filter(u => u.roomId === userInfo.roomId);
        io.to(userInfo.roomId).emit('room-online-count', { 
          roomId: userInfo.roomId, 
          count: roomUsers.length 
        });
        
        socket.to(userInfo.roomId).emit('user-left', {
          userId: userInfo.userId,
          message: '用户断开了连接'
        });
      }
      console.log('🔴 客户端断开:', socket.id);
    } catch (error) {
      console.error('断开连接处理失败:', error);
    }
  });
});

app.use('/api/search', searchRoutes);

// 导出 io 供其他模块使用
module.exports.io = io;
module.exports.server = server;