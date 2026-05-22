const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const ShopItem = require('../models/ShopItem');
const UserInventory = require('../models/UserInventory');
const ActivePersona = require('../models/ActivePersona');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// 获取商城商品列表
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    
    const items = await ShopItem.find(filter).sort({ rarity: 1, price: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户拥有的物品
router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    const items = await UserInventory.find({ userId: req.userId });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 购买物品
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await ShopItem.findById(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    const balance = item.currency === 'diamonds' ? (user.diamonds || 0) : (user.coins || 0);
    if (balance < item.price) {
      return res.status(400).json({ error: `${item.currency === 'diamonds' ? '钻石' : '金币'}不足` });
    }
    
    const existing = await UserInventory.findOne({ userId: req.userId, itemId });
    if (existing) {
      return res.status(400).json({ error: '已经拥有该物品了' });
    }
    
    if (item.currency === 'diamonds') {
      user.diamonds -= item.price;
    } else {
      user.coins -= item.price;
    }
    await user.save();
    
    const inventory = await UserInventory.create({
      userId: req.userId,
      itemId: item._id,
      itemType: item.type,
      itemName: item.name,
      itemImage: item.image,
      isEquipped: false
    });
    
    res.json({ 
      success: true, 
      message: `购买成功！获得 ${item.name}`,
      inventory,
      diamonds: user.diamonds,
      coins: user.coins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 装备物品到当前激活的角色（修复版）
router.post('/equip', authMiddleware, async (req, res) => {
  try {
    const { inventoryId } = req.body;
    
    // 获取物品
    const inventory = await UserInventory.findOne({ _id: inventoryId, userId: req.userId });
    if (!inventory) return res.status(404).json({ error: '物品不存在' });
    
    // 获取当前激活的角色
    const active = await ActivePersona.findOne({ userId: req.userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.status(404).json({ error: '请先选择一个角色' });
    }
    
    const persona = active.personaId;
    
    // ✅ 直接更新现有的 Persona 文档
    const updateData = {};
    updateData[`equipped.${inventory.itemType}`] = inventory.itemId;
    
    await Persona.updateOne(
      { _id: persona._id },
      { $set: updateData }
    );
    
    // 更新库存状态
    await UserInventory.updateMany(
      { userId: req.userId, itemType: inventory.itemType, isEquipped: true },
      { isEquipped: false }
    );
    inventory.isEquipped = true;
    await inventory.save();
    
    // 获取更新后的角色数据
    const updatedPersona = await Persona.findById(persona._id);
    
    console.log(`✅ 用户 ${req.userId} 将 ${inventory.itemName} 装备到角色 ${updatedPersona.name}`);
    
    res.json({ 
      success: true, 
      message: `已装备 ${inventory.itemName} 到 ${updatedPersona.displayName || updatedPersona.name}`,
      equipped: updatedPersona.equipped
    });
  } catch (error) {
    console.error('装备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 卸下角色的物品
router.post('/unequip', authMiddleware, async (req, res) => {
  try {
    const { inventoryId } = req.body;
    
    const inventory = await UserInventory.findOne({ _id: inventoryId, userId: req.userId });
    if (!inventory) return res.status(404).json({ error: '物品不存在' });
    
    // 获取当前激活的角色
    const active = await ActivePersona.findOne({ userId: req.userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.status(404).json({ error: '请先选择一个角色' });
    }
    
    const persona = active.personaId;
    
    // 移除角色的装备
    if (persona.equipped) {
      persona.equipped[inventory.itemType] = null;
      await persona.save();
    }
    
    inventory.isEquipped = false;
    await inventory.save();
    
    res.json({ 
      success: true, 
      message: `已卸下 ${inventory.itemName}`,
      equipped: persona.equipped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 获取当前角色的装备
router.get('/my-equip', authMiddleware, async (req, res) => {
  try {
    const active = await ActivePersona.findOne({ userId: req.userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.json({ equipped: {} });
    }
    
    const persona = active.personaId;
    res.json({ equipped: persona.equipped || {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;