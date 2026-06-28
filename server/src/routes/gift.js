// server/src/routes/gift.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const ShopItem = require('../models/ShopItem');
const GiftRecord = require('../models/GiftRecord');
const DiamondService = require('../services/diamondService');
const { emitToUser } = require('../utils/socketHelper');

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
 * 赠送礼物
 * POST /api/gift/send
 * Body: { toPersonaId, itemId, message }
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { toPersonaId, itemId, message } = req.body;
    const fromUserId = req.userId;

    // 获取赠送者当前使用的角色
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: fromUserId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    const fromPersona = active.personaId;

    // 获取接收者角色
    const toPersona = await Persona.findById(toPersonaId);
    if (!toPersona) {
      return res.status(404).json({ error: '接收角色不存在' });
    }

    // 获取商品信息
    const item = await ShopItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: '商品不存在' });
    }
    if (!item.isGiftable) {
      return res.status(400).json({ error: '该商品不可赠送' });
    }

    // 检查钻石是否足够
    const hasEnough = await DiamondService.hasEnoughPaidDiamonds(fromUserId, item.price);
    if (!hasEnough) {
      return res.status(400).json({ error: '充值钻石不足，请充值后再赠送' });
    }

    // 扣除钻石
    await DiamondService.deductDiamonds(fromUserId, item.price, true);

    // 创建礼物记录
    const giftRecord = new GiftRecord({
      fromPersonaId: fromPersona._id,
      fromUserId: fromUserId,
      toPersonaId: toPersona._id,
      toUserId: toPersona.userId,
      itemId: item._id,
      itemName: item.name,
      itemType: item.type,
      diamondCost: item.price,
      guardValue: item.guardValue || item.price,
      message: message || '',
      status: 'completed'
    });
    await giftRecord.save();

    // 增加接收者的守护值
    await toPersona.addGuardianValue(item.guardValue || item.price);

    // 🔥 Phase 1: 赠送礼物获得经验
    try {
      const experienceService = require('../services/experienceService');
      await experienceService.addExp(
        fromPersona._id,
        fromUserId,
        'GIFT_SENT',
        null,
        { isPublicSquare: false }
      );
    } catch (expError) {
      console.error('添加经验值失败（赠送礼物）:', expError);
    }

    // 发送 Socket 通知给接收者
    emitToUser(toPersona.userId.toString(), 'gift-received', {
      giftId: giftRecord._id,
      fromPersonaId: fromPersona._id,
      fromPersonaName: fromPersona.displayName || fromPersona.name,
      fromPersonaAvatar: fromPersona.avatar,
      itemName: item.name,
      itemImage: item.image,
      guardValue: item.guardValue || item.price,
      message: message || '',
      timestamp: giftRecord.createdAt
    });

    res.json({
      success: true,
      message: `成功赠送 ${item.name} 给 ${toPersona.displayName || toPersona.name}`,
      guardValue: item.guardValue || item.price,
      data: giftRecord
    });

  } catch (error) {
    console.error('赠送礼物失败:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

/**
 * 获取收到的礼物列表
 * GET /api/gift/received
 */
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const gifts = await GiftRecord.find({ toUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fromPersonaId', 'name displayName avatar level title')
      .populate('itemId', 'name image');

    const total = await GiftRecord.countDocuments({ toUserId: userId });

    res.json({
      gifts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('获取礼物列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取送出的礼物列表
 * GET /api/gift/sent
 */
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const gifts = await GiftRecord.find({ fromUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('toPersonaId', 'name displayName avatar level title')
      .populate('itemId', 'name image');

    const total = await GiftRecord.countDocuments({ fromUserId: userId });

    res.json({
      gifts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('获取送出礼物列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;