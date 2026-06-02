// server/src/models/FriendRequest.js
const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  // 发送申请的角色
  fromPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  // 接收申请的角色
  toPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  // 申请消息
  message: {
    type: String,
    maxlength: 100,
    default: '请求添加你为好友'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'canceled'],
    default: 'pending'
  },
  // 过期时间（7天未处理自动过期）
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 复合唯一索引：防止重复申请
friendRequestSchema.index({ fromPersonaId: 1, toPersonaId: 1, status: 1 }, { unique: true });

// 自动更新 updatedAt
friendRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 查询辅助：获取待处理申请
friendRequestSchema.statics.getPendingRequests = async function(personaId) {
  return this.find({
    toPersonaId: personaId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('fromPersonaId', 'name displayName avatar sameNameNumber');
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
module.exports = FriendRequest;