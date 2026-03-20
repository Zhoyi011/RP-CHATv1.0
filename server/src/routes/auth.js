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
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// ========== 公开路由 ==========

// Firebase 登录绑定
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;
    
    console.log('Firebase login attempt:', { firebaseUid, email });
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    // 查找或创建用户
    let user = await User.findOne({ email });
    
    if (!user) {
      // 改进用户名生成逻辑
      let baseUsername = (displayName || email.split('@')[0]).trim();
      // 移除特殊字符，只保留字母数字
      baseUsername = baseUsername.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
      
      // 确保长度至少为 3
      if (baseUsername.length < 3) {
        baseUsername = 'user_' + Math.random().toString(36).substring(2, 5);
      }
      
      // 确保长度不超过 20
      if (baseUsername.length > 20) {
        baseUsername = baseUsername.substring(0, 20);
      }

      let username = baseUsername;
      let counter = 1;
      
      // 检查用户名唯一性
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
      // 更新 firebaseUid
      user.firebaseUid = firebaseUid;
      if (displayName && !user.displayName) {
        user.displayName = displayName;
      }
      user.lastLogin = new Date();
      await user.save();
    }

    // 确保 JWT_SECRET 存在，否则使用 fallback 以避免 500 错误
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ 警告: JWT_SECRET 未设置，使用 fallback 秘钥');
    }

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
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        hasAccess: user.hasAccess || false
      },
      needsInvite: !user.hasAccess
    });

  } catch (error) {
    console.error('Firebase 登录详细错误:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: '服务器错误', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// 验证邀请码
router.post('/verify-invite', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    console.log('Verifying invite:', { inviteCode, userId: req.userId });
    
    // 查找邀请码
    const code = await InviteCode.findOne({ 
      code: inviteCode, 
      isActive: true,
      usedBy: null
    });
    
    if (!code) {
      return res.status(400).json({ error: '无效的邀请码' });
    }
    
    // 查找用户
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 更新用户
    user.hasAccess = true;
    user.inviteCode = inviteCode;
    await user.save();
    
    // 标记邀请码为已使用
    code.usedBy = user._id;
    await code.save();
    
    // 确保 JWT_SECRET 存在
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
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        hasAccess: true
      }
    });

  } catch (error) {
    console.error('验证邀请码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      hasAccess: user.hasAccess
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员生成邀请码
router.post('/admin/create-invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { customCode } = req.body;
    
    // 生成6位随机邀请码
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const code = customCode || generateCode();
    
    // 检查是否已存在
    const existing = await InviteCode.findOne({ code });
    if (existing) {
      return res.status(400).json({ error: '邀请码已存在' });
    }
    
    const inviteCode = new InviteCode({
      code,
      createdBy: req.userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });
    
    await inviteCode.save();
    
    res.json({
      message: '邀请码创建成功',
      code: inviteCode.code
    });

  } catch (error) {
    console.error('创建邀请码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
