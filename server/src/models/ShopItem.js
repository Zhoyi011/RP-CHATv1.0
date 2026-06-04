// server/src/models/ShopItem.js
const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['avatarFrame', 'ring', 'relationshipCard', 'badge'], required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['diamonds', 'coins'], default: 'diamonds' },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
  image: { type: String, default: '' },
  previewImage: { type: String, default: '' },
  description: { type: String, default: '' },
  isLimited: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  
  // 🔥 新增：是否可赠送
  isGiftable: { type: Boolean, default: true },
  
  // 🔥 新增：赠送时增加的守护值（默认等于价格）
  guardValue: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now }
});

// 保存前计算守护值
shopItemSchema.pre('save', function(next) {
  if (this.guardValue === 0 && this.price > 0) {
    this.guardValue = this.price;
  }
  next();
});

module.exports = mongoose.model('ShopItem', shopItemSchema);