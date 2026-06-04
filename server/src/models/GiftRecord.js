// server/src/models/GiftRecord.js
const mongoose = require('mongoose');

const giftRecordSchema = new mongoose.Schema({
  // 赠送者
  fromPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 接收者
  toPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 礼物信息
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopItem'
  },
  itemName: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    enum: ['avatarFrame', 'ring', 'relationshipCard', 'badge'],
    default: 'other'
  },
  
  // 金额信息
  diamondCost: {
    type: Number,
    required: true,
    min: 1
  },
  
  // 守护值（1钻石 = 1守护值）
  guardValue: {
    type: Number,
    default: 0
  },
  
  // 留言
  message: {
    type: String,
    maxlength: 100,
    default: ''
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'completed'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
giftRecordSchema.index({ fromPersonaId: 1, createdAt: -1 });
giftRecordSchema.index({ toPersonaId: 1, createdAt: -1 });
giftRecordSchema.index({ toPersonaId: 1, guardValue: -1 });
giftRecordSchema.index({ createdAt: -1 });

// 统计某个角色的总守护值
giftRecordSchema.statics.getTotalGuardValue = async function(personaId) {
  const result = await this.aggregate([
    { $match: { toPersonaId: personaId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$guardValue' } } }
  ]);
  return result[0]?.total || 0;
};

// 获取角色守护榜
giftRecordSchema.statics.getGuardianRanking = async function(limit = 50) {
  return await this.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$toPersonaId',
        totalGuardValue: { $sum: '$guardValue' },
        giftCount: { $sum: 1 }
      }
    },
    { $sort: { totalGuardValue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'personas',
        localField: '_id',
        foreignField: '_id',
        as: 'persona'
      }
    },
    { $unwind: '$persona' }
  ]);
};

module.exports = mongoose.model('GiftRecord', giftRecordSchema);