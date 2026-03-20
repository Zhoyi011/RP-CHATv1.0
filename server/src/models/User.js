const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Firebase UID
  firebaseUid: { 
    type: String,
    sparse: true,
    unique: true
  },
  
  // 用户名
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  // 邮箱
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '请填写有效的邮箱地址']
  },
  
  // 密码
  password: { 
    type: String,
    minlength: 6,
    select: false
  },
  
  // 显示名称
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // 头像
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=10b981&color=fff&size=128'
  },
  
  // 角色
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'user'], 
    default: 'user' 
  },
  
  // 状态
  status: { 
    type: String, 
    enum: ['active', 'banned', 'muted', 'online', 'away'], 
    default: 'active' 
  },
  
  // 访问权限
  hasAccess: { 
    type: Boolean,
    default: false
  },
  
  // 使用的邀请码
  inviteCode: { 
    type: String,
    ref: 'InviteCode'
  },
  
  // ===== 金币系统 =====
  coins: {
    type: Number,
    default: 0
  },
  
  // 最后登录时间
  lastLogin: {
    type: Date
  },
  
  // 每日登录奖励
  lastDailyReward: {
    type: Date
  },
  
  // 连续登录天数
  loginStreak: {
    type: Number,
    default: 0
  },
  
  // ===== 背包系统 =====
  inventory: [{
    itemId: {
      type: String,
      required: true
    },
    itemType: {
      type: String,
      enum: ['avatar_frame', 'ring', 'relationship_card', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    equipped: {
      type: Boolean,
      default: false
    },
    acquiredAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 当前装备的物品
  equippedItems: {
    avatarFrame: { type: String, default: null },
    ring: { type: String, default: null },
    relationshipCard: { type: String, default: null }
  },
  
  // ===== 统计 =====
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    totalPersonas: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now }
  },
  
  // ===== 成就 =====
  achievements: [{
    achievementId: String,
    name: String,
    description: String,
    progress: { type: Number, default: 0 },
    total: Number,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  
  // 创建时间
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// 判断是否是管理员
userSchema.methods.isAdmin = function() {
  return this.role === 'admin' || this.role === 'owner';
};

// 判断是否是所有者
userSchema.methods.isOwner = function() {
  return this.role === 'owner';
};

// 判断是否有访问权限
userSchema.methods.canAccess = function() {
  return this.status === 'active' && (this.hasAccess || this.isAdmin());
};

// 添加金币
userSchema.methods.addCoins = function(amount) {
  this.coins += amount;
  return this.save();
};

// 扣除金币
userSchema.methods.deductCoins = function(amount) {
  if (this.coins < amount) {
    throw new Error('金币不足');
  }
  this.coins -= amount;
  return this.save();
};

// 每日登录奖励
userSchema.methods.claimDailyReward = function() {
  const now = new Date();
  const last = this.lastDailyReward;
  
  // 检查是否是第一次领取
  if (!last) {
    this.loginStreak = 1;
  } else {
    const diff = now.getTime() - last.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    // 如果超过24小时但小于48小时，连续登录+1
    if (hours >= 24 && hours < 48) {
      this.loginStreak += 1;
    } 
    // 如果超过48小时，重置连续登录
    else if (hours >= 48) {
      this.loginStreak = 1;
    }
    // 如果小于24小时，不能重复领取
    else {
      throw new Error('今日已领取过奖励');
    }
  }
  
  this.lastDailyReward = now;
  
  // 根据连续天数计算奖励
  let reward = 50; // 基础奖励
  if (this.loginStreak >= 7) reward = 200;
  else if (this.loginStreak >= 3) reward = 100;
  
  this.coins += reward;
  
  return {
    coins: this.coins,
    streak: this.loginStreak,
    reward
  };
};

// 添加物品到背包
userSchema.methods.addItem = function(item) {
  const existingItem = this.inventory.find(i => i.itemId === item.itemId);
  
  if (existingItem) {
    existingItem.quantity += item.quantity || 1;
  } else {
    this.inventory.push({
      itemId: item.itemId,
      itemType: item.itemType,
      name: item.name,
      description: item.description,
      quantity: item.quantity || 1,
      equipped: false
    });
  }
  
  return this.save();
};

// 装备物品
userSchema.methods.equipItem = function(itemId) {
  const item = this.inventory.find(i => i.itemId === itemId);
  
  if (!item) {
    throw new Error('物品不存在');
  }
  
  if (item.quantity < 1) {
    throw new Error('物品数量不足');
  }
  
  // 根据物品类型装备
  switch (item.itemType) {
    case 'avatar_frame':
      this.equippedItems.avatarFrame = itemId;
      break;
    case 'ring':
      this.equippedItems.ring = itemId;
      break;
    case 'relationship_card':
      this.equippedItems.relationshipCard = itemId;
      break;
    default:
      throw new Error('该物品无法装备');
  }
  
  // 标记该物品为已装备
  item.equipped = true;
  
  return this.save();
};

// 返回安全用户信息
userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    displayName: this.displayName,
    avatar: this.avatar,
    role: this.role,
    status: this.status,
    hasAccess: this.hasAccess,
    coins: this.coins,
    loginStreak: this.loginStreak,
    equippedItems: this.equippedItems,
    stats: this.stats,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

module.exports = mongoose.model('User', userSchema);