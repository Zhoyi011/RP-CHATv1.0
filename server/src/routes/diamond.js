const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// 获取钻石余额
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ diamonds: user.diamonds || 0, coins: user.coins || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取每日钻石信息（兼容前端调用）
router.get('/daily-info', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    const canClaim = lastDailyDate !== today;
    const streak = user.dailyDiamondStreak || 0;
    
    const baseReward = 50;
    const streakBonus = Math.min(streak * 10, 100);
    const reward = baseReward + streakBonus;
    
    res.json({ 
      canClaim, 
      streak, 
      reward,
      diamonds: user.diamonds || 0 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取每日领取状态（别名）
router.get('/daily-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    const canClaim = lastDailyDate !== today;
    const streak = user.dailyDiamondStreak || 0;
    
    res.json({ canClaim, streak, diamonds: user.diamonds || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 每日领取钻石
router.post('/daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    
    if (lastDailyDate === today) {
      return res.status(400).json({ error: '今日已经领取过了' });
    }
    
    let streak = user.dailyDiamondStreak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastDailyDate === yesterdayStr) {
      streak++;
    } else {
      streak = 1;
    }
    
    const baseReward = 50;
    const streakBonus = Math.min(streak * 10, 100);
    const reward = baseReward + streakBonus;
    
    user.diamonds = (user.diamonds || 0) + reward;
    user.lastDailyDiamond = new Date();
    user.dailyDiamondStreak = streak;
    await user.save();
    
    res.json({ 
      success: true, 
      diamonds: user.diamonds,
      reward,
      streak,
      message: `获得 ${reward} 钻石！连续领取 ${streak} 天`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;