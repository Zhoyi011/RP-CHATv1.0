// server/src/models/Novel.js
const mongoose = require('mongoose');

const novelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  authorPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  cover: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他']
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['连载', '完结'],
    default: '连载'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  totalChapters: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
// 索引优化搜索
// 1. 全文搜索索引
novelSchema.index({ title: 'text', description: 'text', authorName: 'text' });

// 2. 分类筛选（首页分类浏览）
novelSchema.index({ category: 1, status: 1, createdAt: -1 });

// 3. 作者作品列表（作者控制台）
novelSchema.index({ authorPersonaId: 1, createdAt: -1 });

// 4. 活跃小说默认排序
novelSchema.index({ isActive: 1, createdAt: -1 });

// 5. 热门榜排序
novelSchema.index({ views: -1 });
novelSchema.index({ likes: -1 });
novelSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Novel', novelSchema);