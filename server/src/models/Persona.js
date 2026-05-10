const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
  // 基础信息
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
  tags: [{ 
    type: String, 
    maxlength: 20 
  }],
  
  // 编号系统（同一名字的皮有不同编号）
  globalNumber: { 
    type: Number, 
    unique: true,
    sparse: true
  },
  usageCount: { 
    type: Number, 
    default: 1 
  },
  
  // ✅ 所属账号（关键关联）
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  originalPersonaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona' 
  },
  
  // 状态
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewComment: { 
    type: String 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: Date,
  
  // 统计
  viewCount: { 
    type: Number, 
    default: 0 
  },
  likeCount: { 
    type: Number, 
    default: 0 
  },
  postsCount: { 
    type: Number, 
    default: 0 
  },
  
  // 角色主页
  homepage: {
    background: { type: String, default: '' },
    intro: { type: String, maxlength: 500, default: '' },
    social: {
      wechat: { type: String, default: '' },
      discord: { type: String, default: '' }
    }
  },
  
  // 守护榜（可选）
  guardians: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  totalGuardianAmount: { type: Number, default: 0 },
  
  // 亲密关系（可选）
  relationships: [{
    targetPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    type: { type: String, enum: ['friend', 'couple', 'soulmate', 'master', 'apprentice'], default: 'friend' },
    cardId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // 装备（可选）
  equipped: {
    avatarFrame: { type: String, default: '' },
    ring: { type: String, default: '' },
    relationshipCard: { type: String, default: '' }
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

// 生成编号和显示名称
personaSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  if (this.isNew && this.status === 'approved') {
    // 同一名字的角色，使用次数+1
    const sameName = await this.constructor.findOne({ name: this.name })
      .sort({ usageCount: -1 });
    
    this.usageCount = sameName ? sameName.usageCount + 1 : 1;
    this.displayName = `${this.name} No.${this.usageCount}`;
    
    // 全局唯一编号
    const last = await this.constructor.findOne({ status: 'approved' }).sort('-globalNumber');
    this.globalNumber = last ? last.globalNumber + 1 : 1;
  } else if (!this.displayName) {
    this.displayName = this.name;
  }
  
  next();
});

// 添加守护
personaSchema.methods.addGuardian = function(userId, amount) {
  const existing = this.guardians.find(g => g.userId.toString() === userId.toString());
  if (existing) {
    existing.amount += amount;
  } else {
    this.guardians.push({ userId, amount });
  }
  this.totalGuardianAmount += amount;
  return this.save();
};

// 返回安全信息
personaSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    name: this.name,
    displayName: this.displayName,
    description: this.description,
    avatar: this.avatar,
    tags: this.tags,
    globalNumber: this.globalNumber,
    usageCount: this.usageCount,
    status: this.status,
    viewCount: this.viewCount,
    likeCount: this.likeCount,
    postsCount: this.postsCount,
    createdAt: this.createdAt,
    userId: this.userId
  };
};

module.exports = mongoose.model('Persona', personaSchema);