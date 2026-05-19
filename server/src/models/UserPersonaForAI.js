const mongoose = require('mongoose');

const userPersonaForAISchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, default: '用户' },
  description: { type: String, default: '' },      // 自我介绍
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserPersonaForAI', userPersonaForAISchema);