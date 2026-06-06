// server/src/services/diamondService.js
const User = require('../models/User');
const TransactionRecord = require('../models/TransactionRecord');

class DiamondService {
  /**
   * 添加充值钻石
   */
  static async addPaidDiamonds(userId, amount, relatedId = null, description = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    
    const beforeBalance = user.getTotalDiamonds();
    const beforePaid = user.paidDiamonds || 0;
    
    await user.addPaidDiamonds(amount);
    
    // 记录交易
    const record = new TransactionRecord({
      userId,
      type: 'recharge',
      amount: amount,
      diamondType: 'paid',
      description: description || `充值获得 ${amount} 钻石`,
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
   */
  static async addFreeDiamonds(userId, amount, type = 'daily_sign', relatedId = null, description = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    
    const beforeBalance = user.getTotalDiamonds();
    
    await user.addFreeDiamonds(amount);
    
    // 记录交易
    const typeMap = {
      'daily_sign': 'daily_sign',
      'redpacket_receive': 'redpacket_receive',
      'gift_receive': 'gift_receive',
      'admin_add': 'admin_add'
    };
    
    const record = new TransactionRecord({
      userId,
      type: typeMap[type] || 'daily_sign',
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
    
    const beforeBalance = user.getTotalDiamonds();
    const beforePaid = user.paidDiamonds || 0;
    const beforeFree = user.freeDiamonds || 0;
    
    await user.deductDiamonds(amount, requirePaid);
    
    // 记录交易
    const typeMap = {
      'shop_buy': 'shop_buy',
      'redpacket_send': 'redpacket_send',
      'gift_send': 'gift_send'
    };
    
    const record = new TransactionRecord({
      userId,
      type: typeMap[type] || 'shop_buy',
      amount: -amount,  // 负数表示支出
      diamondType: requirePaid ? 'paid' : (beforePaid > beforePaid - amount ? 'paid' : 'free'),
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
   * 获取用户交易记录
   */
  static async getTransactions(userId, limit = 50, offset = 0) {
    return await TransactionRecord.getUserTransactions(userId, limit, offset);
  }

  /**
   * 获取用户交易统计
   */
  static async getTransactionStats(userId) {
    return await TransactionRecord.getUserStats(userId);
  }
}

module.exports = DiamondService;