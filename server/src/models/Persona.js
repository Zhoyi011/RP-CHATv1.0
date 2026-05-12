const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  displayName: { 
    type: String, 
    default: '' 
  },
  description: { 
    type: String, 
    maxlength: 500,
    default: ''
  },
  avatar: { 
    type: String, 
    default: 'https://ui-avatars.com/api/?background=10b981&color=fff&size=128'
  },
  tags: [{ type: String, maxlength: 20 }],
  
  // ✅ 编号系统
  globalNumber: { 
    type: Number, 
    unique: true,
    sparse: true
  },
  sameNameNumber: {
    type: Number,
    default: 1
  },
  
  // ✅ 所属用户（Google 账号）
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  originalPersonaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona' 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewComment: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  
  homepage: {
    background: { type: String, default: '' },
    intro: { type: String, maxlength: 500, default: '' },
    social: {
      wechat: { type: String, default: '' },
      discord: { type: String, default: '' }
    }
  },
  
  guardians: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  totalGuardianAmount: { type: Number, default: 0 },
  
  relationships: [{
    targetPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    type: { type: String, enum: ['friend', 'couple', 'soulmate', 'master', 'apprentice'], default: 'friend' },
    cardId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  equipped: {
    avatarFrame: { type: String, default: '' },
    ring: { type: String, default: '' },
    relationshipCard: { type: String, default: '' }
  },
  
  // ✅ 该 Persona 在各个群的最后使用时间（用于切皮优先级）
  lastUsedInRoom: [{
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    lastUsedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ✅ 保存前自动生成编号
personaSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  if (this.isNew && this.status === 'approved') {
    // 同名字编号
    const sameNameCount = await this.constructor.countDocuments({ 
      name: this.name, 
      status: 'approved' 
    });
    this.sameNameNumber = sameNameCount + 1;
    this.displayName = `${this.name} #${this.sameNameNumber}`;
    
    // 全局编号
    const lastGlobal = await this.constructor.findOne({ status: 'approved' })
      .sort({ globalNumber: -1 });
    this.globalNumber = lastGlobal && lastGlobal.globalNumber ? lastGlobal.globalNumber + 1 : 1;
  } else if (!this.displayName) {
    this.displayName = this.name;
  }
  
  next();
});

// ✅ 更新在群里的最后使用时间
personaSchema.methods.markUsedInRoom = async function(roomId) {
  const existing = this.lastUsedInRoom.find(r => r.roomId.toString() === roomId.toString());
  if (existing) {
    existing.lastUsedAt = new Date();
  } else {
    this.lastUsedInRoom.push({ roomId, lastUsedAt: new Date() });
  }
  await this.save();
};

// ✅ 在群里最后使用的 Persona（用于自动选择发言皮）
personaSchema.statics.getLastUsedInRoom = async function(userId, roomId) {
  // 获取用户在群里所有的 Persona
  const PersonaRoom = require('./PersonaRoom');
  const personaRooms = await PersonaRoom.find({ roomId });
  const personaIds = personaRooms.map(pr => pr.personaId);
  
  const personas = await this.find({
    _id: { $in: personaIds },
    userId,
    status: 'approved'
  }).sort({ 'lastUsedInRoom.lastUsedAt': -1 });
  
  // 返回最后使用的那个
  return personas.length > 0 ? personas[0] : null;
};

// ✅ 用户在群里所有的 Persona
personaSchema.statics.getPersonasInRoom = async function(userId, roomId) {
  const PersonaRoom = require('./PersonaRoom');
  const personaRooms = await PersonaRoom.find({ roomId });
  const personaIds = personaRooms.map(pr => pr.personaId);
  
  return await this.find({
    _id: { $in: personaIds },
    userId,
    status: 'approved'
  });
};

// 安全输出
personaSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    name: this.name,
    displayName: this.displayName,
    description: this.description,
    avatar: this.avatar,
    tags: this.tags,
    globalNumber: this.globalNumber,
    sameNameNumber: this.sameNameNumber,
    status: this.status,
    viewCount: this.viewCount,
    likeCount: this.likeCount,
    postsCount: this.postsCount,
    userId: this.userId,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Persona', personaSchema);