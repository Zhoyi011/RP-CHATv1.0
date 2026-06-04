// server/src/routes/diamond.js
// 修改现有方法，支持 paidDiamonds 和 freeDiamonds

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DiamondService = require('../services/diamondService');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// 奖励表
const REWARDS = [5, 5, 8, 8, 10, 15, 20];

const getRewardByStreak = (streak) => {
  if (streak <= 0) return REWARDS[0];
  if (streak > 7) {
    return REWARDS[(streak - 1) % 7];
  }
  return REWARDS[streak - 1];
};

// ========== GET 接口 ==========

// 获取钻石余额（返回分类）
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ 
      diamonds: user.getTotalDiamonds(),
      paidDiamonds: user.paidDiamonds || 0,
      freeDiamonds: user.freeDiamonds || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取每日信息
router.get('/daily-info', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const dailyInfo = user.getDailyInfo();
    res.json(dailyInfo);
  } catch (error) {
    console.error('获取每日信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取每日状态（兼容）
router.get('/daily-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const today = new Date().toDateString();
    const lastDailyDate = user.lastDailyDiamond ? new Date(user.lastDailyDiamond).toDateString() : null;
    const canClaim = lastDailyDate !== today;
    const streak = user.dailyDiamondStreak || 0;
    
    res.json({ canClaim, streak, diamonds: user.getTotalDiamonds() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST 接口 ==========

// 每日领取钻石（改为免费钻石）
router.post('/daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const result = user.claimDailyDiamond();
    await user.save();
    
    res.json({ 
      claimed: true,
      diamonds: user.getTotalDiamonds(),
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      reward: result.reward,
      streak: result.streak,
      reason: `获得 ${result.reward} 钻石！连续 ${result.streak} 天`
    });
  } catch (error) {
    console.error('领取失败:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * 🔥 新增：充值接口
 * POST /api/diamond/recharge
 * Body: { amount }
 */
router.post('/recharge', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: '充值金额必须大于0' });
    }
    
    await DiamondService.addPaidDiamonds(req.userId, amount);
    
    res.json({
      success: true,
      message: `成功充值 ${amount} 钻石`,
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds()
    });
  } catch (error) {
    console.error('充值失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;