// server/src/models/Favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Novel',
    required: true
  }
}, {
  timestamps: true
});

// 同一用户同一角色同一小说只能收藏一次
favoriteSchema.index({ userId: 1, personaId: 1, novelId: 1 }, { unique: true });
favoriteSchema.index({ novelId: 1, createdAt: -1 });

module.exports = mongoose.model('Favorite', favoriteSchema);