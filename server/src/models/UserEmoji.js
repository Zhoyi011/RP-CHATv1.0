// server/src/models/UserEmoji.js
const mongoose = require('mongoose');

const userEmojiSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmojiCategory',
    default: null
  },
  fileSize: {
    type: Number,  // KB
    default: 0
  },
  width: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    enum: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    default: 'image/png'
  },
  isGif: {
    type: Boolean,
    default: false
  },
  useCount: {
    type: Number,
    default: 0
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isBanned: {
    type: Boolean,
    default: false  // 被举报下架
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引
userEmojiSchema.index({ userId: 1, createdAt: -1 });
userEmojiSchema.index({ userId: 1, isFavorite: -1 });
userEmojiSchema.index({ userId: 1, useCount: -1 });
userEmojiSchema.index({ userId: 1, categoryId: 1 });

// 每人最多 300 张的验证（在服务层实现）
userEmojiSchema.statics.getUserCount = async function(userId) {
  return await this.countDocuments({ userId, isBanned: false });
};

module.exports = mongoose.model('UserEmoji', userEmojiSchema);