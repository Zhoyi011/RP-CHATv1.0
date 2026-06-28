// server/src/models/Persona.js
const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    required: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 15
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sameNameNumber: {
    type: Number,
    default: 1
  },
  
  // 统计数据
  usageCount: {
    type: Number,
    default: 0
  },
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
  
  // 创建者信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 角色主页
  homepage: {
    background: { type: String, default: '' },
    intro: { type: String, default: '' },
    social: {
      wechat: { type: String, default: '' },
      discord: { type: String, default: '' }
    }
  },
  
  // 守护者
  guardians: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  totalGuardianAmount: {
    type: Number,
    default: 0
  },
  
  // 守护值（收到的礼物总额）
  guardianValue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 亲密关系
  relationships: [{
    targetPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    type: {
      type: String,
      enum: ['friend', 'couple', 'soulmate', 'master', 'apprentice']
    },
    cardId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // 装备
  equipped: {
    avatarFrame: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', default: null },
    ring: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', default: null },
    relationshipCard: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', default: null }
  },
  
  // ========== 🆕 小说作者相关字段 ==========
  // 是否为作者
  isAuthor: {
    type: Boolean,
    default: false
  },
  // 作者资格批准时间
  authorApprovedAt: {
    type: Date,
    default: null
  },
  // 作者可创作的小说数量上限（基础5本，可扩展）
  novelSlots: {
    type: Number,
    default: 5
  },
  // 已创作的小说数量
  createdNovelCount: {
    type: Number,
    default: 0
  },
  // 粉丝数
  followersCount: {
    type: Number,
    default: 0
  },
  // 总赞赏收入（付费钻石）
  totalDonationIncome: {
    type: Number,
    default: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
    // ========== 🆕 等级/经验/头衔缓存 ==========
  level: {
    type: Number,
    default: 1,
  },
  exp: {
    type: Number,
    default: 0,
  },
  title: {
    type: String,
    default: '🌱 初入万物',
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
});

// 更新 updatedAt
personaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：计算同名编号（只计算已批准的角色）
personaSchema.statics.getNextSameNameNumber = async function(name, excludeId = null) {
  const query = { 
    name: name, 
    status: 'approved'
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const count = await this.countDocuments(query);
  return count + 1;
};

// 标记角色被使用
personaSchema.methods.markUsed = async function() {
  this.usageCount = (this.usageCount || 0) + 1;
  await this.save();
};

// 标记角色在群里被使用
personaSchema.methods.markUsedInRoom = async function(roomId) {
  this.usageCount = (this.usageCount || 0) + 1;
  await this.save();
  
  const PersonaRoom = mongoose.model('PersonaRoom');
  await PersonaRoom.findOneAndUpdate(
    { personaId: this._id, roomId },
    { lastUsedAt: new Date() },
    { upsert: true }
  );
};

// 增加浏览量
personaSchema.methods.addView = async function() {
  this.viewCount = (this.viewCount || 0) + 1;
  await this.save();
};

// 增加点赞
personaSchema.methods.addLike = async function() {
  this.likeCount = (this.likeCount || 0) + 1;
  await this.save();
};

// 增加守护值
personaSchema.methods.addGuardianValue = async function(amount) {
  this.guardianValue = (this.guardianValue || 0) + amount;
  await this.save();
  return this.guardianValue;
};

// 获取守护榜排名
personaSchema.statics.getGuardianRanking = async function(limit = 50) {
  return await this.find({ status: 'approved' })
    .sort({ guardianValue: -1 })
    .limit(limit)
    .select('_id name displayName avatar guardianValue');
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
    status: this.status,
    sameNameNumber: this.sameNameNumber,
    userId: this.userId,
    usageCount: this.usageCount,
    viewCount: this.viewCount,
    likeCount: this.likeCount,
    postsCount: this.postsCount,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    homepage: this.homepage,
    guardians: this.guardians,
    totalGuardianAmount: this.totalGuardianAmount,
    relationships: this.relationships,
    equipped: this.equipped,
    guardianValue: this.guardianValue || 0,
    // 🆕 作者字段
    isAuthor: this.isAuthor,
    authorApprovedAt: this.authorApprovedAt,
    novelSlots: this.novelSlots,
    createdNovelCount: this.createdNovelCount,
    followersCount: this.followersCount,
    totalDonationIncome: this.totalDonationIncome,
    level: this.level || 1,
    exp: this.exp || 0,
    title: this.title || '🌱 初入万物',
  };
};

module.exports = mongoose.model('Persona', personaSchema);