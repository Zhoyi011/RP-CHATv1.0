const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const jwt = require('jsonwebtoken');

// 验证token中间件
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

// 管理员中间件
const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// ========== Firebase 登录绑定 ==========
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
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
      console.log('✅ 新用户创建:', email, '用户名:', username);
    } else {
      user.firebaseUid = firebaseUid;
      if (displayName && !user.displayName) {
        user.displayName = displayName;
      }
      user.lastLogin = new Date();
      await user.save();
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
      needsInvite: !user.hasAccess
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
      usedBy: null,
      expiresAt: { $gt: new Date() }
    });
    
    if (!code) {
      return res.status(400).json({ error: '无效或已过期的邀请码' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.hasAccess) {
      return res.status(400).json({ error: '你已经拥有访问权限' });
    }
    
    user.hasAccess = true;
    user.inviteCode = inviteCode.toUpperCase();
    await user.save();
    
    code.usedBy = user._id;
    await code.save();
    
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username,
        role: user.role,
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
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user.toSafeObject());
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 用户设置 ==========

// 获取设置
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      theme: user.theme || 'light',
      notifications: user.notifications !== false,
      soundEnabled: user.soundEnabled !== false,
      defaultTranslate: user.defaultTranslate || 'off',
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新设置
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
    console.error('保存设置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：生成邀请码 ==========
router.post('/admin/create-invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { customCode } = req.body;
    
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const code = (customCode || generateCode()).toUpperCase();
    
    const existing = await InviteCode.findOne({ code });
    if (existing) {
      return res.status(400).json({ error: '邀请码已存在' });
    }
    
    const inviteCode = new InviteCode({
      code,
      createdBy: req.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      isActive: true
    });
    
    await inviteCode.save();
    
    res.json({
      message: '邀请码创建成功',
      code: inviteCode.code,
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
      .populate('createdBy', 'username')
      .populate('usedBy', 'username email')
      .sort({ createdAt: -1 });
    
    // 自动更新过期状态
    const now = new Date();
    for (const code of codes) {
      if (code.isActive && code.expiresAt < now && !code.usedBy) {
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
    
    // 不允许删除已被使用的邀请码
    if (code.usedBy) {
      return res.status(400).json({ error: '已被使用的邀请码不能删除' });
    }
    
    await InviteCode.findByIdAndDelete(req.params.codeId);
    res.json({ message: '邀请码已删除' });
  } catch (error) {
    console.error('删除邀请码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：查看所有用户 ==========
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员：更新用户状态 ==========
router.put('/admin/users/:userId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'banned', 'muted'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ message: '用户状态已更新', user: user.toSafeObject() });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;