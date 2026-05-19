const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ShopItem = require('../models/ShopItem');
const UserInventory = require('../models/UserInventory');

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
    
    // 检查余额
    const balance = item.currency === 'diamonds' ? (user.diamonds || 0) : (user.coins || 0);
    if (balance < item.price) {
      return res.status(400).json({ error: `${item.currency === 'diamonds' ? '钻石' : '金币'}不足` });
    }
    
    // 检查是否已拥有
    const existing = await UserInventory.findOne({ userId: req.userId, itemId });
    if (existing) {
      return res.status(400).json({ error: '已经拥有该物品了' });
    }
    
    // 扣款
    if (item.currency === 'diamonds') {
      user.diamonds -= item.price;
    } else {
      user.coins -= item.price;
    }
    await user.save();
    
    // 添加物品到库存
    const inventory = await UserInventory.create({
      userId: req.userId,
      itemId: item._id,
      itemType: item.type,
      itemName: item.name,
      itemImage: item.image
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

// 装备物品
router.post('/equip', authMiddleware, async (req, res) => {
  try {
    const { inventoryId } = req.body;
    const inventory = await UserInventory.findOne({ _id: inventoryId, userId: req.userId });
    if (!inventory) return res.status(404).json({ error: '物品不存在' });
    
    const user = await User.findById(req.userId);
    
    // 同类物品只能装备一个
    await UserInventory.updateMany(
      { userId: req.userId, itemType: inventory.itemType, isEquipped: true },
      { isEquipped: false }
    );
    
    inventory.isEquipped = true;
    await inventory.save();
    
    // 更新用户装备记录
    if (!user.equippedItems) user.equippedItems = {};
    user.equippedItems[inventory.itemType] = inventory.itemId;
    await user.save();
    
    res.json({ success: true, message: `已装备 ${inventory.itemName}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 卸下物品
router.post('/unequip', authMiddleware, async (req, res) => {
  try {
    const { inventoryId } = req.body;
    const inventory = await UserInventory.findOne({ _id: inventoryId, userId: req.userId });
    if (!inventory) return res.status(404).json({ error: '物品不存在' });
    
    inventory.isEquipped = false;
    await inventory.save();
    
    const user = await User.findById(req.userId);
    if (user.equippedItems) {
      delete user.equippedItems[inventory.itemType];
      await user.save();
    }
    
    res.json({ success: true, message: `已卸下 ${inventory.itemName}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;