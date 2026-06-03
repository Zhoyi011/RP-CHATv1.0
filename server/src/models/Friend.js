// server/src/models/Friend.js
const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  friendPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 唯一索引，防止重复好友
friendSchema.index({ personaId: 1, friendPersonaId: 1 }, { unique: true });

module.exports = mongoose.model('Friend', friendSchema);