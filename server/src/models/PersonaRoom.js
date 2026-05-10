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
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'member'], 
    default: 'member' 
  },
  nickname: { 
    type: String, 
    default: '' 
  },
  title: { 
    type: String, 
    default: '' 
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 复合唯一索引：一个角色不能重复加入同一个群
personaRoomSchema.index({ personaId: 1, roomId: 1 }, { unique: true });

module.exports = mongoose.model('PersonaRoom', personaRoomSchema);