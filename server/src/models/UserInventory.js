const mongoose = require('mongoose');

const userInventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', required: true },
  itemType: { type: String, required: true },
  itemName: { type: String, required: true },
  itemImage: { type: String, default: '' },
  isEquipped: { type: Boolean, default: false },
  acquiredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserInventory', userInventorySchema);