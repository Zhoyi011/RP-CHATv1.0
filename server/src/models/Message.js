// server/src/models/Message.js - 添加音频字段
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room',
    required: true 
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
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  isAction: { 
    type: Boolean, 
    default: false
  },
  // ========== 语音消息相关字段（新增）==========
  isAudio: {
    type: Boolean,
    default: false
  },
  audioUrl: {
    type: String,
    default: null
  },
  audioDuration: {
    type: Number,  // 秒数，整数
    default: null
  },
  // ========== 拍一拍相关字段 ==========
  isPat: { 
    type: Boolean, 
    default: false 
  },
  
  patData: {
    actionId: { type: String },
    actionName: { type: String },
    actionIcon: { type: String },
    customPattern: { type: String },
    targetPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    targetPersonaName: { type: String }
  },
  // ========== 回复相关字段 ==========
  replyTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message',
    default: null 
  },
  isRecalled: { 
    type: Boolean, 
    default: false 
  },
  recalledAt: { 
    type: Date,
    default: null 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedBy: { 
    type: String,
    default: null 
  },
  deletedAt: { 
    type: Date,
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  mentions: [{
    type: { type: String, enum: ['persona', 'role', 'title'], default: 'persona' },
    targetId: { type: mongoose.Schema.Types.ObjectId, refPath: 'mentions.targetModel' },
    targetModel: { type: String },
    targetName: { type: String }
  }],
  mentionAll: { type: Boolean, default: false },

  // 🎨 表情消息字段（新增）
  isEmoji: { type: Boolean, default: false },
  emojiId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserEmoji', default: null },
  emojiUrl: { type: String, default: null },
});

// 索引优化查询性能
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ isPat: 1 });
messageSchema.index({ isPat: 1, createdAt: -1 });
// 语音消息索引（可选）
messageSchema.index({ isAudio: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);