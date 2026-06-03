// server/src/models/Friend.js
const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  friendPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 唯一索引：防止重复好友关系
friendSchema.index({ personaId: 1, friendPersonaId: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);

// 启动时删除旧索引
(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('friends');
      if (collection) {
        const indexes = await collection.indexes();
        for (const index of indexes) {
          if (index.name === 'userId_1_friendId_1' ||
              index.name === 'userId_1_friendId_1_unique' ||
              (index.key && (index.key.userId !== undefined || index.key.friendId !== undefined))) {
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