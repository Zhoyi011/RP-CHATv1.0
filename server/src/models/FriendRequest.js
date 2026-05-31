// server/src/models/FriendRequest.js
import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
  // 发送者
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 接收者
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
friendRequestSchema.index({ fromUserId: 1, toUserId: 1, status: 1 }, { unique: true });

// 查询待处理申请
friendRequestSchema.statics.getPendingRequests = async function(userId) {
  return this.find({
    toUserId: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('fromUserId', 'username email avatar');
};

// 自动更新 updatedAt
friendRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
export default FriendRequest;