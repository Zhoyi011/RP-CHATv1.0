// server/src/models/Title.js
const mongoose = require('mongoose');

const titleSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 20 },
  color: { type: String, default: '#6b7280' },
  icon: { type: String, default: '🏷️' },
  permission: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Title', titleSchema);