// server/src/models/EmojiCategory.js
const mongoose = require('mongoose');

const emojiCategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 同一用户下分组名唯一
emojiCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('EmojiCategory', emojiCategorySchema);