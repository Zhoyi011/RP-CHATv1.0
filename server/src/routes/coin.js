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
  } catch {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取当前金币余额
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ coins: user?.coins || 0 });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取交易记录
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const transactions = await user.getTransactions(parseInt(limit), parseInt(skip));
    const stats = await user.getCoinStats();
    
    res.json({ transactions, stats });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 每日登录领取
router.post('/daily-login', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const result = user.claimDailyReward();
    await user.save();
    
    res.json({
      claimed: true,
      reward: result.reward,
      streak: result.streak,
      newBalance: result.coins
    });
  } catch (error) {
    console.error('领取每日奖励失败:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// 获取统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const stats = await user.getCoinStats();
    res.json(stats);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取排行榜
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topUsers = await User.find({ status: 'active' })
      .select('username displayName avatar coins')
      .sort({ coins: -1 })
      .limit(parseInt(limit));
    
    res.json({ users: topUsers });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;