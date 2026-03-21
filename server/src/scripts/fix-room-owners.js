const mongoose = require('mongoose');
const Room = require('../models/Room');
const ActivePersona = require('../models/ActivePersona');
require('dotenv').config();

async function fixRoomOwners() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');
    
    const rooms = await Room.find();
    console.log(`📊 找到 ${rooms.length} 个房间`);
    
    let fixedCount = 0;
    let ownerFixed = 0;
    
    for (const room of rooms) {
      let needSave = false;
      
      for (const member of room.members) {
        if (!member.personaId) {
          const activePersona = await ActivePersona.findOne({ userId: member.userId });
          if (activePersona?.personaId) {
            member.personaId = activePersona.personaId;
            needSave = true;
            if (member.role === 'owner') ownerFixed++;
            console.log(`  ✅ 为成员 ${member.userId} (${member.role}) 添加角色 ${activePersona.personaId}`);
          } else {
            console.log(`  ⚠️ 成员 ${member.userId} (${member.role}) 没有激活的角色`);
          }
        }
      }
      
      if (needSave) {
        await room.save();
        fixedCount++;
        console.log(`✅ 修复房间: ${room.name}`);
      }
    }
    
    console.log(`🎉 完成！修复了 ${fixedCount} 个房间，其中 ${ownerFixed} 个群主获得了角色`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixRoomOwners();