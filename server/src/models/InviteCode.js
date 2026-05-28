// server/src/models/InviteCode.js
const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  type: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  usedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  maxUses: {
    type: Number,
    default: 1
  },
  usesCount: {
    type: Number,
    default: 0
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 生成随机邀请码
inviteCodeSchema.statics.generateCode = function(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 生成带前缀的邀请码
inviteCodeSchema.statics.generateCodeWithPrefix = function(prefix = 'IN') {
  const random = this.generateCode(6);
  return `${prefix}-${random}`;
};

// 计算过期时间（创建当天 + N 天，设置为当天 23:59:59）
inviteCodeSchema.statics.calculateExpiryDate = function(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
};

// 检查邀请码是否有效
inviteCodeSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.usesCount >= this.maxUses) return false;
  return true;
};

module.exports = mongoose.model('InviteCode', inviteCodeSchema);