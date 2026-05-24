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
    enum: ['user', 'admin', 'super_admin'],  // ✅ 新增 super_admin
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
  usedAt: {  // ✅ 新增：使用时间
    type: Date,
    default: null
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  maxUses: {  // ✅ 新增：最大使用次数
    type: Number,
    default: 1
  },
  usesCount: {  // ✅ 新增：已使用次数
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
  const random = this.generateCode(8);
  return `${prefix}-${random}`;
};

// 检查邀请码是否有效
inviteCodeSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.usesCount >= this.maxUses) return false;
  return true;
};

module.exports = mongoose.model('InviteCode', inviteCodeSchema);