// server/src/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { triggerAlert } = require('../middlewares/securityMiddleware');
const { logAction } = require('../middlewares/auditLog');

// 验证token中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      _id: user._id,
      id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      hasAccess: user.hasAccess,
      coins: user.coins || 0,
      avatar: user.avatar,
      loginStreak: user.loginStreak || 0,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      equippedItems: user.equippedItems || {},
      stats: user.stats || { totalMessages: 0, totalRooms: 0, totalPersonas: 0 }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const joinDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      totalMessages: user.stats?.totalMessages || 0,
      totalRooms: user.stats?.totalRooms || 0,
      totalPersonas: user.stats?.totalPersonas || 0,
      joinDays,
      loginStreak: user.loginStreak || 0,
      coins: user.coins || 0
    });
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取背包物品
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user.inventory || []);
  } catch (error) {
    console.error('获取背包错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取成就
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user.achievements || []);
  } catch (error) {
    console.error('获取成就错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ✅ 修复：使用 router.post（不是 router/post）
router.post('/daily-reward', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const result = user.claimDailyReward();
    await user.save();

    // ✅ 审计日志
    await logAction(req, 'CLAIM_DAILY_REWARD', { 
      coins: result.coins, 
      streak: result.streak 
    });

    res.json({
      message: '领取成功',
      coins: result.coins,
      streak: result.streak,
      reward: result.reward
    });
  } catch (error) {
    console.error('领取每日奖励错误:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// 管理员：调整用户金币
router.post('/admin/adjust-coins/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { amount, reason } = req.body;
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (amount > 0) {
      await targetUser.addCoins(amount);
    } else {
      try {
        await targetUser.deductCoins(Math.abs(amount));
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    }

    console.log(`管理员 ${req.userId} 调整用户 ${req.params.userId} 金币: ${amount}, 原因: ${reason}`);

    // ✅ 审计日志
    await logAction(req, 'ADMIN_ADJUST_COINS', { 
      targetUserId: req.params.userId,
      amount,
      reason,
      newBalance: targetUser.coins
    });

    res.json({
      message: '金币调整成功',
      coins: targetUser.coins
    });
  } catch (error) {
    console.error('调整金币错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 购买物品
router.post('/buy-item', authMiddleware, async (req, res) => {
  try {
    const { itemId, itemType, name, description, price } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.coins < price) {
      return res.status(400).json({ error: '金币不足' });
    }

    await user.deductCoins(price);
    await user.addItem({
      itemId,
      itemType,
      name,
      description,
      quantity: 1
    });

    // ✅ 审计日志
    await logAction(req, 'BUY_ITEM', { 
      itemId, 
      itemType, 
      name, 
      price,
      newBalance: user.coins
    });

    res.json({
      message: '购买成功',
      coins: user.coins,
      item: {
        itemId,
        itemType,
        name,
        description
      }
    });
  } catch (error) {
    console.error('购买物品错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 装备物品
router.post('/equip-item', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await user.equipItem(itemId);
    await user.save();

    // ✅ 审计日志
    await logAction(req, 'EQUIP_ITEM', { itemId });

    res.json({
      message: '装备成功',
      equippedItems: user.equippedItems
    });
  } catch (error) {
    console.error('装备物品错误:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// ✅ 更新用户资料（包含生日、星座）
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, birthday, zodiac } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const oldDisplayName = user.displayName;
    const oldBirthday = user.birthday;
    
    if (displayName !== undefined) user.displayName = displayName;
    if (birthday !== undefined) user.birthday = birthday ? new Date(birthday) : null;
    if (zodiac !== undefined) user.zodiac = zodiac;
    
    await user.save();
    
    // ✅ 审计日志
    if (oldDisplayName !== displayName) {
      await logAction(req, 'UPDATE_PROFILE', { 
        field: 'displayName',
        oldValue: oldDisplayName,
        newValue: displayName
      });
    }
    
    if (oldBirthday !== birthday) {
      await logAction(req, 'UPDATE_PROFILE', { 
        field: 'birthday',
        oldValue: oldBirthday,
        newValue: birthday
      });
    }
    
    // ✅ 告警：资料修改
    if (oldDisplayName !== displayName) {
      await triggerAlert('PROFILE_UPDATE', req, { 
        userId: user._id, 
        field: 'displayName',
        oldValue: oldDisplayName,
        newValue: displayName
      });
    }
    
    res.json({ message: '更新成功', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 删除账户
router.post('/delete-account', authMiddleware, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // ✅ 审计日志：账户删除请求
    await logAction(req, 'DELETE_ACCOUNT_REQUEST', { 
      userId: user._id,
      username: user.username,
      email: user.email,
      hasVerificationCode: !!verificationCode
    });
    
    // ✅ 告警：账户删除请求
    await triggerAlert('ACCOUNT_DELETE_REQUEST', req, { 
      userId: user._id,
      username: user.username,
      email: user.email
    });
    
    // 实际删除逻辑（需要验证码确认）
    res.json({ 
      message: '账户删除功能需要二次验证，请查看邮件',
      requiresVerification: true 
    });
    
  } catch (error) {
    console.error('删除账户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;