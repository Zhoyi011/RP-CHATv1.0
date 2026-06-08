// server/src/models/Chapter.js
const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Novel',
    required: true
  },
  chapterNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  contentHtml: {
    type: String,
    default: ''  // Markdown 渲染后的 HTML
  },
  wordCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 复合唯一索引：同一小说下章节号唯一
chapterSchema.index({ novelId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ novelId: 1, createdAt: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);