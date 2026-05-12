const mongoose = require('mongoose');

const personaRoomSchema = new mongoose.Schema({
  personaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona', 
    required: true, 
    index: true 
  },
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true, 
    index: true 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'member'], 
    default: 'member' 
  },
  title: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now }
});

// 复合唯一索引
personaRoomSchema.index({ personaId: 1, roomId: 1 }, { unique: true });

module.exports = mongoose.model('PersonaRoom', personaRoomSchema);