// server/src/scripts/clear-diamonds.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const RedemptionRecord = require('../models/RedemptionRecord');
const RedeemCode = require('../models/RedeemCode');

async function clearAllDiamonds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 1. 统计清空前
    const beforeStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalDiamonds: { $sum: '$diamonds' },
          totalPaid: { $sum: '$paidDiamonds' },
          totalFree: { $sum: '$freeDiamonds' },
          userCount: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 清空前统计:');
    console.log(`   用户数: ${beforeStats[0]?.userCount || 0}`);
    console.log(`   总钻石: ${beforeStats[0]?.totalDiamonds || 0}`);
    console.log(`   充值钻石: ${beforeStats[0]?.totalPaid || 0}`);
    console.log(`   免费钻石: ${beforeStats[0]?.totalFree || 0}`);

    // 2. 清空所有用户的钻石
    const userResult = await User.updateMany(
      {},
      {
        $set: {
          diamonds: 0,
          paidDiamonds: 0,
          freeDiamonds: 0
        }
      }
    );

    console.log(`\n✅ 钻石清空完成！修改了 ${userResult.modifiedCount} 个用户`);

    // 3. 清空充值记录
    const redemptionResult = await RedemptionRecord.deleteMany({});
    console.log(`✅ 充值记录清空完成！删除了 ${redemptionResult.deletedCount} 条记录`);

    // 4. 可选：清空充值码（或标记为已使用）
    // const codeResult = await RedeemCode.updateMany({}, { $set: { isUsed: true, usedAt: new Date() } });
    // console.log(`✅ 充值码已失效，更新了 ${codeResult.modifiedCount} 个`);

    // 或者直接删除所有充值码
    const codeResult = await RedeemCode.deleteMany({});
    console.log(`✅ 充值码清空完成！删除了 ${codeResult.deletedCount} 个充值码`);

    // 5. 验证清空结果
    const afterStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalDiamonds: { $sum: '$diamonds' },
          totalPaid: { $sum: '$paidDiamonds' },
          totalFree: { $sum: '$freeDiamonds' }
        }
      }
    ]);

    const afterRedemptionCount = await RedemptionRecord.countDocuments();
    const afterCodeCount = await RedeemCode.countDocuments();

    console.log('\n📊 清空后统计:');
    console.log(`   总钻石: ${afterStats[0]?.totalDiamonds || 0}`);
    console.log(`   充值钻石: ${afterStats[0]?.totalPaid || 0}`);
    console.log(`   免费钻石: ${afterStats[0]?.totalFree || 0}`);
    console.log(`   剩余充值记录: ${afterRedemptionCount}`);
    console.log(`   剩余充值码: ${afterCodeCount}`);

    console.log('\n🎉 清空完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清空失败:', error);
    process.exit(1);
  }
}

clearAllDiamonds();