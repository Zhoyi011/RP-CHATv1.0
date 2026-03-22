const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
    
    // ✅ 返回完整的用户信息，包括金币
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

    // 计算加入天数
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

// 每日登录领取金币
router.post('/daily-reward', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const result = user.claimDailyReward();
    await user.save();

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
    // 检查权限
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

    // 记录操作日志
    console.log(`管理员 ${req.userId} 调整用户 ${req.params.userId} 金币: ${amount}, 原因: ${reason}`);

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

    // 检查金币是否足够
    if (user.coins < price) {
      return res.status(400).json({ error: '金币不足' });
    }

    // 扣除金币
    await user.deductCoins(price);

    // 添加物品到背包
    await user.addItem({
      itemId,
      itemType,
      name,
      description,
      quantity: 1
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

    res.json({
      message: '装备成功',
      equippedItems: user.equippedItems
    });
  } catch (error) {
    console.error('装备物品错误:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

module.exports = router;