require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Persona = require('../models/Persona');
const PersonaRoom = require('../models/PersonaRoom');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 已连接');
  
  const rooms = await Room.find({ creatorUserId: { $exists: false } });
  console.log('找到', rooms.length, '个需要修复的房间');
  
  for (const room of rooms) {
    const pr = await PersonaRoom.findOne({ roomId: room._id, role: 'owner' });
    if (pr) {
      const persona = await Persona.findById(pr.personaId);
      if (persona) {
        room.creatorUserId = persona.userId;
        await room.save();
        console.log('✅', room.name, '→ 已修复');
      }
    }
  }
  
  await mongoose.disconnect();
  console.log('✅ 修复完成');
})();