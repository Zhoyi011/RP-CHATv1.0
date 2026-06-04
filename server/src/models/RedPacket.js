// server/src/models/RedPacket.js
const mongoose = require('mongoose');

const redPacketSchema = new mongoose.Schema({
  // 发送者
  senderPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  senderUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 所在群聊
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  
  // 红包类型
  type: {
    type: String,
    enum: ['random', 'fixed', 'personal'],
    required: true
  },
  
  // 通用字段
  totalAmount: {
    type: Number,
    required: true,
    min: 1
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    maxlength: 50,
    default: '恭喜发财，大吉大利'
  },
  
  // 钻石类型（只能用充值钻石）
  diamondType: {
    type: String,
    enum: ['paid'],
    default: 'paid'
  },
  
  // 随机/固定红包专用
  count: {
    type: Number,
    min: 1,
    validate: {
      validator: function(v) {
        if (this.type === 'personal') return true;
        return v && v > 0;
      },
      message: '红包个数必须大于0'
    }
  },
  remainingCount: {
    type: Number,
    default: 0
  },
  perAmount: {
    type: Number,
    default: 0
  },
  
  // 个人红包专用
  targetPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    default: null
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'finished', 'expired'],
    default: 'active'
  },
  
  // 领取记录（用于快速展示）
  records: [{
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    personaName: String,
    amount: Number,
    createdAt: { type: Date, default: Date.now }
  }],
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时过期
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
redPacketSchema.index({ roomId: 1, createdAt: -1 });
redPacketSchema.index({ status: 1, expiresAt: 1 });
redPacketSchema.index({ senderPersonaId: 1, createdAt: -1 });

// 检查是否过期
redPacketSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// 检查是否已抢完
redPacketSchema.methods.isFinished = function() {
  if (this.type === 'personal') {
    return this.status === 'finished';
  }
  return this.remainingCount <= 0 || this.remainingAmount <= 0;
};

// 检查是否可领取（个人红包专用）
redPacketSchema.methods.canClaimPersonal = function(personaId, userId) {
  if (this.type !== 'personal') return false;
  if (this.status !== 'active') return false;
  if (this.isExpired()) return false;
  
  // 检查是否是指定的人
  return this.targetPersonaId.toString() === personaId ||
         this.targetUserId.toString() === userId;
};

// 检查是否已领取过
redPacketSchema.methods.hasClaimed = function(personaId) {
  return this.records.some(r => r.personaId.toString() === personaId);
};

// 固定红包：计算平均金额
redPacketSchema.pre('save', function(next) {
  if (this.type === 'fixed' && this.count && this.totalAmount) {
    this.perAmount = Math.floor(this.totalAmount / this.count);
    // 余数会在分配时处理
  }
  next();
});

module.exports = mongoose.model('RedPacket', redPacketSchema);