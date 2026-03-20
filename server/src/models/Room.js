// server/src/models/Room.js
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  nickname: { type: String, default: '' },
  title: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now }
});

const pendingMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
  message: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  announcement: { type: String, default: '' },
  avatar: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: true },
  requireApproval: { type: Boolean, default: true },
  members: [memberSchema],
  pendingMembers: [pendingMemberSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

roomSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.toString() === userId.toString());
};

roomSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && (member.role === 'owner' || member.role === 'admin');
};

roomSchema.methods.isOwner = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && member.role === 'owner';
};

module.exports = mongoose.model('Room', roomSchema);