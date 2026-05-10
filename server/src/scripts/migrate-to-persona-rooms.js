require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const PersonaRoom = require('../models/PersonaRoom');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');
    
    const rooms = await Room.find();
    console.log(`📊 找到 ${rooms.length} 个房间`);
    
    let created = 0;
    let skipped = 0;
    
    for (const room of rooms) {
      for (const member of room.members) {
        if (!member.personaId) {
          console.log(`⚠️ 跳过: 房间 ${room.name} 成员缺少 personaId`);
          skipped++;
          continue;
        }
        
        // 检查是否已存在
        const exists = await PersonaRoom.findOne({
          personaId: member.personaId,
          roomId: room._id
        });
        
        if (!exists) {
          await PersonaRoom.create({
            personaId: member.personaId,
            roomId: room._id,
            role: member.role || 'member',
            title: member.title || '',
            nickname: member.nickname || '',
            joinedAt: member.joinedAt || new Date()
          });
          created++;
          console.log(`✅ 创建关联: 角色 ${member.personaId} -> 房间 ${room.name}`);
        }
      }
    }
    
    console.log(`🎉 完成！创建了 ${created} 条关联，跳过了 ${skipped} 条`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();