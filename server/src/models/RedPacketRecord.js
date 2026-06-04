// server/src/models/RedPacketRecord.js
const mongoose = require('mongoose');

const redPacketRecordSchema = new mongoose.Schema({
  // 红包
  redPacketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedPacket',
    required: true
  },
  
  // 领取者
  receiverPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  receiverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverPersonaName: {
    type: String,
    required: true
  },
  
  // 领取金额
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // 钻石类型（从红包继承）
  diamondType: {
    type: String,
    enum: ['paid'],
    default: 'paid'
  },
  
  // 是否手气最佳（随机红包专用）
  isLucky: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
redPacketRecordSchema.index({ redPacketId: 1, createdAt: -1 });
redPacketRecordSchema.index({ receiverPersonaId: 1, createdAt: -1 });
redPacketRecordSchema.index({ redPacketId: 1, receiverPersonaId: 1 }, { unique: true });

// 获取红包的领取记录（按金额降序）
redPacketRecordSchema.statics.getRecordsByRedPacket = async function(redPacketId) {
  return await this.find({ redPacketId })
    .sort({ amount: -1, createdAt: 1 })
    .populate('receiverPersonaId', 'name displayName avatar');
};

// 获取用户收到的红包总额
redPacketRecordSchema.statics.getUserTotalReceived = async function(userId) {
  const result = await this.aggregate([
    { $match: { receiverUserId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
};

module.exports = mongoose.model('RedPacketRecord', redPacketRecordSchema);