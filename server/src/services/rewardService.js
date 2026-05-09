const RewardRule = require('../models/RewardRule');
const User = require('../models/User');

class RewardService {
  // 获取所有活跃规则
  async getActiveRules() {
    return RewardRule.find({ isActive: true });
  }
  
  // 检查并发放每日登录奖励
  async checkDailyLogin(userId) {
    const user = await User.findById(userId);
    if (!user) return null;
    
    const today = new Date().toDateString();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toDateString() : null;
    
    // 检查今日是否已领取
    if (lastLogin === today) {
      return { claimed: false, reason: '今日已领取过' };
    }
    
    // 计算连续登录天数
    let streak = user.loginStreak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastLogin === yesterday.toDateString()) {
      streak++;
    } else {
      streak = 1;
    }
    
    // 计算奖励金额（基础 + 连续加成）
    const baseReward = 50;
    const streakBonus = Math.min(200, Math.floor(streak / 3) * 20);
    const reward = baseReward + streakBonus;
    
    // 发放奖励
    const result = await user.addCoins(
      reward,
      'daily_login',
      `每日登录奖励 (连续${streak}天)`,
      { streak, baseReward, streakBonus }
    );
    
    // 更新用户登录信息
    user.loginStreak = streak;
    user.lastLogin = new Date();
    await user.save();
    
    return { 
      claimed: true, 
      reward, 
      streak,
      newBalance: result.newBalance 
    };
  }
  
  // 检查消息奖励（每10条消息奖励一次）
  async checkMessageReward(userId) {
    const user = await User.findById(userId);
    if (!user) return null;
    
    // 获取今日消息数（需要配合消息统计）
    const Message = require('../models/Message');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messageCount = await Message.countDocuments({
      userId: user._id,
      createdAt: { $gte: today }
    });
    
    // 每10条消息奖励5金币
    const rewardAmount = Math.floor(messageCount / 10) * 5;
    const lastRewardMsg = user.lastMessageReward || 0;
    const newRewards = Math.floor(messageCount / 10) - lastRewardMsg;
    
    if (newRewards > 0) {
      const reward = newRewards * 5;
      await user.addCoins(
        reward,
        'message',
        `发言奖励 (${newRewards * 10}条消息)`,
        { messageCount, rewardCount: newRewards }
      );
      
      user.lastMessageReward = Math.floor(messageCount / 10);
      await user.save();
      
      return { claimed: true, reward };
    }
    
    return { claimed: false };
  }
  
  // 初始化默认奖励规则
  async initDefaultRules() {
    const rules = [
      { name: 'daily_login', type: 'daily_login', condition: { type: 'first_login' }, reward: 50, cooldown: 86400 },
      { name: 'message_10', type: 'message_count', condition: { count: 10 }, reward: 5, cooldown: 0 },
      { name: 'message_100', type: 'message_count', condition: { count: 100 }, reward: 50, cooldown: 0 },
      { name: 'invite_1', type: 'invite_count', condition: { count: 1 }, reward: 100, cooldown: 0 },
    ];
    
    for (const rule of rules) {
      await RewardRule.findOneAndUpdate(
        { name: rule.name },
        rule,
        { upsert: true }
      );
    }
  }
}

module.exports = new RewardService();