const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 每日钻石奖励配置
const DAILY_REWARDS = [5, 5, 8, 8, 10, 15, 20];

// 获取当前钻石数量
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ diamonds: user?.diamonds || 0 });
  } catch (error) {
    console.error('获取钻石失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 每日登录领取
router.post('/daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const today = new Date().toDateString();
    const lastClaim = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;

    if (lastClaim === today) {
      return res.json({ 
        claimed: false, 
        reason: '今日已领取',
        diamonds: user.diamonds 
      });
    }

    // 计算连续天数
    let streak = user.dailyDiamondStreak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastClaim === yesterday.toDateString()) {
      streak = Math.min(streak + 1, 6);
    } else {
      streak = 0;
    }

    const reward = DAILY_REWARDS[streak];
    user.diamonds += reward;
    user.dailyDiamondStreak = streak + 1;
    user.lastDailyDiamond = new Date();
    await user.save();

    res.json({
      claimed: true,
      reward: reward,
      streak: streak + 1,
      diamonds: user.diamonds
    });
  } catch (error) {
    console.error('领取每日钻石失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取每日奖励信息
router.get('/daily-info', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const today = new Date().toDateString();
    const lastClaim = user?.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    const hasClaimed = lastClaim === today;
    
    let currentStreak = user?.dailyDiamondStreak || 0;
    if (!hasClaimed && currentStreak > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastClaim !== yesterday.toDateString()) {
        currentStreak = 0;
      }
    }
    
    const nextReward = DAILY_REWARDS[currentStreak];
    
    res.json({
      hasClaimed,
      currentStreak,
      nextReward,
      rewards: DAILY_REWARDS
    });
  } catch (error) {
    console.error('获取每日信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;