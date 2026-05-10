require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const PersonaRoom = require('../models/PersonaRoom');
const ActivePersona = require('../models/ActivePersona');
const User = require('../models/User');

async function fixRoomOwner() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');
    
    // 1. 找到你的用户
    const user = await User.findOne({ email: 'zhoyilee@gmail.com' });
    if (!user) {
      console.log('❌ 未找到用户');
      return;
    }
    console.log(`👤 用户: ${user.email}, ID: ${user._id}`);
    
    // 2. 找到你的激活角色
    const active = await ActivePersona.findOne({ userId: user._id }).populate('personaId');
    if (!active || !active.personaId) {
      console.log('❌ 没有激活的角色');
      return;
    }
    console.log(`🎭 激活角色: ${active.personaId.name}, ID: ${active.personaId._id}`);
    
    // 3. 找到你创建的房间
    const rooms = await Room.find({ createdBy: user._id });
    console.log(`📊 找到 ${rooms.length} 个房间`);
    
    let fixedCount = 0;
    
    for (const room of rooms) {
      console.log(`\n📌 处理房间: ${room.name} (${room._id})`);
      
      // 检查 PersonaRoom 是否存在
      const existing = await PersonaRoom.findOne({
        personaId: active.personaId._id,
        roomId: room._id
      });
      
      if (!existing) {
        // 创建 PersonaRoom 关联
        await PersonaRoom.create({
          personaId: active.personaId._id,
          roomId: room._id,
          role: 'owner',
          joinedAt: new Date()
        });
        console.log(`  ✅ 创建 PersonaRoom 关联`);
        fixedCount++;
      } else {
        console.log(`  ✅ PersonaRoom 已存在，角色: ${existing.role}`);
        
        // 确保角色是 owner
        if (existing.role !== 'owner') {
          existing.role = 'owner';
          await existing.save();
          console.log(`  ✅ 更新角色为 owner`);
        }
      }
      
      // 检查 room.members 中是否有群主记录
      const memberExists = room.members.some(m => 
        m.personaId && m.personaId.toString() === active.personaId._id.toString()
      );
      
      if (!memberExists) {
        room.members.push({
          userId: user._id,
          personaId: active.personaId._id,
          role: 'owner',
          joinedAt: new Date()
        });
        await room.save();
        console.log(`  ✅ 添加群主到 room.members`);
      }
    }
    
    console.log(`\n🎉 完成！修复了 ${fixedCount} 个房间`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixRoomOwner();