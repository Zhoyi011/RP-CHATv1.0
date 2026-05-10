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
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=3b82f6&color=fff&size=128'
  },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'user'], 
    default: 'user' 
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
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

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

userSchema.methods.addDiamonds = async function(amount, description) {
  this.diamonds += amount;
  await this.save();
  return this.diamonds;
};

userSchema.methods.deductDiamonds = async function(amount, description) {
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

userSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    avatar: this.avatar,
    role: this.role,
    diamonds: this.diamonds || 0,
    dailyDiamondStreak: this.dailyDiamondStreak || 0,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);