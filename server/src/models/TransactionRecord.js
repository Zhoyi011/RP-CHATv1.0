// server/src/models/TransactionRecord.js
const mongoose = require('mongoose');

const transactionRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'recharge',      // 充值
      'daily_sign',    // 每日签到
      'redpacket_send', // 发红包（支出）
      'redpacket_receive', // 抢红包（收入）
      'gift_send',     // 送礼物（支出）
      'gift_receive',  // 收礼物（收入）
      'shop_buy',      // 商城购买（支出）
      'refund',        // 红包过期退款
      'admin_add'      // 管理员添加
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  diamondType: {
    type: String,
    enum: ['paid', 'free'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    comment: '关联的ID（红包ID、礼物ID、订单ID等）'
  },
  relatedName: {
    type: String,
    default: ''
  },
  balanceAfter: {
    type: Number,
    default: 0,
    comment: '交易后余额'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 索引
transactionRecordSchema.index({ userId: 1, createdAt: -1 });
transactionRecordSchema.index({ userId: 1, type: 1 });

// 获取用户交易记录
transactionRecordSchema.statics.getUserTransactions = async function(userId, limit = 50, offset = 0) {
  return await this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

// 获取用户交易统计
transactionRecordSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId.createFromHexString(userId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  return stats;
};

module.exports = mongoose.model('TransactionRecord', transactionRecordSchema);