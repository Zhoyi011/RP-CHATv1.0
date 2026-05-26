// ==================== 充值码模型 ====================
const mongoose = require('mongoose');

const redeemCodeSchema = new mongoose.Schema({
  // 充值码格式: RP-XXXX-XXXX (字母-数字)
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  // 钻石数量
  diamondAmount: {
    type: Number,
    required: true,
    min: 1
  },
  // 创建者 ID
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 是否已使用
  isUsed: {
    type: Boolean,
    default: false
  },
  // 使用者 ID
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // 使用时间
  usedAt: {
    type: Date,
    default: null
  },
  // 过期时间（创建后14天）
  expiresAt: {
    type: Date,
    required: true
  },
  // 备注（可选，方便管理员记录）
  note: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

// 索引：加速查询
redeemCodeSchema.index({ code: 1 });
redeemCodeSchema.index({ isUsed: 1 });
redeemCodeSchema.index({ expiresAt: 1 });
redeemCodeSchema.index({ createdBy: 1 });

// 检查是否过期（虚拟属性）
redeemCodeSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// 检查是否可用（未使用且未过期）
redeemCodeSchema.virtual('isAvailable').get(function() {
  return !this.isUsed && !this.isExpired;
});

// 设置 toJSON 包含虚拟属性
redeemCodeSchema.set('toJSON', { virtuals: true });
redeemCodeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RedeemCode', redeemCodeSchema);