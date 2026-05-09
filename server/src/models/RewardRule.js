const mongoose = require('mongoose');

const rewardRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['daily_login', 'message_count', 'invite_count', 'streak', 'achievement'],
    required: true 
  },
  condition: { type: mongoose.Schema.Types.Mixed, required: true }, // 触发条件
  reward: { type: Number, required: true }, // 奖励金币
  cooldown: { type: Number, default: 0 }, // 冷却时间（秒）
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RewardRule', rewardRuleSchema);