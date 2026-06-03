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
const fs = require('fs');
const { sendDeploymentNotification } = require('./services/discordAlert');
console.log('📦 [app] 依赖模块加载完成');

require('dotenv').config();
console.log('🔐 [app] 环境变量已加载');

// ===== 脏话过滤 =====
console.log('🔧 [app] 加载脏话过滤模块...');
const { filterMessage, isClean } = require('./services/contentFilter');
console.log('✅ [app] 脏话过滤模块加载完成');

const app = express();

// ========== 安全中间件导入 ==========
const {
  ipBlacklistMiddleware,
  rateLimitMiddleware,
  detectMaliciousUA,
  tokenBlacklistMiddleware,
  detectInjection,
  preventPathTraversal,
  securityHeaders,
  addToTokenBlacklist,
  getSecurityReport,
  getClientIp,
  isDeveloper,
  triggerAlert,
  CONFIG
} = require('./middlewares/securityMiddleware');

const { securityLogger } = require('./middlewares/securityLogger');

// ===== 中间件配置 =====
console.log('🔧 [app] 配置中间件...');

// 完全禁用 Helmet 的跨域策略
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
}));

console.log('  ✅ Helmet 安全配置完成');

// CORS 配置
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Debug-Token', 'X-Debug-Code', 'X-Debug-Request']
}));
console.log('  ✅ CORS 配置完成');

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
console.log('  ✅ JSON 解析中间件配置完成');

// ========== 安全中间件注册（顺序很重要！）==========
console.log('🔒 [app] 注册安全中间件...');

app.use(securityHeaders);                    // 1. 安全响应头
app.use(ipBlacklistMiddleware);              // 2. IP 黑名单
app.use(detectMaliciousUA);                 // 3. 恶意 UA 检测
app.use(preventPathTraversal);              // 4. 路径遍历防护
app.use(tokenBlacklistMiddleware);          // 5. Token 黑名单
app.use(detectInjection);                   // 6. 注入攻击检测
app.use(securityLogger);                    // 7. 安全日志（全局中间件）
console.log('  ✅ 安全中间件注册完成');

// ========== 维护模式拦截中间件 ==========
const SystemSettings = require('./models/SystemSettings');

const maintenanceInterceptor = async (req, res, next) => {
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-invite',
    '/api/admin/maintenance/status',
    '/api/admin/maintenance/check-schedules',
    '/api/admin/maintenance/exempt-admin',  
    '/api/test'
  ];
  
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  try {
    const maintenanceMode = await SystemSettings.findOne({ key: 'maintenance_mode' });
    
    if (maintenanceMode?.value === true) {
      let isExempt = false;
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
          const decoded = jwt.verify(token, secret);
          const User = require('./models/User');
          const user = await User.findById(decoded.userId);
          
          if (user) {
            const exemptAdminSetting = await SystemSettings.findOne({ key: 'maintenance_exempt_admin' });
            const exemptAdmin = exemptAdminSetting?.value === true;
            
            if (user.role === 'owner' || user.role === 'super_admin') {
              isExempt = true;
            }
            else if (user.role === 'admin' && exemptAdmin) {
              isExempt = true;
            }
          }
        } catch (e) {}
      }
      
      if (!isExempt) {
        const maintenanceMessage = await SystemSettings.findOne({ key: 'maintenance_message' });
        const maintenanceEndTime = await SystemSettings.findOne({ key: 'maintenance_end_time' });
        return res.status(503).json({
          error: '服务正在维护中',
          maintenanceMode: true,
          message: maintenanceMessage?.value || '服务器正在维护中，请稍后再试。',
          endTime: maintenanceEndTime?.value || null
        });
      }
    }
    next();
  } catch (error) {
    console.error('维护模式检查失败:', error);
    next();
  }
};

app.use(maintenanceInterceptor);
console.log('  ✅ 维护模式拦截中间件注册完成');

// ===== 数据库连接 =====
console.log('📡 [app] 正在连接 MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => console.log('✅ [MongoDB] 连接成功！'))
.catch(err => console.error('❌ [MongoDB] 连接失败:', err.message));

// ===== 健康检查 =====
app.get('/api/test', (req, res) => {
  res.json({ message: 'RP Chat API 运行正常!', timestamp: new Date().toISOString() });
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
const securityRoutes = require('./routes/security');
const adminRoutes = require('./routes/admin');
const redeemRoutes = require('./routes/redeem');
const patRoutes = require('./routes/pat');
const friendRoutes = require('./routes/friend'); // 🔥 新增：好友路由
const privateChatRoutes = require('./routes/privateChat');
console.log('  ✅ 主要路由加载完成');

let voiceRoutes, linkPreviewRoutes;
try { voiceRoutes = require('./routes/voice'); console.log('  ✅ 语音房路由加载完成'); } catch (err) {}
try { linkPreviewRoutes = require('./routes/linkPreview'); console.log('  ✅ 链接预览路由加载完成'); } catch (err) {}

// ========== 调试授权 API ==========
const DebugAuth = require('./models/DebugAuth');

app.post('/api/debug/request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    let decoded;
    try { decoded = jwt.verify(token, secret); } catch (e) { return res.status(401).json({ error: 'token无效' }); }
    
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'super_admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: '没有调试权限' });
    }
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await DebugAuth.countDocuments({ userId: user._id, createdAt: { $gt: oneHourAgo } });
    if (recentCount >= 3) {
      return res.status(429).json({ error: '申请过于频繁，请稍后再试' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    const debugAuth = new DebugAuth({ code, userId: user._id, expiresAt });
    await debugAuth.save();
    
    res.json({
      success: true,
      message: '验证码已生成',
      code: process.env.NODE_ENV === 'development' ? code : undefined,
      expiresIn: 5 * 60
    });
  } catch (error) {
    console.error('申请调试码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/debug/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    let decoded;
    try { decoded = jwt.verify(token, secret); } catch (e) { return res.status(401).json({ error: 'token无效' }); }
    
    const debugAuth = await DebugAuth.findOne({ code, userId: decoded.userId, isUsed: false, expiresAt: { $gt: new Date() } });
    if (!debugAuth) return res.status(403).json({ error: '验证码无效或已过期' });
    
    debugAuth.isUsed = true;
    debugAuth.usedAt = new Date();
    await debugAuth.save();
    
    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    const debugSessions = new Map();
    debugSessions.set(sessionToken, {
      userId: decoded.userId,
      expiresAt: Date.now() + 30 * 60 * 1000,
      createdAt: Date.now()
    });
    
    res.json({
      success: true,
      debugToken: sessionToken,
      expiresIn: 30 * 60,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('验证调试码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/debug/revoke', async (req, res) => {
  const { sessionToken } = req.body;
  res.json({ success: true });
});

// ========== API 路由（应用频率限制）==========
console.log('🔧 [app] 注册 API 路由...');

// 调大限制
const standardLimit = rateLimit({ windowMs: 60 * 1000, max: 200, keyGenerator: (req) => getClientIp(req) });
const strictLimit = rateLimit({ windowMs: 60 * 1000, max: 60, keyGenerator: (req) => getClientIp(req) });
const uploadLimit = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: (req) => getClientIp(req) });
const adminLimit = rateLimit({ windowMs: 60 * 1000, max: 300, keyGenerator: (req) => getClientIp(req) });

app.use('/api/auth', strictLimit, authRoutes);
app.use('/api/persona', standardLimit, personaRoutes);
app.use('/api/room', standardLimit, roomRoutes);
app.use('/api/user', standardLimit, userRoutes);
app.use('/api/changelog', strictLimit, changelogRoutes);
app.use('/api/search', standardLimit, searchRoutes);
app.use('/api/diamond', standardLimit, diamondRoutes);
app.use('/api/translate', standardLimit, translateRoutes);
app.use('/api/ai', standardLimit, aiRoutes);
app.use('/api/ai-persona', standardLimit, aiPersonaRoutes);
app.use('/api/shop', standardLimit, shopRoutes);
app.use('/api/post', standardLimit, postRoutes);
app.use('/api/upload', uploadLimit, uploadRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/redeem', redeemRoutes);
app.use('/api/admin', adminLimit, adminRoutes);
app.use('/api/user', adminLimit, userRoutes);
app.use('/api/pat', patRoutes);
app.use('/api/friend', standardLimit, friendRoutes); // 🔥 新增：好友路由
app.use('/api/private-chat', privateChatRoutes); // 🔥 新增：私聊路由
if (voiceRoutes) app.use('/api/voice', standardLimit, voiceRoutes);
if (linkPreviewRoutes) app.use('/api/link-preview', standardLimit, linkPreviewRoutes);

console.log('  ✅ 所有路由注册完成');

// ===== 安全报告端点 =====
app.get('/api/admin/security/report', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    let decoded;
    try { decoded = jwt.verify(token, secret); } catch (e) { return res.status(401).json({ error: 'token无效' }); }
    
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'super_admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: '需要超级管理员权限' });
    }
    
    const report = getSecurityReport();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="security_report.txt"');
    res.send(report);
  } catch (error) {
    console.error('生成安全报告失败:', error);
    res.status(500).json({ error: '生成报告失败' });
  }
});

// ===== 安全警报接收端点 =====
app.post('/api/security/alert', async (req, res) => {
  const { type, details, url, userAgent } = req.body;
  const ip = getClientIp(req);
  
  console.warn(`⚠️ 安全警报: ${type} - ${details} - IP: ${ip}`);
  
  try {
    fs.appendFileSync('/tmp/frontend_alerts.log', JSON.stringify({
      type, details, url, userAgent, ip, timestamp: new Date().toISOString()
    }) + '\n');
  } catch (e) {}
  
  res.json({ received: true });
});

// ===== 404 处理 =====
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ===== 错误处理 =====
app.use((err, req, res, next) => {
  console.error('❌ [Error] 服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ===== 启动服务器 =====
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 [HTTP] 服务器运行在 http://localhost:${PORT}`);
});

// ===== 定时检查维护计划 =====
const checkSchedulesInterval = setInterval(async () => {
  try {
    const checkRes = await fetch(`http://localhost:${PORT}/api/admin/maintenance/check-schedules`, {
      method: 'POST'
    });
  } catch (error) {
    // 忽略错误
  }
}, 5 * 60 * 1000); // 每5分钟检查一次
console.log('  ✅ 维护计划定时检查已启动（每5分钟）');

// ===== Socket.IO 配置 =====
const io = require('socket.io')(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://rp-chat-v1-0.vercel.app', 'https://rp-chatv1-0.onrender.com', /\.vercel\.app$/],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 🔥 关键：将 io 实例挂载到 app，供路由使用
app.set('io', io);

// 🔥 新增：导入 socketHelper 并设置 io 实例
const { setIo } = require('./utils/socketHelper');
setIo(io);
console.log('✅ [app] Socket.IO 实例已注册到 socketHelper');

// 注意：不再导出 emitToUser，改用 socketHelper 中的

const onlineUsers = new Map();
const roomOnlineCount = new Map();
const voiceRooms = new Map();

// Socket.IO 维护模式中间件
const socketMaintenanceMiddleware = async (socket, next) => {
  try {
    const maintenanceMode = await SystemSettings.findOne({ key: 'maintenance_mode' });
    if (maintenanceMode?.value === true) {
      let isExempt = false;
      const token = socket.handshake.auth.token;
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
          const decoded = jwt.verify(token, secret);
          const User = require('./models/User');
          const user = await User.findById(decoded.userId);
          
          if (user) {
            const exemptAdminSetting = await SystemSettings.findOne({ key: 'maintenance_exempt_admin' });
            const exemptAdmin = exemptAdminSetting?.value === true;
            
            if (user.role === 'owner' || user.role === 'super_admin') {
              isExempt = true;
            } else if (user.role === 'admin' && exemptAdmin) {
              isExempt = true;
            }
          }
        } catch (e) {}
      }
      if (!isExempt) {
        socket.emit('maintenance', { message: '服务器正在维护中' });
        return next(new Error('服务器正在维护中'));
      }
    }
    next();
  } catch (error) {
    next();
  }
};

io.use(socketMaintenanceMiddleware);

io.on('connection', (socket) => {
  console.log(`🟢 [Socket] 新客户端连接: ${socket.id}`);
  
  // 🔥 从 handshake 中获取 userId 并加入个人房间
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`  📍 用户 ${userId} 加入个人房间`);
  }
  
  socket.emit('connected', { id: socket.id, timestamp: Date.now() });
  
  const heartbeat = setInterval(() => {
    if (socket.connected) socket.emit('ping');
    else clearInterval(heartbeat);
  }, 25000);
  
  socket.on('pong', () => {});

  socket.on('join-room', async ({ roomId, userId, personaId }) => {
    try {
      const oldUserInfo = onlineUsers.get(socket.id);
      if (oldUserInfo && oldUserInfo.roomId !== roomId) {
        const oldRoomUsers = roomOnlineCount.get(oldUserInfo.roomId);
        if (oldRoomUsers) {
          oldRoomUsers.delete(userId);
          if (oldRoomUsers.size === 0) roomOnlineCount.delete(oldUserInfo.roomId);
          io.to(oldUserInfo.roomId).emit('room-online-count', { roomId: oldUserInfo.roomId, count: oldRoomUsers?.size || 0 });
        }
        socket.leave(oldUserInfo.roomId);
      }
      
      socket.join(roomId);
      onlineUsers.set(socket.id, { userId, roomId, personaId, socketId: socket.id });
      
      if (!roomOnlineCount.has(roomId)) roomOnlineCount.set(roomId, new Set());
      roomOnlineCount.get(roomId).add(userId);
      
      io.to(roomId).emit('room-online-count', { roomId, count: roomOnlineCount.get(roomId).size });
    } catch (error) {
      socket.emit('error', { message: '加入房间失败' });
    }
  });

  socket.on('send-message', async (data) => {
    const { roomId, userId, personaId, content, isAction, replyToId, isAudio, audioUrl, audioDuration } = data;
    try {
      const User = require('./models/User');
      const user = await User.findOne({ firebaseUid: userId });
      if (!user) return socket.emit('error', { message: '用户不存在' });
      
      const cleanContent = filterMessage(content);
      const Persona = require('./models/Persona');
      const persona = await Persona.findById(personaId).populate('equipped.avatarFrame', 'image name');
      if (!persona) return socket.emit('error', { message: '角色不存在' });
      
      let avatarFrameUrl = persona.equipped?.avatarFrame?.image || null;
      
      const Message = require('./models/Message');
      const message = new Message({ 
        roomId, 
        userId: user._id, 
        personaId, 
        content: cleanContent, 
        isAction: isAction || false, 
        isPat: false,
        isAudio: isAudio || false,
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        replyTo: replyToId || null 
      });
      await message.save();
      
      let replyToData = null;
      if (replyToId) {
        const replyToMessage = await Message.findById(replyToId);
        if (replyToMessage) {
          const replyPersona = await Persona.findById(replyToMessage.personaId);
          replyToData = { 
            _id: replyToMessage._id, 
            content: replyToMessage.content, 
            isRecalled: replyToMessage.isRecalled || false, 
            isDeleted: replyToMessage.isDeleted || false, 
            senderName: replyPersona ? (replyPersona.displayName || replyPersona.name) : '用户' 
          };
        }
      }
      
      io.in(roomId).emit('new-message', {
        _id: message._id,
        content: message.content,
        isAction: message.isAction,
        isPat: message.isPat || false,
        isRecalled: false,
        isDeleted: false,
        createdAt: message.createdAt,
        roomId,
        replyTo: replyToData,
        isAudio: message.isAudio || false,
        audioUrl: message.audioUrl || null,
        audioDuration: message.audioDuration || null,
        personaId: {
          _id: persona._id,
          name: persona.name,
          displayName: persona.displayName,
          avatar: persona.avatar,
          sameNameNumber: persona.sameNameNumber,
          avatarFrame: avatarFrameUrl,
          equipped: { avatarFrame: avatarFrameUrl }
        },
        userId: { _id: user._id, username: user.username, firebaseUid: user.firebaseUid }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  socket.on('recall-message', async ({ messageId, userId, roomId }) => {
    try {
      const Message = require('./models/Message');
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { message: '消息不存在' });
      
      const Persona = require('./models/Persona');
      const currentPersona = await Persona.findOne({ userId, status: 'approved' });
      if (!currentPersona) return socket.emit('error', { message: '请先选择一个角色' });
      
      if (message.userId.toString() !== currentPersona._id.toString() && message.personaId?.toString() !== currentPersona._id.toString()) {
        return socket.emit('error', { message: '只能撤回自己的消息' });
      }
      
      const diffSeconds = (Date.now() - new Date(message.createdAt).getTime()) / 1000;
      if (diffSeconds > 300) return socket.emit('error', { message: '只能撤回5分钟内的消息' });
      if (message.isRecalled) return socket.emit('error', { message: '消息已被撤回' });
      
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
    } catch (error) {
      console.error('撤回消息失败:', error);
      socket.emit('error', { message: '撤回失败' });
    }
  });
  
  socket.on('delete-message', async ({ messageId, userId }) => {
    try {
      const Message = require('./models/Message');
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { message: '消息不存在' });
      
      const Persona = require('./models/Persona');
      const currentPersona = await Persona.findOne({ userId, status: 'approved' });
      if (!currentPersona) return socket.emit('error', { message: '请先选择一个角色' });
      
      if (message.userId.toString() !== currentPersona._id.toString() && message.personaId?.toString() !== currentPersona._id.toString()) {
        return socket.emit('error', { message: '只能删除自己的消息' });
      }
      
      if (message.isDeleted) return socket.emit('error', { message: '消息已被删除' });
      
      message.isDeleted = true;
      message.deletedBy = userId;
      message.deletedAt = new Date();
      await message.save();
      
      socket.emit('message-deleted', { 
        messageId: message._id, 
        deletedAt: message.deletedAt 
      });
    } catch (error) {
      console.error('删除消息失败:', error);
      socket.emit('error', { message: '删除失败' });
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
      const roomUsers = roomOnlineCount.get(userInfo.roomId);
      if (roomUsers) {
        roomUsers.delete(userInfo.userId);
        if (roomUsers.size === 0) roomOnlineCount.delete(userInfo.roomId);
        io.to(userInfo.roomId).emit('room-online-count', { roomId: userInfo.roomId, count: roomUsers?.size || 0 });
      }
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
  });

  socket.on('disconnect', () => {
    clearInterval(heartbeat);
    
    // 离开个人房间
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.leave(`user:${userId}`);
      console.log(`  📍 用户 ${userId} 离开个人房间`);
    }
    
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      onlineUsers.delete(socket.id);
      const roomUsers = roomOnlineCount.get(userInfo.roomId);
      if (roomUsers) {
        roomUsers.delete(userInfo.userId);
        if (roomUsers.size === 0) roomOnlineCount.delete(userInfo.roomId);
        io.to(userInfo.roomId).emit('room-online-count', { roomId: userInfo.roomId, count: roomUsers?.size || 0 });
      }
      socket.to(userInfo.roomId).emit('user-left', { userId: userInfo.userId });
    }
  });
});

console.log('✅ [app] 所有初始化完成，等待请求...');

module.exports.io = io;
module.exports.server = server;