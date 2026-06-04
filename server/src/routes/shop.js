// server/src/routes/shop.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const ShopItem = require('../models/ShopItem');
const DiamondService = require('../services/diamondService');

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

// ========== 商品列表 ==========

// 获取所有商品（可按类型筛选）
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;
    
    const items = await ShopItem.find(query).sort({ rarity: 1, price: 1 });
    res.json(items);
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个商品详情
router.get('/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 购买 ==========

// 购买商品
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const item = await ShopItem.findById(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    if (!item.isActive) return res.status(400).json({ error: '商品已下架' });
    
    // 检查是否已拥有
    const hasItem = user.inventory.some(i => i.itemId === itemId);
    if (hasItem) {
      return res.status(400).json({ error: '你已经拥有该物品' });
    }
    
    // 扣除钻石
    if (item.currency === 'diamonds') {
      // 购买商品优先扣除免费钻石
      await DiamondService.deductDiamonds(userId, item.price, false);
    } else {
      if (user.coins < item.price) {
        return res.status(400).json({ error: '金币不足' });
      }
      user.coins -= item.price;
      await user.save();
    }
    
    // 添加到背包
    await user.addItem({
      itemId: item._id,
      itemType: item.type,
      name: item.name,
      description: item.description,
      quantity: 1,
      equipped: false
    });
    
    res.json({ 
      success: true, 
      message: `成功购买 ${item.name}`,
      diamonds: user.getTotalDiamonds(),
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      coins: user.coins
    });
  } catch (error) {
    console.error('购买失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 装备 ==========

// 装备物品
router.post('/equip', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const item = user.inventory.find(i => i.itemId === itemId);
    if (!item) return res.status(404).json({ error: '物品不存在' });
    
    await user.equipItem(itemId);
    
    res.json({ success: true, message: '装备成功', equippedItems: user.equippedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 卸下装备
router.post('/unequip', authMiddleware, async (req, res) => {
  try {
    const { itemType } = req.body;
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    // 找到该类型的装备并卸下
    const item = user.inventory.find(i => i.itemType === itemType && i.equipped);
    if (item) {
      item.equipped = false;
    }
    
    if (user.equippedItems && user.equippedItems[itemType]) {
      user.equippedItems[itemType] = '';
    }
    
    await user.save();
    
    res.json({ success: true, message: '已卸下', equippedItems: user.equippedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 我的物品 ==========

// 获取我的所有物品（背包）
router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    // 获取物品详细信息
    const itemsWithDetails = await Promise.all(user.inventory.map(async (invItem) => {
      const shopItem = await ShopItem.findById(invItem.itemId);
      return {
        ...invItem.toObject(),
        shopItem
      };
    }));
    
    res.json(itemsWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取我的装备
router.get('/my-equipped', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const equipped = {};
    for (const [type, itemId] of Object.entries(user.equippedItems || {})) {
      if (itemId) {
        const shopItem = await ShopItem.findById(itemId);
        if (shopItem) {
          equipped[type] = shopItem;
        }
      }
    }
    
    res.json(equipped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 🔥 赠送礼物给好友 ==========

/**
 * 赠送商品给好友
 * POST /api/shop/gift
 * Body: { toPersonaId, itemId, message }
 */
router.post('/gift', authMiddleware, async (req, res) => {
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

    // 检查赠送者是否拥有该商品
    const user = await User.findById(fromUserId);
    const hasItem = user.inventory.some(i => i.itemId === itemId);
    if (!hasItem) {
      return res.status(400).json({ error: '你没有该商品，请先购买' });
    }

    // 从赠送者背包中移除该商品
    const itemIndex = user.inventory.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      return res.status(400).json({ error: '物品不存在于背包' });
    }
    
    if (user.inventory[itemIndex].quantity > 1) {
      user.inventory[itemIndex].quantity -= 1;
    } else {
      user.inventory.splice(itemIndex, 1);
    }
    await user.save();

    // 添加到接收者的背包
    const receiver = await User.findById(toPersona.userId);
    if (!receiver) {
      return res.status(404).json({ error: '接收者用户不存在' });
    }
    
    await receiver.addItem({
      itemId: item._id,
      itemType: item.type,
      name: item.name,
      description: item.description,
      quantity: 1,
      equipped: false
    });

    // 创建礼物记录
    const GiftRecord = require('../models/GiftRecord');
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

    // 发送 Socket 通知
    const { emitToUser } = require('../utils/socketHelper');
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

// ========== 赠送记录 ==========

// 获取收到的礼物列表
router.get('/gifts/received', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const GiftRecord = require('../models/GiftRecord');
    const gifts = await GiftRecord.find({ toUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fromPersonaId', 'name displayName avatar')
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

// 获取送出的礼物列表
router.get('/gifts/sent', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const GiftRecord = require('../models/GiftRecord');
    const gifts = await GiftRecord.find({ fromUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('toPersonaId', 'name displayName avatar')
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