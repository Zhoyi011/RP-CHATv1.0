// server/src/models/FriendRequest.js
const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  toPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
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
  autoIndex: true
});

// 新索引
friendRequestSchema.index({ fromPersonaId: 1, toPersonaId: 1, status: 1 }, { unique: true });

friendRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

// ========== 启动时删除旧索引并重新创建 ==========
(async () => {
  try {
    // 等待数据库连接就绪
    const waitForConnection = () => {
      return new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          mongoose.connection.once('connected', resolve);
        }
      });
    };
    
    await waitForConnection();
    
    const collection = mongoose.connection.collection('friendrequests');
    if (!collection) {
      console.log('⚠️ [FriendRequest] 集合不存在，跳过索引操作');
      return;
    }
    
    // 获取所有索引
    const indexes = await collection.indexes();
    console.log('📊 [FriendRequest] 当前索引:', indexes.map(i => i.name));
    
    // 删除所有包含旧字段名的索引
    for (const index of indexes) {
      if (index.name === 'fromUserId_1_toUserId_1_status_1' ||
          index.name === 'fromUserId_1_toUserId_1_status_1_expiresAt_1' ||
          (index.key && (index.key.fromUserId !== undefined || index.key.toUserId !== undefined))) {
        await collection.dropIndex(index.name);
        console.log('✅ [FriendRequest] 已删除旧索引:', index.name);
      }
    }
    
    // 确保新索引存在（Mongoose 会自动创建，但为了保险手动创建）
    const newIndexName = 'fromPersonaId_1_toPersonaId_1_status_1';
    const existingNewIndex = indexes.find(i => i.name === newIndexName);
    if (!existingNewIndex) {
      await collection.createIndex(
        { fromPersonaId: 1, toPersonaId: 1, status: 1 },
        { unique: true, name: newIndexName }
      );
      console.log('✅ [FriendRequest] 新索引已创建:', newIndexName);
    }
    
  } catch (err) {
    // code 27 表示索引不存在，可以忽略
    if (err.code !== 27) {
      console.error('❌ [FriendRequest] 索引操作失败:', err.message);
    }
  }
})();

module.exports = FriendRequest;