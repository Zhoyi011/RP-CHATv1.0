// server/src/models/User.js
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
    enum: ['owner', 'super_admin', 'admin', 'user'], 
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
  
  // ===== 钻石系统（兼容旧版）=====
  diamonds: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // 🔥 新增：区分钻石类型
  paidDiamonds: {
    type: Number,
    default: 0,
    min: 0,
    description: '充值钻石（可发红包、可购买）'
  },
  freeDiamonds: {
    type: Number,
    default: 0,
    min: 0,
    description: '免费钻石（只能购买，不可发红包）'
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

  // ===== 引导流程 =====
  onboarded: {
    type: Boolean,
    default: false
  },
  onboardingCompletedAt: {
    type: Date,
    default: null
  },

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
  
  // 🔥 新增：上次查看好友动态的时间（用于判断是否有新动态）
  lastFeedViewAt: {
    type: Date,
    default: null
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
  return this.role === 'admin' || this.role === 'super_admin' || this.role === 'owner';
};

userSchema.methods.isOwner = function() {
  return this.role === 'owner';
};

// ========== 🔥 钻石分类系统 ==========

// 获取总钻石数（兼容旧版）
userSchema.methods.getTotalDiamonds = function() {
  return (this.diamonds || 0) + (this.paidDiamonds || 0) + (this.freeDiamonds || 0);
};

// 添加充值钻石
userSchema.methods.addPaidDiamonds = async function(amount) {
  this.paidDiamonds = (this.paidDiamonds || 0) + amount;
  // 同时更新旧版 diamonds 字段保持兼容
  this.diamonds = (this.diamonds || 0) + amount;
  await this.save();
  return this.paidDiamonds;
};

// 添加免费钻石（签到、红包等）
userSchema.methods.addFreeDiamonds = async function(amount) {
  this.freeDiamonds = (this.freeDiamonds || 0) + amount;
  // 同时更新旧版 diamonds 字段保持兼容
  this.diamonds = (this.diamonds || 0) + amount;
  await this.save();
  return this.freeDiamonds;
};

// 扣除钻石（优先扣除免费钻石，再扣除充值钻石）
userSchema.methods.deductDiamonds = async function(amount, requirePaid = false) {
  let total = this.getTotalDiamonds();
  if (total < amount) {
    throw new Error('钻石不足');
  }
  
  if (requirePaid) {
    // 发红包等操作只能用充值钻石
    if ((this.paidDiamonds || 0) < amount) {
      throw new Error('充值钻石不足，请充值后再发红包');
    }
    this.paidDiamonds -= amount;
    this.diamonds -= amount;
  } else {
    // 优先扣除免费钻石
    let remaining = amount;
    const freeAmount = Math.min(this.freeDiamonds || 0, remaining);
    this.freeDiamonds -= freeAmount;
    remaining -= freeAmount;
    
    if (remaining > 0) {
      this.paidDiamonds -= remaining;
    }
    this.diamonds -= amount;
  }
  
  await this.save();
  return this.getTotalDiamonds();
};

// 检查是否有足够的充值钻石（发红包用）
userSchema.methods.hasEnoughPaidDiamonds = function(amount) {
  return (this.paidDiamonds || 0) >= amount;
};

// ========== 每日签到 ==========

const DAILY_REWARDS = [5, 5, 8, 8, 10, 15, 20];

const getRewardByStreak = (streak) => {
  if (streak <= 0) return DAILY_REWARDS[0];
  if (streak > 7) {
    return DAILY_REWARDS[(streak - 1) % 7];
  }
  return DAILY_REWARDS[streak - 1];
};

userSchema.methods.claimDailyDiamond = function() {
  const now = new Date();
  const last = this.lastDailyDiamond;
  
  if (!last) {
    this.dailyDiamondStreak = 1;
  } else {
    const diff = now.getTime() - last.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours >= 24 && hours < 48) {
      this.dailyDiamondStreak = Math.min(this.dailyDiamondStreak + 1, 7);
    } else if (hours >= 48) {
      this.dailyDiamondStreak = 1;
    } else {
      throw new Error('今日已领取');
    }
  }
  
  const reward = getRewardByStreak(this.dailyDiamondStreak);
  
  // 签到奖励添加到免费钻石
  this.freeDiamonds = (this.freeDiamonds || 0) + reward;
  this.diamonds = (this.diamonds || 0) + reward;
  this.lastDailyDiamond = now;
  
  return { reward, streak: this.dailyDiamondStreak, diamonds: this.getTotalDiamonds() };
};

// 获取每日信息
userSchema.methods.getDailyInfo = function() {
  const today = new Date().toDateString();
  const lastDailyDate = this.lastDailyDiamond ? new Date(this.lastDailyDiamond).toDateString() : null;
  const hasClaimed = lastDailyDate === today;
  const currentStreak = this.dailyDiamondStreak || 0;
  const nextReward = getRewardByStreak(hasClaimed ? currentStreak + 1 : currentStreak + 1);
  
  return {
    hasClaimed,
    currentStreak,
    nextReward,
    rewards: DAILY_REWARDS
  };
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
    onboarded: this.onboarded || false,
    // 🔥 钻石字段
    diamonds: this.getTotalDiamonds(),
    paidDiamonds: this.paidDiamonds || 0,
    freeDiamonds: this.freeDiamonds || 0,
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
    lastFeedViewAt: this.lastFeedViewAt || null,
    stats: this.stats || { totalMessages: 0, totalRooms: 0, totalPersonas: 0 },
    inventory: this.inventory || [],
    achievements: this.achievements || []
  };
};

module.exports = mongoose.model('User', userSchema);