// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const jwt = require('jsonwebtoken');
const { triggerAlert } = require('../middlewares/securityMiddleware');
const { logAction } = require('../middlewares/auditLog');

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

// ✅ 管理员中间件
const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// ========== Firebase 登录绑定 ==========
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;
    
    if (!user) {
      // 新用户注册
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
        status: 'active'
      });
      
      await user.save();
      isNewUser = true;
      
      // ✅ 审计日志：新用户注册
      await logAction(req, 'USER_REGISTER', { 
        email: user.email, 
        username: user.username,
        ip,
        userAgent
      });
      
      // ✅ 告警：新用户注册
      await triggerAlert('USER_REGISTER', req, {
        userId: user._id,
        email: user.email,
        username: user.username,
        ip,
        userAgent
      });
      
    } else {
      // 已有用户登录
      user.lastLogin = new Date();
      await user.save();
      
      // ✅ 审计日志：用户登录
      await logAction(req, 'USER_LOGIN', { 
        email: user.email,
        username: user.username
      });
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
    
    // ✅ 审计日志：邀请码使用
    await logAction(req, 'USE_INVITE_CODE', { 
      inviteCode: code.code,
      inviteType: code.type,
      newRole
    });
    
    // ✅ 告警：邀请码验证成功
    await triggerAlert('INVITE_USED', req, {
      userId: user._id,
      email: user.email,
      username: user.username,
      inviteType: code.type
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

// ========== 管理员：生成邀请码 ==========
router.post('/admin/create-invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { type = 'user', maxUses = 1, expiresInDays = 7, customCode } = req.body;
    
    // 权限检查...
    if (type === 'super_admin' && user.role !== 'owner' && user.role !== 'super_admin') {
      return res.status(403).json({ error: '只有超级管理员可以创建超级管理员邀请码' });
    }
    
    if (type === 'admin' && user.role === 'admin') {
      return res.status(403).json({ error: '管理员只能创建普通用户邀请码' });
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
      return res.status(400).json({ error: '邀请码已存在' });
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
    
    // ✅ 审计日志：创建邀请码
    await logAction(req, 'CREATE_INVITE_CODE', { 
      inviteCode: code,
      inviteType: type,
      maxUses,
      expiresInDays
    });
    
    // ✅ 告警：邀请码创建
    await triggerAlert('INVITE_CREATE', req, { type, code });
    
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

// ========== 获取当前用户 ==========
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (!user.hasAccess) {
      await triggerAlert('UNAUTHORIZED_ACCESS', req, { username: user.username });
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

// ... 其他路由保持不变

module.exports = router;