const mongoose = require('mongoose');

const pendingMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
  message: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  description: { type: String, default: '' },
  announcement: { type: String, default: '' },
  avatar: { type: String, default: '' },
  
  // ✅ 创建者（Persona ID）
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona',
    required: true 
  },
  // ✅ 创建者的用户 ID（方便查询）
  creatorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isPublic: { type: Boolean, default: true },
  requireApproval: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  
  pendingMembers: [pendingMemberSchema],
  
  // ✅ 兼容旧 members 数组
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    title: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 辅助方法
roomSchema.methods.getMemberCount = async function() {
  const PersonaRoom = require('./PersonaRoom');
  return await PersonaRoom.countDocuments({ roomId: this._id });
};

// ✅ 根据 Persona ID 检查权限
roomSchema.methods.getPersonaRole = async function(personaId) {
  const PersonaRoom = require('./PersonaRoom');
  const record = await PersonaRoom.findOne({ personaId, roomId: this._id });
  if (record) return record.role;
  
  // 回退检查 members 数组
  if (this.members) {
    const member = this.members.find(m => m.personaId?.toString() === personaId.toString());
    if (member) return member.role;
  }
  
  // 回退：是否是创建者
  if (this.createdBy?.toString() === personaId.toString()) return 'owner';
  
  return null;
};

module.exports = mongoose.model('Room', roomSchema);