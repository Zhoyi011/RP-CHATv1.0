/**
 * 一键修复健康检查发现的问题
 * 运行: node src/scripts/fix-issues.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixIssues() {
  console.log('\n🔧 开始修复系统问题...\n');
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 数据库连接成功\n');

  // 1. 修复孤儿消息
  console.log('📋 修复孤儿消息...');
  const orphanedMessages = await mongoose.connection.db.collection('messages').aggregate([
    { $lookup: { from: 'rooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
    { $match: { room: { $size: 0 } } }
  ]).toArray();
  
  if (orphanedMessages.length > 0) {
    const ids = orphanedMessages.map(m => m._id);
    await mongoose.connection.db.collection('messages').deleteMany({ _id: { $in: ids } });
    console.log(`  ✅ 删除了 ${orphanedMessages.length} 条孤儿消息`);
  } else {
    console.log(`  ✅ 没有孤儿消息`);
  }

  // 2. 修复缺少 displayName 的角色
  console.log('\n📋 修复角色 displayName...');
  const result = await mongoose.connection.db.collection('personas').updateMany(
    { $or: [{ displayName: null }, { displayName: "" }], status: "approved" },
    { $set: { displayName: { $concat: ["$name", ""] } } }
  );
  console.log(`  ✅ 更新了 ${result.modifiedCount} 个角色`);

  // 3. 修复孤儿 PersonaRoom
  console.log('\n📋 修复孤儿 PersonaRoom...');
  const orphanedPR = await mongoose.connection.db.collection('personarooms').aggregate([
    { $lookup: { from: 'personas', localField: 'personaId', foreignField: '_id', as: 'persona' } },
    { $match: { persona: { $size: 0 } } }
  ]).toArray();
  
  if (orphanedPR.length > 0) {
    const ids = orphanedPR.map(p => p._id);
    await mongoose.connection.db.collection('personarooms').deleteMany({ _id: { $in: ids } });
    console.log(`  ✅ 删除了 ${orphanedPR.length} 个孤儿 PersonaRoom`);
  } else {
    console.log(`  ✅ 没有孤儿 PersonaRoom`);
  }

  // 4. 修复过期邀请码
  console.log('\n📋 修复过期邀请码...');
  const expiredResult = await mongoose.connection.db.collection('invitecodes').updateMany(
    { isActive: true, usedBy: null, expiresAt: { $lt: new Date() } },
    { $set: { isActive: false } }
  );
  console.log(`  ✅ 更新了 ${expiredResult.modifiedCount} 个过期邀请码`);

  console.log('\n🎉 修复完成！\n');
  await mongoose.disconnect();
}

fixIssues().catch(console.error);