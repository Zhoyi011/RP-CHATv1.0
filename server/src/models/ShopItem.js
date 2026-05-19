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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShopItem', shopItemSchema);