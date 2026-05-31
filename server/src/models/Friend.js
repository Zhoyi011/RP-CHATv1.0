// server/src/models/Friend.js
import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked', 'rejected'],
    default: 'accepted'
  },
  // 备注名
  nickname: {
    type: String,
    maxlength: 20,
    default: null
  },
  // 分组（默认"我的好友"）
  group: {
    type: String,
    default: '我的好友'
  },
  // 是否星标好友
  isStarred: {
    type: Boolean,
    default: false
  },
  // 创建时间（成为好友的时间）
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 最后互动时间
  lastInteractionAt: {
    type: Date,
    default: null
  }
});

// 复合唯一索引，防止重复好友关系
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// 查询辅助方法：获取用户的所有好友ID
friendSchema.statics.getFriendIds = async function(userId) {
  const friendships = await this.find({
    userId,
    status: 'accepted'
  }).select('friendId');
  return friendships.map(f => f.friendId);
};

// 检查是否为好友
friendSchema.statics.isFriend = async function(userId, targetId) {
  const friendship = await this.findOne({
    userId,
    friendId: targetId,
    status: 'accepted'
  });
  return !!friendship;
};

const Friend = mongoose.model('Friend', friendSchema);
export default Friend;