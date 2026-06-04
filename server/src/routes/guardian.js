// server/src/routes/guardian.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Persona = require('../models/Persona');
const GiftRecord = require('../models/GiftRecord');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

/**
 * 获取全局守护榜
 * GET /api/guardian/ranking
 */
router.get('/ranking', authMiddleware, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const ranking = await Persona.getGuardianRanking(parseInt(limit));

    // 获取每个角色的送礼人数
    const rankingWithDetails = await Promise.all(ranking.map(async (persona) => {
      const giftCount = await GiftRecord.countDocuments({ 
        toPersonaId: persona._id,
        status: 'completed'
      });
      
      const topGuardians = await GiftRecord.aggregate([
        { $match: { toPersonaId: persona._id, status: 'completed' } },
        { $group: { _id: '$fromPersonaId', total: { $sum: '$guardValue' } } },
        { $sort: { total: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'personas',
            localField: '_id',
            foreignField: '_id',
            as: 'guardian'
          }
        },
        { $unwind: '$guardian' }
      ]);

      return {
        ...persona.toObject(),
        giftCount,
        topGuardians: topGuardians.map(g => ({
          personaId: g.guardian._id,
          name: g.guardian.displayName || g.guardian.name,
          avatar: g.guardian.avatar,
          amount: g.total
        }))
      };
    }));

    res.json({
      ranking: rankingWithDetails,
      total: ranking.length
    });

  } catch (error) {
    console.error('获取守护榜失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取角色的守护者列表
 * GET /api/guardian/persona/:personaId
 */
router.get('/persona/:personaId', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.params;
    const { limit = 20 } = req.query;

    const guardians = await GiftRecord.aggregate([
      { $match: { toPersonaId: personaId, status: 'completed' } },
      { 
        $group: { 
          _id: '$fromPersonaId', 
          totalAmount: { $sum: '$guardValue' },
          giftCount: { $sum: 1 },
          lastGiftAt: { $max: '$createdAt' }
        } 
      },
      { $sort: { totalAmount: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'personas',
          localField: '_id',
          foreignField: '_id',
          as: 'persona'
        }
      },
      { $unwind: '$persona' }
    ]);

    const totalGuardValue = await GiftRecord.getTotalGuardValue(personaId);
    const totalGuardians = guardians.length;

    res.json({
      guardians: guardians.map(g => ({
        personaId: g.persona._id,
        name: g.persona.displayName || g.persona.name,
        avatar: g.persona.avatar,
        totalAmount: g.totalAmount,
        giftCount: g.giftCount,
        lastGiftAt: g.lastGiftAt
      })),
      totalGuardValue,
      totalGuardians
    });

  } catch (error) {
    console.error('获取守护者列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取用户送出的守护统计
 * GET /api/guardian/my-sent
 */
router.get('/my-sent', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.json({ totalSent: 0, totalGifts: 0, sentList: [] });
    }

    const personaId = active.personaId._id;

    const sentGifts = await GiftRecord.aggregate([
      { $match: { fromPersonaId: personaId, status: 'completed' } },
      { 
        $group: { 
          _id: '$toPersonaId', 
          totalAmount: { $sum: '$guardValue' },
          giftCount: { $sum: 1 },
          lastGiftAt: { $max: '$createdAt' }
        } 
      },
      { $sort: { totalAmount: -1 } },
      {
        $lookup: {
          from: 'personas',
          localField: '_id',
          foreignField: '_id',
          as: 'persona'
        }
      },
      { $unwind: '$persona' }
    ]);

    const totalSent = sentGifts.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalGifts = sentGifts.reduce((sum, g) => sum + g.giftCount, 0);

    res.json({
      totalSent,
      totalGifts,
      sentList: sentGifts.map(g => ({
        personaId: g.persona._id,
        name: g.persona.displayName || g.persona.name,
        avatar: g.persona.avatar,
        totalAmount: g.totalAmount,
        giftCount: g.giftCount,
        lastGiftAt: g.lastGiftAt
      }))
    });

  } catch (error) {
    console.error('获取送出统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;