const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String,
    sparse: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  displayName: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=3b82f6&color=fff&size=128'
  },
  password: {
    type: String
  },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'user'], 
    default: 'user' 
  },
  status: {
    type: String,
    enum: ['active', 'banned', 'muted', 'online', 'away'],
    default: 'active'
  },
  hasAccess: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    default: ''
  },
  lastLogin: {
    type: Date
  },
  
  // ===== 账号级别共享钻石 =====
  diamonds: {
    type: Number,
    default: 0,
    min: 0
  },
  lastDailyDiamond: {
    type: Date,
    default: null
  },
  dailyDiamondStreak: {
    type: Number,
    default: 0
  },
  
  // ===== 登录连续 =====
  loginStreak: {
    type: Number,
    default: 0
  },
  
  // ===== 用户设置 =====
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  notifications: {
    type: Boolean,
    default: true
  },
  soundEnabled: {
    type: Boolean,
    default: true
  },
  defaultTranslate: {
    type: String,
    enum: ['off', 'simplified', 'traditional'],
    default: 'off'
  },
  
  birthday: { type: Date, default: null },
  zodiac: { type: String, default: '' },

  // ===== 装备 =====
  equippedItems: {
    avatarFrame: { type: String, default: '' },
    ring: { type: String, default: '' },
    relationshipCard: { type: String, default: '' }
  },
  
  // ===== 背包 =====
  inventory: [{
    itemId: String,
    itemType: { type: String, enum: ['avatar_frame', 'ring', 'relationship_card', 'other'] },
    name: String,
    description: String,
    quantity: { type: Number, default: 1 },
    equipped: { type: Boolean, default: false },
    acquiredAt: { type: Date, default: Date.now }
  }],
  
  // ===== 成就 =====
  achievements: [{
    name: String,
    description: String,
    progress: { type: Number, default: 0 },
    total: { type: Number, default: 1 },
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  
  // ===== 统计 =====
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    totalPersonas: { type: Number, default: 0 }
  },
  
  // ===== 金币（兼容旧版）=====
  coins: {
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
  equippedItems: {
    avatarFrame: { type: String, default: null },
    ring: { type: String, default: null },
    relationshipCard: { type: String, default: null }
  }
});

// ===== 中间件 =====
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ===== 方法 =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAdmin = function() {
  return this.role === 'admin' || this.role === 'owner';
};

userSchema.methods.isOwner = function() {
  return this.role === 'owner';
};

// ========== 钻石系统 ==========

userSchema.methods.addDiamonds = async function(amount) {
  this.diamonds += amount;
  await this.save();
  return this.diamonds;
};

userSchema.methods.deductDiamonds = async function(amount) {
  if (this.diamonds < amount) {
    throw new Error('钻石不足');
  }
  this.diamonds -= amount;
  await this.save();
  return this.diamonds;
};

userSchema.methods.claimDailyDiamond = function() {
  const now = new Date();
  const last = this.lastDailyDiamond;
  const DAILY_REWARDS = [5, 5, 8, 8, 10, 15, 20];
  
  if (!last) {
    this.dailyDiamondStreak = 1;
  } else {
    const diff = now.getTime() - last.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours >= 24 && hours < 48) {
      this.dailyDiamondStreak = Math.min(this.dailyDiamondStreak + 1, 6);
    } else if (hours >= 48) {
      this.dailyDiamondStreak = 1;
    } else {
      throw new Error('今日已领取');
    }
  }
  
  const streakIndex = this.dailyDiamondStreak - 1;
  const reward = DAILY_REWARDS[streakIndex];
  this.diamonds += reward;
  this.lastDailyDiamond = now;
  
  return { reward, streak: this.dailyDiamondStreak, diamonds: this.diamonds };
};

// ========== 金币系统（兼容）==========

userSchema.methods.addCoins = async function(amount) {
  this.coins += amount;
  await this.save();
  return this.coins;
};

userSchema.methods.deductCoins = async function(amount) {
  if (this.coins < amount) {
    throw new Error('金币不足');
  }
  this.coins -= amount;
  await this.save();
  return this.coins;
};

userSchema.methods.claimDailyReward = function() {
  const now = new Date();
  const last = this.lastDailyDiamond;
  const DAILY_REWARDS = [5, 5, 8, 8, 10, 15, 20];
  
  if (!last) {
    this.loginStreak = 1;
  } else {
    const diff = now.getTime() - last.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours >= 24 && hours < 48) {
      this.loginStreak = Math.min(this.loginStreak + 1, 6);
    } else if (hours >= 48) {
      this.loginStreak = 1;
    } else {
      throw new Error('今日已领取');
    }
  }
  
  const streakIndex = this.loginStreak - 1;
  const reward = DAILY_REWARDS[streakIndex];
  this.coins += reward;
  this.lastDailyDiamond = now;
  
  return { reward, streak: this.loginStreak, coins: this.coins };
};

// ========== 背包系统 ==========

userSchema.methods.addItem = async function(item) {
  const existing = this.inventory.find(i => i.itemId === item.itemId);
  if (existing) {
    existing.quantity += item.quantity || 1;
  } else {
    this.inventory.push(item);
  }
  await this.save();
  return this.inventory;
};

userSchema.methods.equipItem = async function(itemId) {
  const item = this.inventory.find(i => i.itemId === itemId);
  if (!item) throw new Error('物品不存在');
  
  // 取消同类型装备
  this.inventory.forEach(i => {
    if (i.itemType === item.itemType) i.equipped = false;
  });
  
  item.equipped = true;
  
  // 更新 equippedItems
  if (!this.equippedItems) this.equippedItems = {};
  this.equippedItems[item.itemType] = item.itemId;
  
  await this.save();
  return this.equippedItems;
};

// ========== 安全输出 ==========

userSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    role: this.role,
    status: this.status,
    hasAccess: this.hasAccess,
    diamonds: this.diamonds || 0,
    coins: this.coins || 0,
    dailyDiamondStreak: this.dailyDiamondStreak || 0,
    loginStreak: this.loginStreak || 0,
    theme: this.theme || 'light',
    notifications: this.notifications !== false,
    soundEnabled: this.soundEnabled !== false,
    defaultTranslate: this.defaultTranslate || 'off',
    equippedItems: this.equippedItems || {},
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    stats: this.stats || { totalMessages: 0, totalRooms: 0, totalPersonas: 0 },
    inventory: this.inventory || [],
    achievements: this.achievements || []
  };
};
module.exports = mongoose.model('User', userSchema);