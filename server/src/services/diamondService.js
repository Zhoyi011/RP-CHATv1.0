// server/src/services/diamondService.js
const User = require('../models/User');

class DiamondService {
  /**
   * 添加充值钻石
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   */
  static async addPaidDiamonds(userId, amount) {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    await user.addPaidDiamonds(amount);
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds()
    };
  }

  /**
   * 添加免费钻石
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   */
  static async addFreeDiamonds(userId, amount) {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    await user.addFreeDiamonds(amount);
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds()
    };
  }

  /**
   * 扣除钻石
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   * @param {boolean} requirePaid - 是否只能用充值钻石
   */
  static async deductDiamonds(userId, amount, requirePaid = false) {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    await user.deductDiamonds(amount, requirePaid);
    return {
      paidDiamonds: user.paidDiamonds,
      freeDiamonds: user.freeDiamonds,
      total: user.getTotalDiamonds()
    };
  }

  /**
   * 检查是否有足够充值钻石
   * @param {string} userId - 用户ID
   * @param {number} amount - 金额
   */
  static async hasEnoughPaidDiamonds(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return false;
    return user.hasEnoughPaidDiamonds(amount);
  }

  /**
   * 获取用户钻石余额
   * @param {string} userId - 用户ID
   */
  static async getBalance(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('用户不存在');
    return {
      paidDiamonds: user.paidDiamonds || 0,
      freeDiamonds: user.freeDiamonds || 0,
      total: user.getTotalDiamonds()
    };
  }
}

module.exports = DiamondService;