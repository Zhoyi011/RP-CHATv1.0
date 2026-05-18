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
  // ========== 新增字段 ==========
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
  }
});

// 索引优化查询性能
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ replyTo: 1 });

module.exports = mongoose.model('Message', messageSchema);