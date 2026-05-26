// ==================== 充值使用记录模型 ====================
const mongoose = require('mongoose');

const redemptionRecordSchema = new mongoose.Schema({
  // 使用者 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 充值码 ID
  redeemCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedeemCode',
    required: true
  },
  // 充值码内容（冗余存储，防止充值码被删除后查不到）
  code: {
    type: String,
    required: true
  },
  // 获得的钻石数量
  diamondAmount: {
    type: Number,
    required: true
  },
  // 使用时的钻石余额（快照）
  previousBalance: {
    type: Number,
    default: 0
  },
  // 使用后的钻石余额（快照）
  newBalance: {
    type: Number,
    default: 0
  },
  // 使用时间
  usedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引：加速查询
redemptionRecordSchema.index({ userId: 1, usedAt: -1 });
redemptionRecordSchema.index({ redeemCodeId: 1 });
redemptionRecordSchema.index({ code: 1 });
redemptionRecordSchema.index({ usedAt: -1 });

/**
 * 按用户查询最近记录（静态方法）
 * @param {string} userId - 用户ID
 * @param {number} limit - 返回数量，默认50
 * @returns {Promise<Array>} 充值记录数组
 */
redemptionRecordSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ usedAt: -1 })
    .limit(limit)
    .populate('redeemCodeId', 'code diamondAmount createdBy note')
    .lean();
};

/**
 * 获取用户充值总额（静态方法）
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 充值总额
 */
redemptionRecordSchema.statics.getUserTotal = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId.createFromHexString(userId) } },
    { $group: { _id: null, total: { $sum: '$diamondAmount' } } }
  ]);
  return result[0]?.total || 0;
};

/**
 * 获取全局充值统计（静态方法）
 * @returns {Promise<Object>} 统计信息
 */
redemptionRecordSchema.statics.getGlobalStats = async function() {
  const [totalUsers, totalDiamonds, avgPerUser] = await Promise.all([
    this.distinct('userId').then(ids => ids.length),
    this.aggregate([{ $group: { _id: null, total: { $sum: '$diamondAmount' } } }]),
    this.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$diamondAmount' } } },
      { $group: { _id: null, avg: { $avg: '$total' } } }
    ])
  ]);
  
  return {
    totalUsers,
    totalDiamonds: totalDiamonds[0]?.total || 0,
    avgPerUser: Math.round(avgPerUser[0]?.avg || 0)
  };
};

module.exports = mongoose.model('RedemptionRecord', redemptionRecordSchema);