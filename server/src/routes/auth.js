// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { triggerAlert } = require('../middlewares/securityMiddleware');
const { logAction } = require('../middlewares/auditLog');

// ===== 验证 hCaptcha =====
async function verifyHCaptcha(token) {
  if (!token) return false;
  
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET_KEY,
        response: token
      })
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('hCaptcha 验证失败:', error);
    return false;
  }
}

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

// ========== 邮箱密码注册 ==========
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, captchaToken } = req.body;
    
    // 验证验证码（生产环境）
    if (process.env.NODE_ENV === 'production') {
      const isValidCaptcha = await verifyHCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({ error: '请完成验证码验证' });
      }
    }
    
    // 验证输入
    if (!username || username.length < 2) {
      return res.status(400).json({ error: '用户名至少需要2个字符' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }
    
    // 检查用户名是否存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 检查邮箱是否存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }
    
    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const user = new User({
      username,
      email,
      password: hashedPassword,
      displayName: username,
      hasAccess: false,
      role: 'user',
      status: 'active'
    });
    
    await user.save();
    
    // 生成 token
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role, hasAccess: false },
      secret,
      { expiresIn: '7d' }
    );
    
    // 审计日志
    await logAction(req, 'USER_REGISTER', { email: user.email, username: user.username });
    
    console.log(`✅ 新用户注册: ${username} (${email})`);
    
    res.json({ 
      message: '注册成功，请输入邀请码激活账号',
      token,
      user: user.toSafeObject(),
      needsInvite: true
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 邮箱密码登录 ==========
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    
    // 验证验证码（生产环境）
    if (process.env.NODE_ENV === 'production') {
      const isValidCaptcha = await verifyHCaptcha(captchaToken);
      if (!isValidCaptcha) {
        await triggerAlert('CAPTCHA_FAILED', req, { email });
        return res.status(400).json({ error: '请完成验证码验证' });
      }
    }
    
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }
    
    // 查找用户（通过邮箱或用户名）
    const user = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: email }] 
    });
    
    if (!user) {
      await triggerAlert('FAILED_LOGIN', req, { username: email, reason: '用户不存在' });
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 检查用户是否有密码（Google 登录用户可能没有密码）
    if (!user.password) {
      return res.status(401).json({ error: '此账号使用第三方登录，请使用 Google 登录' });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await triggerAlert('FAILED_LOGIN', req, { username: user.username, reason: '密码错误' });
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();
    
    // 生成 token
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role, hasAccess: user.hasAccess || false },
      secret,
      { expiresIn: '7d' }
    );
    
    // 审计日志
    await logAction(req, 'USER_LOGIN', { email: user.email, username: user.username });
    
    console.log(`✅ 用户登录: ${user.username} (${user.email})`);
    
    res.json({
      message: '登录成功',
      token,
      user: user.toSafeObject(),
      needsInvite: !user.hasAccess
    });
    
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== Firebase 登录绑定 ==========
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, captchaToken } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // 验证验证码（生产环境）
    if (process.env.NODE_ENV === 'production') {
      const isValidCaptcha = await verifyHCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({ error: '请完成验证码验证' });
      }
    }
    
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
      
      // 审计日志
      await logAction(req, 'USER_REGISTER', { email: user.email, username: user.username });
      await triggerAlert('USER_REGISTER', req, { userId: user._id, email: user.email, username: user.username });
      
    } else {
      // 已有用户登录
      user.lastLogin = new Date();
      await user.save();
      
      // 审计日志
      await logAction(req, 'USER_LOGIN', { email: user.email, username: user.username });
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
    
    // 审计日志
    await logAction(req, 'USE_INVITE_CODE', { inviteCode: code.code, inviteType: code.type, newRole });
    await triggerAlert('INVITE_USED', req, { userId: user._id, username: user.username, inviteType: code.type });
    
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

// ========== 管理员：生成邀请码 ==========
router.post('/admin/create-invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { type = 'user', maxUses = 1, expiresInDays = 7, customCode } = req.body;
    
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
    
    await logAction(req, 'CREATE_INVITE_CODE', { inviteCode: code, inviteType: type });
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
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
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
    
    await triggerAlert('ROLE_CHANGE', req, { targetUserId: user._id, targetUsername: user.username, newRole: role });
    
    res.json({ message: '用户角色已更新', user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;