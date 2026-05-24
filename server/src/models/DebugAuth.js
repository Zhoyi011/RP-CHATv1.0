// server/src/models/DebugAuth.js
const mongoose = require('mongoose');

const debugAuthSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// 生成6位验证码
debugAuthSchema.statics.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 检查是否有效
debugAuthSchema.methods.isValid = function() {
  return !this.isUsed && this.expiresAt > new Date();
};

module.exports = mongoose.model('DebugAuth', debugAuthSchema);