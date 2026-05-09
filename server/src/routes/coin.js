const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const rewardService = require('../services/rewardService');
const jwt = require('jsonwebtoken');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
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
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取交易记录
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const user = await User.findById(req.userId);
    const transactions = await user.getTransactions(parseInt(limit), parseInt(skip));
    const stats = await user.getCoinStats();
    
    res.json({ transactions, stats });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 每日登录领取
router.post('/daily-login', authMiddleware, async (req, res) => {
  try {
    const result = await rewardService.checkDailyLogin(req.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || '领取失败' });
  }
});

// 获取奖励统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const stats = await user.getCoinStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 排行榜
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topUsers = await User.find({ status: 'active' })
      .select('username displayName avatar coins')
      .sort({ coins: -1 })
      .limit(parseInt(limit));
    
    res.json({ users: topUsers });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 初始化奖励规则（管理员）
router.post('/init-rules', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId);
  if (user.role !== 'owner' && user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  await rewardService.initDefaultRules();
  res.json({ message: '规则初始化成功' });
});

module.exports = router;