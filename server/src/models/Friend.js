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
  nickname: {
    type: String,
    maxlength: 20,
    default: null
  },
  group: {
    type: String,
    default: '我的好友'
  },
  isStarred: {
    type: Boolean,
    default: false
  },
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
  lastInteractionAt: {
    type: Date,
    default: null
  }
}, {
  autoIndex: true
});

// 复合唯一索引
friendSchema.index({ personaId: 1, friendPersonaId: 1 }, { unique: true });

// 查询辅助
friendSchema.statics.getFriendPersonaIds = async function(personaId) {
  const friendships = await this.find({
    personaId,
    status: 'accepted'
  }).select('friendPersonaId');
  return friendships.map(f => f.friendPersonaId);
};

friendSchema.statics.areFriends = async function(personaId, targetPersonaId) {
  const friendship = await this.findOne({
    personaId,
    friendPersonaId: targetPersonaId,
    status: 'accepted'
  });
  return !!friendship;
};

const Friend = mongoose.model('Friend', friendSchema);

// 删除旧索引
(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('friends');
      if (collection) {
        const indexes = await collection.indexes();
        for (const index of indexes) {
          if (index.name === 'userId_1_friendId_1' ||
              (index.key && index.key.userId !== undefined)) {
            await collection.dropIndex(index.name);
            console.log('✅ [Friend] 已删除旧索引:', index.name);
          }
        }
      }
    }
  } catch (err) {
    if (err.code !== 27) {
      console.log('⚠️ [Friend] 删除旧索引时出错:', err.message);
    }
  }
})();

module.exports = Friend;