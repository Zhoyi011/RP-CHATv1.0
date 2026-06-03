// server/src/models/Friend.js
const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  friendPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 唯一索引（新）
friendSchema.index({ personaId: 1, friendPersonaId: 1 }, { unique: true });

// 禁用自动创建旧索引（如果有任何遗留 schema 定义）
friendSchema.set('autoIndex', true);

const Friend = mongoose.model('Friend', friendSchema);

// 启动时强制清理旧索引
(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('friends');
      if (collection) {
        const indexes = await collection.indexes();
        for (const idx of indexes) {
          if (idx.name === 'userId_1_friendId_1' || idx.name === 'userId_1' || idx.name === 'friendId_1') {
            await collection.dropIndex(idx.name);
            console.log(`✅ 已删除旧索引: ${idx.name}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('清理旧索引失败:', err);
  }
})();

module.exports = Friend;