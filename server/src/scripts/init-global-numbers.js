// server/src/scripts/init-global-numbers.js
require('dotenv').config();
const mongoose = require('mongoose');
const Persona = require('../models/Persona');

async function initGlobalNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const personas = await Persona.find({ status: 'approved' }).sort({ createdAt: 1 });
    console.log(`找到 ${personas.length} 个已审核角色`);
    
    let counter = 1;
    for (const persona of personas) {
      if (!persona.globalNumber) {
        persona.globalNumber = counter;
        await persona.save();
        console.log(`设置 ${persona.name} 的全局编号为 ${counter}`);
        counter++;
      }
    }
    
    console.log(`✅ 完成！共设置 ${counter - 1} 个角色的全局编号`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

initGlobalNumbers();