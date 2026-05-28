// server/src/scripts/fix-global-numbers.js
require('dotenv').config();
const mongoose = require('mongoose');

async function fixGlobalNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const db = mongoose.connection.db;
    const personas = db.collection('personas');
    
    // 1. 先清空所有全局编号
    const clearResult = await personas.updateMany(
      {},
      { $unset: { globalNumber: "" } }
    );
    console.log(`✅ 清空了 ${clearResult.modifiedCount} 个角色的全局编号`);
    
    // 2. 重新设置全局编号（从 1 开始，只对已审核角色）
    console.log('\n📊 开始重新分配全局编号...');
    const approvedPersonas = await personas.find({ status: 'approved' })
      .sort({ createdAt: 1 })
      .toArray();
    console.log(`找到 ${approvedPersonas.length} 个已审核角色`);
    
    let counter = 1;
    for (const persona of approvedPersonas) {
      await personas.updateOne(
        { _id: persona._id },
        { $set: { globalNumber: counter } }
      );
      console.log(`  设置 ${persona.name} 的全局编号为 ${counter}`);
      counter++;
    }
    
    console.log(`\n✅ 完成！共设置 ${counter - 1} 个角色的全局编号`);
    
    // 3. 验证结果
    const verify = await personas.find({}, { name: 1, globalNumber: 1, status: 1 })
      .sort({ globalNumber: 1 })
      .toArray();
    console.log('\n📋 验证结果:');
    verify.forEach(p => {
      console.log(`  ${p.name} → #${p.globalNumber || '无'} (${p.status})`);
    });
    
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  } catch (error) {
    console.error('修复失败:', error);
  }
}

fixGlobalNumbers();