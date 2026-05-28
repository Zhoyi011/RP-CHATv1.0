// server/src/scripts/fix-persona-data.js
require('dotenv').config();
const mongoose = require('mongoose');
const Persona = require('../models/Persona');

async function fixPersonaData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 1. 修复 equipped 字段（将空字符串改为 null）
    const result1 = await Persona.updateMany(
      { 'equipped.avatarFrame': '' },
      { $set: { 'equipped.avatarFrame': null } }
    );
    console.log(`✅ 修复 avatarFrame: ${result1.modifiedCount} 条`);
    
    const result2 = await Persona.updateMany(
      { 'equipped.ring': '' },
      { $set: { 'equipped.ring': null } }
    );
    console.log(`✅ 修复 ring: ${result2.modifiedCount} 条`);
    
    const result3 = await Persona.updateMany(
      { 'equipped.relationshipCard': '' },
      { $set: { 'equipped.relationshipCard': null } }
    );
    console.log(`✅ 修复 relationshipCard: ${result3.modifiedCount} 条`);
    
    // 2. 修复 createdBy（将缺少 createdBy 的角色补上 userId）
    const missingCreatedBy = await Persona.find({ createdBy: { $exists: false } });
    console.log(`找到 ${missingCreatedBy.length} 个缺少 createdBy 的角色`);
    
    for (const persona of missingCreatedBy) {
      if (persona.userId) {
        persona.createdBy = persona.userId;
        await persona.save();
        console.log(`  ✅ 修复角色 ${persona.name}: createdBy = ${persona.userId}`);
      }
    }
    
    // 3. 初始化全局编号（只对已审核角色）
    console.log('\n📊 开始初始化全局编号...');
    const personas = await Persona.find({ status: 'approved' }).sort({ createdAt: 1 });
    console.log(`找到 ${personas.length} 个已审核角色`);
    
    let counter = 1;
    for (const persona of personas) {
      if (!persona.globalNumber) {
        persona.globalNumber = counter;
        await persona.save();
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