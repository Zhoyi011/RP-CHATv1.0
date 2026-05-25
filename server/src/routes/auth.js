// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const jwt = require('jsonwebtoken');
const { triggerAlert } = require('../middlewares/securityMiddleware');

// ===== 中间件 =====
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// ✅ 超级管理员中间件
const superAdminMiddleware = (req, res, next) => {
  if (req.userRole !== 'super_admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要超级管理员权限' });
  }
  next();
};

// ✅ 管理员中间件（包括超级管理员）
const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

const ownerMiddleware = (req, res, next) => {
  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要群主权限' });
  }
  next();
};

// ========== Firebase 登录绑定（增强版 - 带告警和新设备检测）==========
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;
    
    if (!user) {
      // ===== 新用户注册 =====
      let baseUsername = (displayName || email.split('@')[0]).trim();
      baseUsername = baseUsername.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
      
      if (baseUsername.length < 3) {
        baseUsername = 'user_' + Math.random().toString(36).substring(2, 5);
      }
      if (baseUsername.length > 20) {
        baseUsername = baseUsername.substring(0, 20);
      }

      let username = baseUsername;
      let counter = 1;
      
      while (await User.findOne({ username })) {
        const suffix = counter.toString();
        username = baseUsername.substring(0, 20 - suffix.length) + suffix;
        counter++;
      }
      
      user = new User({
        email,
        username,
        firebaseUid,
        displayName: displayName || username,
        hasAccess: false,
        role: 'user',
        status: 'active',
        previousIps: [ip],
        previousUserAgents: [userAgent],
        lastLogin: new Date()
      });
      
      await user.save();
      isNewUser = true;
      
      console.log('✅ 新用户创建:', email, '用户名:', username);
      
      // ✅ 告警：新用户注册
      await triggerAlert('USER_REGISTER', req, {
        userId: user._id,
        email: user.email,
        username: user.username,
        ip,
        userAgent
      });
      
    } else {
      // ===== 已有用户登录 =====
      const previousIps = user.previousIps || [];
      const previousUserAgents = user.previousUserAgents || [];
      
      const isNewIp = !previousIps.includes(ip);
      const isNewDevice = !previousUserAgents.includes(userAgent);
      
      // 记录登录历史
      if (isNewIp) {
        previousIps.push(ip);
        if (previousIps.length > 20) previousIps.shift();
        user.previousIps = previousIps;
      }
      
      if (isNewDevice) {
        previousUserAgents.push(userAgent);
        if (previousUserAgents.length > 10) previousUserAgents.shift();
        user.previousUserAgents = previousUserAgents;
      }
      
      user.firebaseUid = firebaseUid;
      if (displayName && !user.displayName) {
        user.displayName = displayName;
      }
      user.lastLogin = new Date();
      await user.save();
      
      console.log('✅ 用户登录:', email);
      
      // ✅ 告警：新设备/新IP登录
      if (isNewDevice || isNewIp) {
        await triggerAlert('NEW_DEVICE_LOGIN', req, {
          userId: user._id,
          email: user.email,
          username: user.username,
          isNewIp,
          isNewDevice,
          ip,
          userAgent
        });
      }
      
      // ✅ 告警：正常登录（可选，减少频率）
      // 可以只在新设备时告警，避免刷屏
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username,
        role: user.role,
        hasAccess: user.hasAccess || false
      },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: user.toSafeObject(),
      needsInvite: !user.hasAccess,
      isNewUser
    });

  } catch (error) {
    console.error('Firebase 登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 验证邀请码 ==========
router.post('/verify-invite', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    const code = await InviteCode.findOne({ 
      code: inviteCode.toUpperCase(), 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!code) {
      return res.status(400).json({ error: '无效或已过期的邀请码' });
    }
    
    if (code.usesCount >= code.maxUses) {
      return res.status(400).json({ error: '邀请码已达到最大使用次数' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.hasAccess) {
      return res.status(400).json({ error: '你已经拥有访问权限，无需重复输入' });
    }
    
    let newRole = 'user';
    if (code.type === 'super_admin') {
      newRole = 'super_admin';
    } else if (code.type === 'admin') {
      newRole = 'admin';
    } else {
      newRole = 'user';
    }
    
    user.hasAccess = true;
    user.role = newRole;
    user.inviteCode = inviteCode.toUpperCase();
    await user.save();
    
    code.usedBy = user._id;
    code.usedAt = new Date();
    code.usesCount += 1;
    if (code.usesCount >= code.maxUses) {
      code.isActive = false;
    }
    await code.save();
    
    console.log(`✅ 用户 ${user.email} 使用 ${code.type} 邀请码，角色设为 ${newRole}`);
    
    // ✅ 告警：邀请码验证成功
    await triggerAlert('INVITE_USED', req, {
      userId: user._id,
      email: user.email,
      username: user.username,
      inviteType: code.type,
      inviteCode: code.code
    });
    
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username,
        role: newRole,
        hasAccess: true 
      },
      secret,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: '邀请码验证成功',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('验证邀请码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 获取当前用户（增强版 - 检查访问权限）==========
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (!user.hasAccess) {
      console.warn(`⚠️ 安全警告: 用户 ${user.username} (${user._id}) 尝试无权限访问 API`);
      
      const fs = require('fs');
      const logEntry = {
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        userId: user._id,
        username: user.username,
        email: user.email,
        action: '尝试访问受保护的 API',
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      fs.appendFileSync('/tmp/security_alerts.json', JSON.stringify(logEntry) + '\n');
      
      await triggerAlert('UNAUTHORIZED_ACCESS', req, { 
        username: user.username, 
        userId: user._id 
      });
      
      return res.status(403).json({ 
        error: '您的账号尚未激活，请联系管理员获取邀请码',
        code: 'ACCESS_DENIED'
      });
    }
    
    res.json({
      ...user.toSafeObject(),
      birthday: user.birthday ? user.birthday.toISOString().split('T')[0] : null,
      zodiac: user.zodiac || '',
      hasAccess: user.hasAccess
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 用户设置 ==========
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({
      theme: user.theme || 'light',
      notifications: user.notifications !== false,
      soundEnabled: user.soundEnabled !== false,
      defaultTranslate: user.defaultTranslate || 'off',
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { theme, notifications, soundEnabled, defaultTranslate } = req.body;
    const update = {};
    
    if (theme && ['light', 'dark', 'auto'].includes(theme)) update.theme = theme;
    if (notifications !== undefined) update.notifications = notifications;
    if (soundEnabled !== undefined) update.soundEnabled = soundEnabled;
    if (defaultTranslate && ['off', 'simplified', 'traditional'].includes(defaultTranslate)) {
      update.defaultTranslate = defaultTranslate;
    }
    
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({ message: '设置已保存', user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：生成邀请码（权限控制）==========
router.post('/admin/create-invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { type = 'user', maxUses = 1, expiresInDays = 7, customCode } = req.body;
    
    if (type === 'super_admin') {
      if (user.role !== 'owner' && user.role !== 'super_admin') {
        return res.status(403).json({ error: '只有超级管理员可以创建超级管理员邀请码' });
      }
    }
    
    if (type === 'admin') {
      if (user.role === 'admin') {
        return res.status(403).json({ error: '管理员只能创建普通用户邀请码' });
      }
    }
    
    if (user.role === 'admin') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayCount = await InviteCode.countDocuments({
        createdBy: req.userId,
        createdAt: { $gte: today, $lt: tomorrow }
      });
      
      if (todayCount >= 1) {
        return res.status(429).json({ error: '管理员每天只能创建 1 个邀请码，请明天再试' });
      }
    }
    
    let code = customCode;
    if (!code) {
      const prefix = type === 'super_admin' ? 'SA' : type === 'admin' ? 'AD' : 'IN';
      code = InviteCode.generateCodeWithPrefix(prefix);
    } else {
      code = code.toUpperCase();
    }
    
    const existing = await InviteCode.findOne({ code });
    if (existing) {
      return res.status(400).json({ error: '邀请码已存在，请重试' });
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const inviteCode = new InviteCode({
      code,
      type,
      createdBy: req.userId,
      expiresAt,
      maxUses,
      usesCount: 0,
      isActive: true
    });
    
    await inviteCode.save();
    
    // ✅ 告警：邀请码创建
    await triggerAlert('INVITE_CREATE', req, { 
      type, 
      code, 
      maxUses,
      createdBy: user.username,
      createdById: user._id
    });
    
    console.log(`✅ ${user.role} ${user.username} 创建了 ${type} 邀请码: ${code}`);
    
    res.json({
      message: '邀请码创建成功',
      code: inviteCode.code,
      type: inviteCode.type,
      maxUses: inviteCode.maxUses,
      expiresAt: inviteCode.expiresAt
    });

  } catch (error) {
    console.error('创建邀请码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：查看所有邀请码 ==========
router.get('/admin/invite-codes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const codes = await InviteCode.find()
      .populate('createdBy', 'username role')
      .populate('usedBy', 'username email')
      .sort({ createdAt: -1 });
    
    const now = new Date();
    for (const code of codes) {
      if (code.isActive && code.expiresAt < now && code.usesCount < code.maxUses) {
        code.isActive = false;
        await code.save();
      }
    }
    
    res.json(codes);
  } catch (error) {
    console.error('获取邀请码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：删除邀请码 ==========
router.delete('/admin/invite-codes/:codeId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const code = await InviteCode.findById(req.params.codeId);
    if (!code) {
      return res.status(404).json({ error: '邀请码不存在' });
    }
    
    if (code.usesCount > 0) {
      return res.status(400).json({ error: '已被使用的邀请码不能删除' });
    }
    
    await InviteCode.findByIdAndDelete(req.params.codeId);
    res.json({ message: '邀请码已删除' });
  } catch (error) {
    console.error('删除邀请码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：用户管理 ==========
router/get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/admin/users/:userId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'banned', 'muted'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    const user = await User.findByIdAndUpdate(req.params.userId, { status }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ message: '用户状态已更新', user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：更新用户角色（超级管理员专用）==========
router.put('/admin/users/:userId/role', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }
    
    const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    // ✅ 告警：角色变更
    await triggerAlert('ROLE_CHANGE', req, {
      targetUserId: user._id,
      targetUsername: user.username,
      newRole: role,
      changedBy: req.userId
    });
    
    res.json({ message: '用户角色已更新', user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;