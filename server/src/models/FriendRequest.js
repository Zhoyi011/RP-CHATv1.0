// server/src/models/FriendRequest.js
const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  toPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  message: {
    type: String,
    default: '想和你成为好友'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 唯一索引：同一对角色只能有一个 pending 申请
friendRequestSchema.index({ fromPersonaId: 1, toPersonaId: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);