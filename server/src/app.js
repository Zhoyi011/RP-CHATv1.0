// ==================== RP Chat 后端服务 ====================
console.log('🚀 [app] RP Chat 后端服务启动中...');
console.log(`🕐 [app] 启动时间: ${new Date().toISOString()}`);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const aiRoutes = require('./routes/ai');
const path = require('path');

console.log('📦 [app] 依赖模块加载完成');

require('dotenv').config();
console.log('🔐 [app] 环境变量已加载');

// ===== 脏话过滤（只声明一次）=====
console.log('🔧 [app] 加载脏话过滤模块...');
const { filterMessage, isClean } = require('./services/contentFilter');
console.log('✅ [app] 脏话过滤模块加载完成');

const app = express();

// ===== 中间件配置 =====
console.log('🔧 [app] 配置中间件...');

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false,
}));
console.log('  ✅ Helmet 安全配置完成');

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'https://rp-chat-v1-0.vercel.app',
    'https://rp-chatv1-0.onrender.com',
    /\.vercel\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
console.log('  ✅ CORS 配置完成，允许的源:', [
    'localhost:5173', 'localhost:3000', 
    'rp-chat-v1-0.vercel.app', 'rp-chatv1-0.onrender.com'
]);

app.options('*', cors());
app.use(express.json());
console.log('  ✅ JSON 解析中间件配置完成');

// ===== 限流配置 =====
console.log('🔧 [app] 配置限流...');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  skip: (req) => req.path.includes('/voice') || req.path.includes('/socket.io')
});
app.use('/api', limiter);
console.log('  ✅ 限流配置完成，限制: 200次/分钟');

// ===== 数据库连接 =====
console.log('📡 [app] 正在连接 MongoDB...');
console.log(`  📍 MongoDB URI: ${process.env.MONGODB_URI ? '已配置 ✅' : '未配置 ❌'}`);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => {
  console.log('✅ [MongoDB] 连接成功！');
  console.log('🚀 [app] 服务已就绪');
})
.catch(err => {
  console.error('❌ [MongoDB] 连接失败:', err.message);
  console.error('📋 [MongoDB] 请检查: 1) URI是否正确 2) 网络是否可达 3) IP白名单');
});

// ===== 健康检查 =====
app.get('/api/test', (req, res) => {
  console.log(`📊 [API] /api/test 被访问 - IP: ${req.ip}`);
  res.json({ 
    message: 'RP Chat API 运行正常!', 
    timestamp: new Date().toISOString(),
    status: 'online'
  });
});

// ===== 路由加载 =====
console.log('🔧 [app] 加载路由模块...');

const authRoutes = require('./routes/auth');
const personaRoutes = require('./routes/persona');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/user');
const changelogRoutes = require('./routes/changelog');
const searchRoutes = require('./routes/search');
const diamondRoutes = require('./routes/diamond');
const translateRoutes = require('./routes/translate');
const aiPersonaRoutes = require('./routes/aiPersona');
const shopRoutes = require('./routes/shop');
const postRoutes = require('./routes/post');
const uploadRoutes = require('./routes/upload');
console.log('  ✅ 基础路由加载完成');

let voiceRoutes;
try {
  voiceRoutes = require('./routes/voice');
  console.log('  ✅ 语音房路由加载完成');
} catch (err) {
  console.log('  ⚠️ 语音房路由未加载（可忽略）:', err.message);
}

let linkPreviewRoutes;
try {
  linkPreviewRoutes = require('./routes/linkPreview');
  console.log('  ✅ 链接预览路由加载完成');
} catch (err) {
  console.log('  ⚠️ 链接预览路由未加载（可忽略）:', err.message);
}

// ===== 注册路由 =====
console.log('🔧 [app] 注册路由...');
app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/user', userRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/diamond', diamondRoutes);
if (voiceRoutes) app.use('/api/voice', voiceRoutes);
if (linkPreviewRoutes) app.use('/api/link-preview', linkPreviewRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-persona', aiPersonaRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/post', postRoutes);
app.use('/api/upload', uploadRoutes);
console.log('  ✅ 所有路由注册完成');


// ===== 404 处理 =====
app.use((req, res) => {
  console.log(`⚠️ [404] 未找到接口: ${req.method} ${req.url}`);
  res.status(404).json({ error: '接口不存在' });
});

// ===== 错误处理 =====
app.use((err, req, res, next) => {
  console.error('❌ [Error] 服务器错误:', err);
  console.error('  📍 URL:', req.method, req.url);
  console.error('  📍 错误堆栈:', err.stack);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ===== 启动 HTTP 服务器 =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 [HTTP] 服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 [API] 测试地址: http://localhost:${PORT}/api/test`);
});

// ===== Socket.IO 配置 =====
console.log('🔧 [Socket] 配置 Socket.IO...');
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
  transports: ['websocket', 'polling']
});

console.log('🎙️ [Socket] Socket.IO 服务已启动');

// ===== 在线用户存储 =====
const onlineUsers = new Map(); // socket.id -> { userId, roomId, personaId }
const roomOnlineCount = new Map(); // roomId -> Set of userIds
const voiceRooms = new Map();

console.log('📊 [Storage] 在线用户和语音房存储已初始化');

// 定期清理无效连接
setInterval(() => {
  let cleanedCount = 0;
  voiceRooms.forEach((roomUsers, roomId) => {
    roomUsers.forEach((userInfo, socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        roomUsers.delete(socketId);
        cleanedCount++;
      }
    });
    if (roomUsers.size === 0) voiceRooms.delete(roomId);
  });
  if (cleanedCount > 0) {
    console.log(`🧹 [Cleanup] 清理了 ${cleanedCount} 个无效语音房连接`);
  }
}, 60000);

// ===== Socket 事件处理 =====
io.on('connection', (socket) => {
  console.log(`🟢 [Socket] 新客户端连接: ${socket.id}`);
  
  socket.emit('connected', { id: socket.id, timestamp: Date.now() });
  console.log(`  📨 [Socket] 发送 connected 事件到 ${socket.id}`);
  
  // 心跳
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
      console.log(`💓 [Socket] 发送 ping 到 ${socket.id}`);
    } else {
      clearInterval(heartbeat);
      console.log(`💀 [Socket] ${socket.id} 已断开，停止心跳`);
    }
  }, 25000);
  
  socket.on('pong', () => {
    console.log(`💓 [Socket] 收到 pong 从 ${socket.id}`);
  });

  // ========== 文字聊天 ==========
  socket.on('join-room', async ({ roomId, userId, personaId }) => {
    console.log(`📡 [Socket] ${socket.id} 请求加入房间: ${roomId}, 用户: ${userId}, 角色: ${personaId}`);
    try {
      // 离开之前的房间
      const oldUserInfo = onlineUsers.get(socket.id);
      if (oldUserInfo && oldUserInfo.roomId !== roomId) {
        const oldRoomUsers = roomOnlineCount.get(oldUserInfo.roomId);
        if (oldRoomUsers) {
          oldRoomUsers.delete(userId);
          if (oldRoomUsers.size === 0) {
            roomOnlineCount.delete(oldUserInfo.roomId);
          }
          io.to(oldUserInfo.roomId).emit('room-online-count', { 
            roomId: oldUserInfo.roomId, 
            count: oldRoomUsers?.size || 0 
          });
        }
        socket.leave(oldUserInfo.roomId);
      }
      
      socket.join(roomId);
      onlineUsers.set(socket.id, { userId, roomId, personaId, socketId: socket.id });
      
      if (!roomOnlineCount.has(roomId)) {
        roomOnlineCount.set(roomId, new Set());
      }
      roomOnlineCount.get(roomId).add(userId);
      
      io.to(roomId).emit('room-online-count', { 
        roomId, 
        count: roomOnlineCount.get(roomId).size 
      });
      
      console.log(`✅ [Socket] 用户 ${userId} 加入房间 ${roomId} 成功，当前在线: ${roomOnlineCount.get(roomId).size}`);
    } catch (error) {
      console.error(`❌ [Socket] 加入房间失败:`, error);
      socket.emit('error', { message: '加入房间失败' });
    }
  });

  // 发送消息（支持回复）
  socket.on('send-message', async (data) => {
    const { roomId, userId, personaId, content, isAction, replyToId } = data;
    console.log(`📨 [Socket] 收到消息，房间: ${roomId}, 用户: ${userId}, 回复: ${replyToId || '无'}, 内容长度: ${content?.length}`);
    
    try {
      if (!roomId || !userId || !personaId || !content) {
        console.log(`⚠️ [Socket] 消息格式错误:`, { roomId, userId, personaId, contentLength: content?.length });
        socket.emit('error', { message: '消息格式错误' });
        return;
      }
      
      console.log(`🔍 [Socket] 查询用户: ${userId}`);
      const User = require('./models/User');
      const user = await User.findOne({ firebaseUid: userId });
      
      if (!user) {
        console.log(`❌ [Socket] 用户不存在: ${userId}`);
        socket.emit('error', { message: '用户不存在' });
        return;
      }
      console.log(`✅ [Socket] 找到用户: ${user.username}`);

      // 过滤脏话
      console.log(`🔍 [Socket] 过滤前消息: ${content.substring(0, 50)}...`);
      const cleanContent = filterMessage(content);
      console.log(`✅ [Socket] 过滤后消息: ${cleanContent.substring(0, 50)}...`);
      
      // 验证回复的消息是否存在
      let replyToMessage = null;
      if (replyToId) {
        const Message = require('./models/Message');
        replyToMessage = await Message.findById(replyToId);
        if (!replyToMessage) {
          console.log(`⚠️ [Socket] 引用的消息不存在: ${replyToId}`);
          // 不阻止发送，只是回复引用无效
        }
      }
      
      const Message = require('./models/Message');
      const message = new Message({
        roomId,
        userId: user._id,
        personaId,
        content: cleanContent,
        isAction: isAction || false,
        replyTo: replyToId || null
      });
      
      await message.save();
      console.log(`💾 [Socket] 消息已保存，ID: ${message._id}`);
      
      const Persona = require('./models/Persona');
      const persona = await Persona.findById(personaId);
      
      if (!persona) {
        console.log(`❌ [Socket] 角色不存在: ${personaId}`);
        return;
      }
      console.log(`✅ [Socket] 找到角色: ${persona.name}`);

      // 更新 Persona 在群里的最后使用时间
      try {
        await persona.markUsedInRoom(roomId);
      } catch (err) {
        console.log(`⚠️ [Socket] 更新角色使用时间失败:`, err.message);
      }
      
      // 处理回复数据
      let replyToData = null;
      if (replyToId && replyToMessage) {
        const replyPersona = await Persona.findById(replyToMessage.personaId);
        replyToData = {
          _id: replyToMessage._id,
          content: replyToMessage.content,
          isRecalled: replyToMessage.isRecalled || false,
          isDeleted: replyToMessage.isDeleted || false,
          senderName: replyPersona ? (replyPersona.displayName || replyPersona.name) : '用户'
        };
      }
      
      const messageToSend = {
        _id: message._id,
        content: message.content,
        isAction: message.isAction,
        createdAt: message.createdAt,
        roomId: roomId,
        replyTo: replyToData,
        isRecalled: false,
        isDeleted: false,
        personaId: { 
          _id: persona._id, 
          name: persona.name,
          displayName: persona.displayName,
          avatar: persona.avatar,
          sameNameNumber: persona.sameNameNumber
        },
        userId: { _id: user._id, username: user.username, firebaseUid: user.firebaseUid }
      };
      
      io.in(roomId).emit('new-message', messageToSend);
      console.log(`📢 [Socket] 消息已广播到房间 ${roomId}`);
    } catch (error) {
      console.error('❌ [Socket] 保存消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  // 撤回消息事件处理
  socket.on('recall-message', async (data) => {
    const { messageId, userId, roomId } = data;
    console.log(`⏪ [Socket] 撤回消息请求: ${messageId}, 用户: ${userId}`);
    
    try {
      const Message = require('./models/Message');
      const message = await Message.findById(messageId);
      
      if (!message) {
        socket.emit('error', { message: '消息不存在' });
        return;
      }
      
      const Persona = require('./models/Persona');
      const currentPersona = await Persona.findOne({ userId: userId, status: 'approved' });
      
      if (!currentPersona) {
        socket.emit('error', { message: '请先选择一个角色' });
        return;
      }
      
      if (message.userId.toString() !== currentPersona._id.toString() && 
          message.personaId?.toString() !== currentPersona._id.toString()) {
        socket.emit('error', { message: '只能撤回自己的消息' });
        return;
      }
      
      const diffSeconds = (Date.now() - new Date(message.createdAt).getTime()) / 1000;
      if (diffSeconds > 5 * 60) {
        socket.emit('error', { message: '只能撤回5分钟内的消息' });
        return;
      }
      
      if (message.isRecalled) {
        socket.emit('error', { message: '消息已被撤回' });
        return;
      }
      
      message.isRecalled = true;
      message.recalledAt = new Date();
      await message.save();
      
      const persona = await Persona.findById(message.personaId);
      const senderName = persona ? (persona.displayName || persona.name) : '用户';
      
      io.in(roomId).emit('message-recalled', {
        messageId: message._id,
        recalledBy: userId,
        recalledByName: senderName,
        recalledAt: message.recalledAt
      });
      
      console.log(`✅ [Socket] 消息撤回成功: ${messageId}`);
    } catch (error) {
      console.error('❌ [Socket] 撤回失败:', error);
      socket.emit('error', { message: error.message || '撤回失败' });
    }
  });
  
  // 删除消息事件处理（软删除，仅自己不可见）
  socket.on('delete-message', async (data) => {
    const { messageId, userId, roomId } = data;
    console.log(`🗑️ [Socket] 删除消息请求: ${messageId}, 用户: ${userId}`);
    
    try {
      const Message = require('./models/Message');
      const message = await Message.findById(messageId);
      
      if (!message) {
        socket.emit('error', { message: '消息不存在' });
        return;
      }
      
      const Persona = require('./models/Persona');
      const currentPersona = await Persona.findOne({ userId: userId, status: 'approved' });
      
      if (!currentPersona) {
        socket.emit('error', { message: '请先选择一个角色' });
        return;
      }
      
      if (message.userId.toString() !== currentPersona._id.toString() && 
          message.personaId?.toString() !== currentPersona._id.toString()) {
        socket.emit('error', { message: '只能删除自己的消息' });
        return;
      }
      
      if (message.isDeleted) {
        socket.emit('error', { message: '消息已被删除' });
        return;
      }
      
      message.isDeleted = true;
      message.deletedBy = userId;
      message.deletedAt = new Date();
      await message.save();
      
      // 通知删除者本人消息已被删除
      socket.emit('message-deleted', {
        messageId: message._id,
        deletedAt: message.deletedAt
      });
      
      console.log(`✅ [Socket] 消息软删除成功: ${messageId}`);
    } catch (error) {
      console.error('❌ [Socket] 删除失败:', error);
      socket.emit('error', { message: error.message || '删除失败' });
    }
  });
  
  socket.on('switch-persona', ({ userId, newPersonaId }) => {
    console.log(`🔄 [Socket] ${userId} 切换角色到 ${newPersonaId}`);
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      userInfo.personaId = newPersonaId;
      onlineUsers.set(socket.id, userInfo);
      socket.to(userInfo.roomId).emit('persona-switched', { userId, newPersonaId });
      console.log(`✅ [Socket] 角色切换完成，已通知房间 ${userInfo.roomId}`);
    } else {
      console.log(`⚠️ [Socket] 未找到用户信息，无法切换角色`);
    }
  });
  
  socket.on('leave-room', () => {
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      console.log(`👋 [Socket] 用户 ${userInfo.userId} 离开房间 ${userInfo.roomId}`);
      socket.leave(userInfo.roomId);
      onlineUsers.delete(socket.id);
      
      const roomUsers = roomOnlineCount.get(userInfo.roomId);
      if (roomUsers) {
        roomUsers.delete(userInfo.userId);
        if (roomUsers.size === 0) {
          roomOnlineCount.delete(userInfo.roomId);
        }
        io.to(userInfo.roomId).emit('room-online-count', { 
          roomId: userInfo.roomId, 
          count: roomUsers?.size || 0 
        });
      }
      
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
      console.log(`✅ [Socket] 用户已离开，房间剩余: ${roomUsers?.size || 0}`);
    }
  });

  // ========== 语音房 ==========
  socket.on('join-voice-room', ({ roomId, userId, personaId, personaName, username, avatar }) => {
    console.log(`🎙️ [Socket] 用户 ${username}(${userId}) 加入语音房 ${roomId}`);
    
    if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
    const roomUsers = voiceRooms.get(roomId);
    
    let isCreator = false;
    const VoiceRoom = require('./models/VoiceRoom');
    VoiceRoom.findById(roomId).then(room => {
      if (room && room.creatorId && room.creatorId.toString() === userId) {
        isCreator = true;
        console.log(`👑 [Socket] 用户 ${userId} 是语音房创建者`);
      }
    }).catch(console.error);
    
    const userInfo = { userId, personaId, personaName, username, avatar, muted: false, speaking: false, socketId: socket.id, isCreator };
    roomUsers.set(socket.id, userInfo);
    
    socket.join(`voice-${roomId}`);
    socket.data.voiceRoomId = roomId;
    socket.data.userId = userId;
    socket.data.userInfo = userInfo;
    
    socket.to(`voice-${roomId}`).emit('user-joined-voice', userInfo);
    console.log(`📢 [Socket] 已通知语音房 ${roomId} 有新用户加入`);
    
    socket.emit('voice-users', {
      users: Array.from(roomUsers.values()).map(u => ({
        userId: u.userId, personaId: u.personaId, personaName: u.personaName,
        username: u.username, avatar: u.avatar, muted: u.muted, speaking: u.speaking, isCreator: u.isCreator
      }))
    });
    console.log(`📋 [Socket] 发送当前语音房用户列表，共 ${roomUsers.size} 人`);
    
    const VoiceRoomModel = require('./models/VoiceRoom');
    VoiceRoomModel.findByIdAndUpdate(roomId, { memberCount: roomUsers.size }).catch(console.error);
  });
  
  socket.on('leave-voice-room', ({ roomId, userId }) => {
    console.log(`🚪 [Socket] 用户 ${userId} 离开语音房 ${roomId}`);
    const roomUsers = voiceRooms.get(roomId);
    if (roomUsers) {
      let leftUserInfo = null;
      for (const [sid, info] of roomUsers.entries()) {
        if (info.userId === userId) { leftUserInfo = info; roomUsers.delete(sid); break; }
      }
      if (leftUserInfo) {
        socket.to(`voice-${roomId}`).emit('user-left-voice', { userId });
        console.log(`📢 [Socket] 已通知语音房用户离开`);
      }
      if (roomUsers.size === 0) {
        voiceRooms.delete(roomId);
        console.log(`🗑️ [Socket] 语音房 ${roomId} 已清空，删除记录`);
      } else {
        const VoiceRoomModel = require('./models/VoiceRoom');
        VoiceRoomModel.findByIdAndUpdate(roomId, { memberCount: roomUsers.size }).catch(console.error);
      }
    }
    socket.leave(`voice-${roomId}`);
    delete socket.data.voiceRoomId;
    delete socket.data.userId;
    delete socket.data.userInfo;
    console.log(`✅ [Socket] 用户 ${userId} 已离开语音房`);
  });
  
  socket.on('voice-signal', ({ roomId, targetUserId, signal }) => {
    console.log(`📡 [Socket] WebRTC 信号，房间: ${roomId}, 目标: ${targetUserId}`);
    socket.to(`voice-${roomId}`).emit('voice-signal', { fromUserId: socket.data.userId, signal });
  });
  
  socket.on('voice-mute', ({ roomId, userId, muted }) => {
    console.log(`🔇 [Socket] 用户 ${userId} ${muted ? '静音' : '取消静音'}`);
    const roomUsers = voiceRooms.get(roomId);
    if (roomUsers) {
      for (const [sid, info] of roomUsers.entries()) {
        if (info.userId === userId) { info.muted = muted; roomUsers.set(sid, info); break; }
      }
    }
    socket.to(`voice-${roomId}`).emit('voice-mute-changed', { userId, muted });
  });
  
  socket.on('voice-message', ({ roomId, message }) => {
    console.log(`💬 [Socket] 语音房间文字消息，房间: ${roomId}`);
    socket.to(`voice-${roomId}`).emit('voice-message', message);
  });

  // ========== 断开连接 ==========
  socket.on('disconnect', () => {
    console.log(`🔌 [Socket] 客户端断开: ${socket.id}`);
    console.log(`  📍 断开时间: ${new Date().toISOString()}`);
    clearInterval(heartbeat);
    
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      console.log(`  👤 用户 ${userInfo.userId} 从房间 ${userInfo.roomId} 断开`);
      onlineUsers.delete(socket.id);
      
      const roomUsers = roomOnlineCount.get(userInfo.roomId);
      if (roomUsers) {
        roomUsers.delete(userInfo.userId);
        if (roomUsers.size === 0) {
          roomOnlineCount.delete(userInfo.roomId);
        }
        io.to(userInfo.roomId).emit('room-online-count', { 
          roomId: userInfo.roomId, 
          count: roomUsers?.size || 0 
        });
      }
      
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
    
    const voiceRoomId = socket.data.voiceRoomId;
    if (voiceRoomId) {
      console.log(`  🎙️ 用户从语音房 ${voiceRoomId} 断开`);
      const roomUsers = voiceRooms.get(voiceRoomId);
      if (roomUsers) {
        let leftUserId = null;
        let leftUserInfo = null;
        for (const [sid, info] of roomUsers.entries()) {
          if (sid === socket.id) { leftUserId = info.userId; leftUserInfo = info; roomUsers.delete(sid); break; }
        }
        if (leftUserId) {
          socket.to(`voice-${voiceRoomId}`).emit('user-left-voice', { userId: leftUserId });
        }
        if (roomUsers.size === 0) {
          voiceRooms.delete(voiceRoomId);
        } else {
          const VoiceRoomModel = require('./models/VoiceRoom');
          VoiceRoomModel.findByIdAndUpdate(voiceRoomId, { memberCount: roomUsers.size }).catch(console.error);
        }
      }
    }
    console.log(`✅ [Socket] 断开清理完成`);
  });
});

console.log('✅ [app] 所有初始化完成，等待请求...');

module.exports.io = io;
module.exports.server = server;