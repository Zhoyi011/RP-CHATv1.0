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

// 奖励表（与前端一致）
const REWARDS = [5, 5, 8, 8, 10, 15, 20];

const getRewardByStreak = (streak) => {
  if (streak <= 0) return REWARDS[0];
  if (streak > 7) {
    return REWARDS[(streak - 1) % 7];
  }
  return REWARDS[streak - 1];
};

// ========== GET 接口 ==========

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

// 获取每日信息（前端 DailyDiamond 组件调用）
router.get('/daily-info', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    const hasClaimed = lastDailyDate === today;
    const currentStreak = user.dailyDiamondStreak || 0;
    
    // 下一个奖励（今天能领到的）
    const nextStreak = hasClaimed ? currentStreak + 1 : currentStreak + 1;
    const nextReward = getRewardByStreak(nextStreak);
    
    res.json({ 
      hasClaimed,
      currentStreak: currentStreak,
      nextReward,
      rewards: REWARDS
    });
  } catch (error) {
    console.error('获取每日信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取每日状态（别名，兼容）
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

// ========== POST 接口 ==========

// 每日领取钻石
router.post('/daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    
    // 检查是否已领取
    if (lastDailyDate === today) {
      return res.status(400).json({ error: '今日已经领取过了' });
    }
    
    // 计算连续天数
    let streak = user.dailyDiamondStreak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastDailyDate === yesterdayStr) {
      streak++;
    } else {
      streak = 1;
    }
    
    // 获取奖励
    const reward = getRewardByStreak(streak);
    
    // 更新用户
    user.diamonds = (user.diamonds || 0) + reward;
    user.lastDailyDiamond = new Date();
    user.dailyDiamondStreak = streak;
    await user.save();
    
    res.json({ 
      claimed: true,
      diamonds: user.diamonds,
      reward,
      streak,
      reason: `获得 ${reward} 钻石！连续 ${streak} 天`
    });
  } catch (error) {
    console.error('领取失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;