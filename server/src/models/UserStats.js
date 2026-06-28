// server/src/models/UserStats.js
const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 按角色独立统计（每个角色有自己的等级）
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    unique: true, // 每个角色只有一条记录
  },
  // 当前经验值
  exp: {
    type: Number,
    default: 0,
    min: 0,
  },
  // 当前等级
  level: {
    type: Number,
    default: 1,
    min: 1,
  },
  // 累计总经验（用于统计）
  totalExp: {
    type: Number,
    default: 0,
  },
  // 今日已获得经验（用于每日上限）
  dailyExpGained: {
    type: Number,
    default: 0,
  },
  // 上次每日经验重置日期
  lastDailyReset: {
    type: Date,
    default: null,
  },
  // 当前头衔
  title: {
    type: String,
    default: '🌱 初入万物',
  },
  // 已解锁的头衔列表（用于收集）
  unlockedTitles: [{
    type: String,
  }],
  // 升级历史（最近10条）
  levelUpHistory: [{
    fromLevel: Number,
    toLevel: Number,
    gainedExp: Number,
    achievedAt: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userStatsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：计算升级所需经验
userStatsSchema.statics.getExpForLevel = function (level) {
  // 公式：50 + (level - 1) * 25
  // Lv.1: 50, Lv.2: 75, Lv.3: 100, Lv.10: 275, Lv.20: 525, Lv.50: 1275
  return 50 + (level - 1) * 25;
};

// 静态方法：计算累计到某级所需总经验
userStatsSchema.statics.getTotalExpForLevel = function (level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += this.getExpForLevel(i);
  }
  return total;
};

// 实例方法：检查是否可升级
userStatsSchema.methods.checkLevelUp = function () {
  const expNeeded = this.constructor.getExpForLevel(this.level);
  if (this.exp >= expNeeded) {
    return true;
  }
  return false;
};

// 实例方法：执行升级
userStatsSchema.methods.performLevelUp = function () {
  let leveledUp = false;
  const oldLevel = this.level;
  
  while (this.exp >= this.constructor.getExpForLevel(this.level)) {
    this.exp -= this.constructor.getExpForLevel(this.level);
    this.level += 1;
    leveledUp = true;
  }
  
  if (leveledUp) {
    // 更新头衔
    this.title = this.constructor.getTitleForLevel(this.level);
    
    // 记录升级历史（保留最近10条）
    this.levelUpHistory.push({
      fromLevel: oldLevel,
      toLevel: this.level,
      gainedExp: this.totalExp - (this.levelUpHistory[this.levelUpHistory.length - 1]?.gainedExp || 0),
    });
    if (this.levelUpHistory.length > 10) {
      this.levelUpHistory = this.levelUpHistory.slice(-10);
    }
  }
  
  return leveledUp;
};

// 静态方法：根据等级获取头衔
userStatsSchema.statics.getTitleForLevel = function (level) {
  const titles = [
    { maxLevel: 4, title: '🌱 初入万物' },
    { maxLevel: 9, title: '📜 阁中散人' },
    { maxLevel: 14, title: '🖋️ 执笔书生' },
    { maxLevel: 19, title: '🎭 戏梦人' },
    { maxLevel: 29, title: '⭐ 星河客' },
    { maxLevel: 39, title: '🌙 月下仙' },
    { maxLevel: 49, title: '☀️ 日照君' },
    { maxLevel: Infinity, title: '👑 万物之主' },
  ];
  
  for (const t of titles) {
    if (level <= t.maxLevel) {
      return t.title;
    }
  }
  return '🌱 初入万物';
};

module.exports = mongoose.model('UserStats', userStatsSchema);