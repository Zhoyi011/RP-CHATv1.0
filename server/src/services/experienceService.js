// server/src/services/experienceService.js
const UserStats = require('../models/UserStats');
const Persona = require('../models/Persona');
const { getIo } = require('../utils/socketHelper');

// ========== 经验配置 ==========
const EXP_CONFIG = {
  // 每日上限
  DAILY_LIMIT: 100,
  // 各行为经验值
  REWARDS: {
    SEND_MESSAGE: 1,
    SEND_AUDIO: 3,
    SHARE_MUSIC: 5,
    PUBLISH_CHAPTER: 20,
    GOT_FAVORITE: 2,
    GOT_DONATION_PER_DIAMOND: 5,
    DAILY_SIGN_IN: 15,
    GIFT_SENT: 3,
    RED_PACKET_CLAIMED: 1,
    TIANYIGE_EXPLORE: 10,
  },
  // 公频消息经验减半
  PUBLIC_SQUARE_MULTIPLIER: 0.5,
};

/**
 * 添加经验值
 * @param {string} personaId - 角色ID
 * @param {string} userId - 用户ID
 * @param {string} action - 行为类型 (SEND_MESSAGE, PUBLISH_CHAPTER, etc.)
 * @param {number} amount - 经验值数量（可选，不传则使用配置）
 * @param {object} options - 额外选项 { isPublicSquare: boolean, isRecalled: boolean }
 * @returns {Promise<{ expGained: number, leveledUp: boolean, newLevel: number, newTitle: string }>}
 */
async function addExp(personaId, userId, action, amount = null, options = {}) {
  if (!personaId || !userId) {
    console.warn('⚠️ [Experience] 缺少 personaId 或 userId');
    return { expGained: 0, leveledUp: false };
  }

  // 检查角色是否存在
  const persona = await Persona.findById(personaId);
  if (!persona) {
    console.warn(`⚠️ [Experience] 角色不存在: ${personaId}`);
    return { expGained: 0, leveledUp: false };
  }

  // 获取配置的经验值
  let expAmount = amount;
  if (expAmount === null) {
    expAmount = EXP_CONFIG.REWARDS[action] || 1;
  }

  // 公频消息经验减半
  if (options.isPublicSquare) {
    expAmount = Math.floor(expAmount * EXP_CONFIG.PUBLIC_SQUARE_MULTIPLIER);
  }

  // 最小经验为 1
  if (expAmount < 1) expAmount = 1;

  // 查找或创建 UserStats
  let stats = await UserStats.findOne({ personaId });
  if (!stats) {
    stats = new UserStats({
      userId,
      personaId,
      exp: 0,
      level: 1,
      totalExp: 0,
      dailyExpGained: 0,
      title: '🌱 初入万物',
    });
  }

  // 检查是否需要重置每日经验
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!stats.lastDailyReset || new Date(stats.lastDailyReset) < today) {
    stats.dailyExpGained = 0;
    stats.lastDailyReset = new Date();
  }

  // 检查每日上限
  const remainingDaily = EXP_CONFIG.DAILY_LIMIT - stats.dailyExpGained;
  if (remainingDaily <= 0) {
    return { expGained: 0, leveledUp: false, reason: 'daily_limit_reached' };
  }

  // 实际可获得经验（不超过每日剩余）
  const actualExp = Math.min(expAmount, remainingDaily);

  // 增加经验
  stats.exp += actualExp;
  stats.totalExp += actualExp;
  stats.dailyExpGained += actualExp;

  // 检查升级
  let leveledUp = false;
  let oldLevel = stats.level;
  let oldTitle = stats.title;

  while (stats.exp >= UserStats.getExpForLevel(stats.level)) {
    stats.exp -= UserStats.getExpForLevel(stats.level);
    stats.level += 1;
    leveledUp = true;
  }

  // 更新头衔
  const newTitle = UserStats.getTitleForLevel(stats.level);
  if (newTitle !== stats.title) {
    stats.title = newTitle;
    // 记录解锁的头衔
    if (!stats.unlockedTitles.includes(newTitle)) {
      stats.unlockedTitles.push(newTitle);
    }
  }

  // 如果升级了，记录升级历史
  if (leveledUp) {
    stats.levelUpHistory.push({
      fromLevel: oldLevel,
      toLevel: stats.level,
      gainedExp: actualExp,
    });
    if (stats.levelUpHistory.length > 10) {
      stats.levelUpHistory = stats.levelUpHistory.slice(-10);
    }

    // 更新 Persona 缓存
    await Persona.findByIdAndUpdate(personaId, {
      level: stats.level,
      exp: stats.exp,
      title: stats.title,
    });
  } else {
    // 即使没有升级，也更新 Persona 缓存（经验值可能变化）
    await Persona.findByIdAndUpdate(personaId, {
      level: stats.level,
      exp: stats.exp,
      title: stats.title,
    });
  }

  await stats.save();

  // 广播等级变更
  if (leveledUp) {
    const io = getIo();
    if (io) {
      io.emit('persona-level-up', {
        personaId: personaId,
        userId: userId,
        oldLevel: oldLevel,
        newLevel: stats.level,
        oldTitle: oldTitle,
        newTitle: stats.title,
        personaName: persona.displayName || persona.name,
        avatar: persona.avatar,
      });
      // 也发送给用户个人房间
      io.to(`user:${userId}`).emit('persona-level-up', {
        personaId: personaId,
        userId: userId,
        oldLevel: oldLevel,
        newLevel: stats.level,
        oldTitle: oldTitle,
        newTitle: stats.title,
        personaName: persona.displayName || persona.name,
        avatar: persona.avatar,
      });
    }
  }

  return {
    expGained: actualExp,
    leveledUp,
    oldLevel,
    newLevel: stats.level,
    oldTitle,
    newTitle: stats.title,
    totalExp: stats.totalExp,
    expNeeded: UserStats.getExpForLevel(stats.level),
  };
}

/**
 * 获取角色统计数据
 * @param {string} personaId
 * @returns {Promise<object>}
 */
async function getStats(personaId) {
  const stats = await UserStats.findOne({ personaId });
  if (!stats) {
    return {
      level: 1,
      exp: 0,
      totalExp: 0,
      expNeeded: UserStats.getExpForLevel(1),
      title: '🌱 初入万物',
      unlockedTitles: [],
      dailyExpGained: 0,
      dailyLimit: EXP_CONFIG.DAILY_LIMIT,
    };
  }

  // 检查每日重置
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!stats.lastDailyReset || new Date(stats.lastDailyReset) < today) {
    stats.dailyExpGained = 0;
    await stats.save();
  }

  return {
    level: stats.level,
    exp: stats.exp,
    totalExp: stats.totalExp,
    expNeeded: UserStats.getExpForLevel(stats.level),
    title: stats.title,
    unlockedTitles: stats.unlockedTitles || [],
    dailyExpGained: stats.dailyExpGained,
    dailyLimit: EXP_CONFIG.DAILY_LIMIT,
    levelUpHistory: stats.levelUpHistory || [],
  };
}

/**
 * 获取角色排行榜（按等级/经验）
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getLeaderboard(limit = 50) {
  const stats = await UserStats.find()
    .sort({ level: -1, exp: -1 })
    .limit(limit)
    .populate('personaId', 'name displayName avatar');
  
  return stats.map((s, index) => ({
    rank: index + 1,
    personaId: s.personaId?._id,
    personaName: s.personaId?.displayName || s.personaId?.name || '未知',
    avatar: s.personaId?.avatar || '',
    level: s.level,
    exp: s.exp,
    totalExp: s.totalExp,
    title: s.title,
  }));
}

module.exports = {
  addExp,
  getStats,
  getLeaderboard,
  EXP_CONFIG,
};