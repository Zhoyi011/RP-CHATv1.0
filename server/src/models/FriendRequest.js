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
}, {
  // 确保索引正确创建
  autoIndex: true
});

// 复合唯一索引：防止重复申请（使用新字段名）
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

// 查询辅助：检查是否有待处理的申请
friendRequestSchema.statics.hasPendingRequest = async function(fromPersonaId, toPersonaId) {
  const request = await this.findOne({
    fromPersonaId,
    toPersonaId,
    status: 'pending'
  });
  return !!request;
};

// 查询辅助：获取最近的申请（用于冷却检查）
friendRequestSchema.statics.getRecentRequest = async function(fromPersonaId, toPersonaId, minutes = 30) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return this.findOne({
    fromPersonaId,
    toPersonaId,
    createdAt: { $gt: cutoffTime }
  }).sort({ createdAt: -1 });
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

// ========== 启动时删除旧索引并重新创建 ==========
(async () => {
  try {
    // 等待数据库连接
    if (mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('friendrequests');
      if (collection) {
        const indexes = await collection.indexes();
        
        // 查找并删除旧索引（使用旧字段名 fromUserId 和 toUserId）
        for (const index of indexes) {
          if (index.name === 'fromUserId_1_toUserId_1_status_1' ||
              (index.key && index.key.fromUserId !== undefined)) {
            await collection.dropIndex(index.name);
            console.log('✅ [FriendRequest] 已删除旧索引:', index.name);
          }
        }
      }
    }
  } catch (err) {
    // 索引不存在或删除失败，忽略错误（code 27 表示索引不存在）
    if (err.code !== 27) {
      console.log('⚠️ [FriendRequest] 删除旧索引时出错:', err.message);
    }
  }
})();

module.exports = FriendRequest;