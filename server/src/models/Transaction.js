const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['daily_login', 'message', 'invite', 'purchase', 'reward', 'admin', 'refund'],
    required: true 
  },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true }, // 变动后的余额
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // 额外信息
  createdAt: { type: Date, default: Date.now, index: true }
});

// 索引
transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);