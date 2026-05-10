const mongoose = require('mongoose');

// 待审核成员 Schema
const pendingMemberSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  personaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona' 
  },
  message: { 
    type: String, 
    default: '' 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const roomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  announcement: { 
    type: String, 
    default: '' 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  isPublic: { 
    type: Boolean, 
    default: true 
  },
  requireApproval: { 
    type: Boolean, 
    default: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  pendingMembers: [pendingMemberSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 辅助方法（通过 PersonaRoom 查询）
roomSchema.methods.getMemberCount = async function() {
  const PersonaRoom = require('./PersonaRoom');
  return await PersonaRoom.countDocuments({ roomId: this._id });
};

roomSchema.methods.isPersonaInRoom = async function(personaId) {
  const PersonaRoom = require('./PersonaRoom');
  const record = await PersonaRoom.findOne({ personaId, roomId: this._id });
  return !!record;
};

roomSchema.methods.getPersonaRole = async function(personaId) {
  const PersonaRoom = require('./PersonaRoom');
  const record = await PersonaRoom.findOne({ personaId, roomId: this._id });
  return record?.role || null;
};

// 兼容旧代码（后续可移除）
roomSchema.methods.isMember = async function(userId) {
  const Persona = require('./Persona');
  const personas = await Persona.find({ userId });
  const PersonaRoom = require('./PersonaRoom');
  const records = await PersonaRoom.find({ 
    personaId: { $in: personas.map(p => p._id) },
    roomId: this._id 
  });
  return records.length > 0;
};

module.exports = mongoose.model('Room', roomSchema);