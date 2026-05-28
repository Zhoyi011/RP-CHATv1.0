// server/src/scripts/fix-persona-data-raw.js
require('dotenv').config();
const mongoose = require('mongoose');

async function fixPersonaData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const db = mongoose.connection.db;
    const personas = db.collection('personas');
    
    // 1. 修复 equipped 字段（将空字符串改为 null）
    const result1 = await personas.updateMany(
      { 'equipped.avatarFrame': '' },
      { $set: { 'equipped.avatarFrame': null } }
    );
    console.log(`✅ 修复 avatarFrame: ${result1.modifiedCount} 条`);
    
    const result2 = await personas.updateMany(
      { 'equipped.ring': '' },
      { $set: { 'equipped.ring': null } }
    );
    console.log(`✅ 修复 ring: ${result2.modifiedCount} 条`);
    
    const result3 = await personas.updateMany(
      { 'equipped.relationshipCard': '' },
      { $set: { 'equipped.relationshipCard': null } }
    );
    console.log(`✅ 修复 relationshipCard: ${result3.modifiedCount} 条`);
    
    // 2. 修复缺少 createdBy 的角色（用 userId 填充）
    const missingCreatedBy = await personas.find({ 
      createdBy: { $exists: false },
      userId: { $exists: true }
    }).toArray();
    console.log(`找到 ${missingCreatedBy.length} 个缺少 createdBy 的角色`);
    
    for (const persona of missingCreatedBy) {
      await personas.updateOne(
        { _id: persona._id },
        { $set: { createdBy: persona.userId } }
      );
      console.log(`  ✅ 修复角色 ${persona.name}: createdBy = ${persona.userId}`);
    }
    
    // 3. 初始化全局编号
    console.log('\n📊 开始初始化全局编号...');
    const approvedPersonas = await personas.find({ status: 'approved' })
      .sort({ createdAt: 1 })
      .toArray();
    console.log(`找到 ${approvedPersonas.length} 个已审核角色`);
    
    let counter = 1;
    for (const persona of approvedPersonas) {
      if (!persona.globalNumber) {
        await personas.updateOne(
          { _id: persona._id },
          { $set: { globalNumber: counter } }
        );
        console.log(`  设置 ${persona.name} 的全局编号为 ${counter}`);
        counter++;
      }
    }
    
    console.log(`\n✅ 完成！共设置 ${counter - 1} 个角色的全局编号`);
    
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  } catch (error) {
    console.error('修复失败:', error);
  }
}

fixPersonaData();