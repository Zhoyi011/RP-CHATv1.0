// server/src/services/redpacketExpireService.js
const RedPacket = require('../models/RedPacket');
const DiamondService = require('./diamondService');

class RedPacketExpireService {
  /**
   * 检查并处理过期红包
   */
  static async checkAndProcessExpiredRedPackets() {
    try {
      const now = new Date();
      
      const expiredRedPackets = await RedPacket.find({
        status: 'active',
        expiresAt: { $lt: now }
      });
      
      let processedCount = 0;
      let refundTotal = 0;
      
      for (const redPacket of expiredRedPackets) {
        if (redPacket.remainingAmount > 0) {
          await DiamondService.addPaidDiamonds(
            redPacket.senderUserId,
            redPacket.remainingAmount,
            redPacket._id,
            `红包过期退款：${redPacket.message || '红包'} 剩余 ${redPacket.remainingAmount} 钻石`
          );
          refundTotal += redPacket.remainingAmount;
          console.log(`✅ 红包过期退款: ${redPacket._id}, 退还 ${redPacket.remainingAmount} 钻石`);
        }
        
        redPacket.status = 'expired';
        await redPacket.save();
        processedCount++;
      }
      
      if (processedCount > 0) {
        console.log(`\n📋 红包过期检查完成:`);
        console.log(`   处理了 ${processedCount} 个过期红包`);
        console.log(`   共退款 ${refundTotal} 钻石\n`);
      }
      
      return { processedCount, refundTotal };
    } catch (error) {
      console.error('❌ 处理过期红包失败:', error);
      return { processedCount: 0, refundTotal: 0, error: error.message };
    }
  }
  
  /**
   * 启动定时任务
   */
  static startSchedule(intervalMinutes = 5) {
    // 立即执行一次
    this.checkAndProcessExpiredRedPackets();
    
    // 定时执行
    setInterval(() => {
      this.checkAndProcessExpiredRedPackets();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`✅ 红包过期检查定时任务已启动（每 ${intervalMinutes} 分钟）`);
  }
}

module.exports = RedPacketExpireService;