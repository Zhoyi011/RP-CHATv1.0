require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const ActivePersona = require('../models/ActivePersona');

async function fixRoomOwners() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ 未找到 MONGODB_URI 环境变量');
      console.log('请在 .env 文件中设置 MONGODB_URI');
      return;
    }
    
    console.log('📡 正在连接 MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ 连接数据库成功');
    
    const rooms = await Room.find();
    console.log(`📊 找到 ${rooms.length} 个房间`);
    
    let fixedCount = 0;
    
    for (const room of rooms) {
      let needSave = false;
      
      for (const member of room.members) {
        if (member.role === 'owner' && !member.personaId) {
          const activePersona = await ActivePersona.findOne({ userId: member.userId });
          if (activePersona?.personaId) {
            member.personaId = activePersona.personaId;
            needSave = true;
            console.log(`✅ 为群主 ${member.userId} 添加角色 ${activePersona.personaId}`);
          } else {
            console.log(`⚠️ 群主 ${member.userId} 没有激活的角色`);
          }
        }
      }
      
      if (needSave) {
        await room.save();
        fixedCount++;
        console.log(`✅ 修复房间: ${room.name}`);
      }
    }
    
    console.log(`🎉 完成！修复了 ${fixedCount} 个房间`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixRoomOwners();