// server/src/models/Friend.js
const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  // 发起好友关系的角色
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  // 目标好友角色
  friendPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked', 'rejected'],
    default: 'accepted'
  },
  // 备注名（角色给好友起的昵称）
  nickname: {
    type: String,
    maxlength: 20,
    default: null
  },
  // 分组
  group: {
    type: String,
    default: '我的好友'
  },
  // 是否星标好友
  isStarred: {
    type: Boolean,
    default: false
  },
  // 亲密度（可选，用于扩展）
  intimacy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
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

// 复合唯一索引：防止重复好友关系
friendSchema.index({ personaId: 1, friendPersonaId: 1 }, { unique: true });

// 查询辅助：获取角色的所有好友ID
friendSchema.statics.getFriendPersonaIds = async function(personaId) {
  const friendships = await this.find({
    personaId,
    status: 'accepted'
  }).select('friendPersonaId');
  return friendships.map(f => f.friendPersonaId);
};

// 查询辅助：检查两个角色是否为好友
friendSchema.statics.areFriends = async function(personaId, targetPersonaId) {
  const friendship = await this.findOne({
    personaId,
    friendPersonaId: targetPersonaId,
    status: 'accepted'
  });
  return !!friendship;
};

const Friend = mongoose.model('Friend', friendSchema);
module.exports = Friend;