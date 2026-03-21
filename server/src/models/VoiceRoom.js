const mongoose = require('mongoose');

const voiceRoomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 50
  },
  description: { 
    type: String, 
    default: '',
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['chat', 'music', 'game', 'study', 'rp'],
    default: 'chat'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  creatorAvatar: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  memberCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VoiceRoom', voiceRoomSchema);