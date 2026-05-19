const mongoose = require('mongoose');

const aiPersonaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  description: { type: String, default: '' },      // 角色设定
  personality: { type: String, default: '' },      // 性格特征
  replyStyle: { type: String, default: 'short' },  // short/medium/detailed
  exampleDialogue: { type: String, default: '' },  // 示例对话
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIPersona', aiPersonaSchema);