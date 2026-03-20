const mongoose = require('mongoose');

// 守护榜条目
const guardianSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// 亲密关系
const relationshipSchema = new mongoose.Schema({
  targetPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  type: { type: String, enum: ['friend', 'couple', 'soulmate', 'master', 'apprentice'], default: 'friend' },
  cardId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// 动态评论
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// 动态
const postSchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 2000 },
  images: [{ type: String }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

const personaSchema = new mongoose.Schema({
  // 基础信息
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  displayName: { type: String, default: '' }, // 显示名称（带编号）
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
  
  // 编号系统
  globalNumber: { 
    type: Number, 
    unique: true,
    sparse: true
  },
  usageCount: { 
    type: Number, 
    default: 1 
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
  
  // 守护榜
  guardians: [guardianSchema],
  totalGuardianAmount: { type: Number, default: 0 },
  
  // 亲密关系
  relationships: [relationshipSchema],
  
  // 动态
  posts: [postSchema],
  postsCount: { type: Number, default: 0 },
  
  // 装备
  equipped: {
    avatarFrame: { type: String, default: '' },
    ring: { type: String, default: '' },
    relationshipCard: { type: String, default: '' }
  },
  
  // 来源
  createdBy: { 
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
  reviewComment: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  
  // 统计
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 生成编号和显示名称
personaSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  if (this.isNew && this.status === 'approved') {
    // 找到同名角色中最大的使用次数
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

// 添加亲密关系
personaSchema.methods.addRelationship = function(targetPersonaId, type, cardId) {
  const existing = this.relationships.find(r => r.targetPersonaId.toString() === targetPersonaId.toString());
  if (existing) {
    existing.type = type;
    existing.cardId = cardId;
  } else {
    this.relationships.push({ targetPersonaId, type, cardId });
  }
  return this.save();
};

// 移除亲密关系
personaSchema.methods.removeRelationship = function(targetPersonaId) {
  this.relationships = this.relationships.filter(r => r.targetPersonaId.toString() !== targetPersonaId.toString());
  return this.save();
};

// 添加动态
personaSchema.methods.addPost = function(content, images) {
  this.posts.unshift({ content, images: images || [] });
  if (this.posts.length > 50) {
    this.posts = this.posts.slice(0, 50);
  }
  this.postsCount = this.posts.length;
  return this.save();
};

// 返回安全信息
personaSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    displayName: this.displayName,
    description: this.description,
    avatar: this.avatar,
    tags: this.tags,
    globalNumber: this.globalNumber,
    usageCount: this.usageCount,
    homepage: this.homepage,
    guardians: this.guardians.slice(0, 10),
    totalGuardianAmount: this.totalGuardianAmount,
    relationships: this.relationships,
    equipped: this.equipped,
    status: this.status,
    viewCount: this.viewCount,
    likeCount: this.likeCount,
    postsCount: this.postsCount,
    createdAt: this.createdAt,
    createdBy: this.createdBy
  };
};

module.exports = mongoose.model('Persona', personaSchema);