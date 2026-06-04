// server/src/scripts/fix-paid-diamonds.js
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const RedemptionRecord = require('../models/RedemptionRecord');

async function fixPaidDiamonds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 获取所有有充值记录的用户
    const records = await RedemptionRecord.aggregate([
      {
        $group: {
          _id: '$userId',
          totalPaid: { $sum: '$diamondAmount' }
        }
      }
    ]);

    console.log(`📊 找到 ${records.length} 个有充值记录的用户`);

    let updatedCount = 0;
    for (const record of records) {
      const user = await User.findById(record._id);
      if (user) {
        const oldPaid = user.paidDiamonds || 0;
        const newPaid = record.totalPaid;
        
        user.paidDiamonds = newPaid;
        // 总钻石 = 充值钻石 + 免费钻石
        user.diamonds = newPaid + (user.freeDiamonds || 0);
        await user.save();
        
        console.log(`  ✅ ${user.username}: 充值钻石 ${oldPaid} → ${newPaid}`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 修复完成！更新了 ${updatedCount} 个用户`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixPaidDiamonds();