// server/src/routes/stats.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getStats, getLeaderboard, addExp } = require('../services/experienceService');
const Persona = require('../models/Persona');
const ActivePersona = require('../models/ActivePersona');

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

// 获取当前激活角色的统计数据
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // 获取当前激活的角色
    const active = await ActivePersona.findOne({ userId: req.userId });
    if (!active || !active.personaId) {
      return res.json({
        level: 1,
        exp: 0,
        totalExp: 0,
        expNeeded: 50,
        title: '🌱 初入万物',
        unlockedTitles: [],
        dailyExpGained: 0,
        dailyLimit: 100,
        hasPersona: false,
      });
    }

    const stats = await getStats(active.personaId);
    const persona = await Persona.findById(active.personaId);

    res.json({
      ...stats,
      hasPersona: true,
      personaId: active.personaId,
      personaName: persona?.displayName || persona?.name || '未知',
      avatar: persona?.avatar || '',
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取指定角色的统计数据
router.get('/persona/:personaId', async (req, res) => {
  try {
    const { personaId } = req.params;
    const stats = await getStats(personaId);
    const persona = await Persona.findById(personaId);

    res.json({
      ...stats,
      personaId,
      personaName: persona?.displayName || persona?.name || '未知',
      avatar: persona?.avatar || '',
    });
  } catch (error) {
    console.error('获取角色统计数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const leaderboard = await getLeaderboard(parseInt(limit));
    res.json({ leaderboard });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;