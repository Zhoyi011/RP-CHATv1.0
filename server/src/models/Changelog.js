const mongoose = require('mongoose');

const changelogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['auto', 'manual'],
    required: true
  },
  // 自动更新（来自 GitHub）
  sha: {
    type: String,
    sparse: true
  },
  message: {
    type: String
  },
  formattedMessage: {
    type: String
  },
  commitType: {
    type: String,
    enum: ['feat', 'add', 'fix', 'docs', 'style', 'refactor', 'chore', 'perf', 'test', 'other', 'manual'],
    default: 'other'
  },
  // 手动更新
  title: {
    type: String
  },
  content: {
    type: String
  },
  // 通用字段
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  url: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建索引
changelogSchema.index({ date: -1 });
changelogSchema.index({ type: 1 });
changelogSchema.index({ sha: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Changelog', changelogSchema);