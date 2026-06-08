// server/src/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Novel',
    required: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null  // null 表示对小说的评论，有值表示对章节的评论
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  personaName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null  // 支持回复
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

commentSchema.index({ novelId: 1, createdAt: -1 });
commentSchema.index({ chapterId: 1, createdAt: -1 });
commentSchema.index({ personaId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);