// server/src/services/diamondService.js
const User = require('../models/User');
const TransactionRecord = require('../models/TransactionRecord');

class DiamondService {
  /**
   * 添加充值钻石（红包获得的钻石也用这个）
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   * @param {string} relatedId - 关联ID
   * @param {string} description - 描述
   * @param {string} type - 交易类型 (recharge, redpacket_receive, gift_receive, refund)
   */
  static async addPaidDiamonds(userId, amount, relatedId = null, description = '', type = 'recharge') {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    
    await user.addPaidDiamonds(amount);
    
    // 记录交易
    const record = new TransactionRecord({
      userId,
      type: type,  // 🔥 使用传入的 type
      amount: amount,
      diamondType: 'paid',
      description: description || `获得 ${amount} 钻石`,
      relatedId,
      balanceAfter: user.getTotalDiamonds()
    });
    await record.save();
    
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds(),
      record
    };
  }

  /**
   * 添加免费钻石
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   * @param {string} type - 交易类型 (daily_sign, gift_receive, admin_add)
   * @param {string} relatedId - 关联ID
   * @param {string} description - 描述
   */
  static async addFreeDiamonds(userId, amount, type = 'daily_sign', relatedId = null, description = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    
    await user.addFreeDiamonds(amount);
    
    const record = new TransactionRecord({
      userId,
      type: type,
      amount: amount,
      diamondType: 'free',
      description: description || `获得 ${amount} 钻石`,
      relatedId,
      balanceAfter: user.getTotalDiamonds()
    });
    await record.save();
    
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds(),
      record
    };
  }

  /**
   * 扣除钻石
   */
  static async deductDiamonds(userId, amount, requirePaid = false, type = 'shop_buy', relatedId = null, description = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    
    const beforePaid = user.paidDiamonds || 0;
    const beforeFree = user.freeDiamonds || 0;
    
    await user.deductDiamonds(amount, requirePaid);
    
    // 判断实际扣除的钻石类型
    let deductedFrom = 'free';
    if (requirePaid) {
      deductedFrom = 'paid';
    } else {
      // 优先扣免费钻石，所以如果免费钻石足够，则从免费扣除
      const freeAmount = Math.min(beforeFree, amount);
      if (freeAmount >= amount) {
        deductedFrom = 'free';
      } else {
        deductedFrom = 'paid';
      }
    }
    
    const record = new TransactionRecord({
      userId,
      type: type,
      amount: -amount,
      diamondType: deductedFrom,
      description: description || `消费 ${amount} 钻石`,
      relatedId,
      balanceAfter: user.getTotalDiamonds()
    });
    await record.save();
    
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds(),
      record
    };
  }

  /**
   * 检查充值钻石是否足够
   */
  static async hasEnoughPaidDiamonds(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return false;
    return user.hasEnoughPaidDiamonds(amount);
  }

  /**
   * 获取用户交易记录
   */
  static async getTransactions(userId, limit = 50, offset = 0) {
    return await TransactionRecord.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }
}

module.exports = DiamondService;