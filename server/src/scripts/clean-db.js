require('dotenv').config();
const mongoose = require('mongoose');

async function cleanDatabase() {
  try {
    console.log('📡 正在连接 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');
    
    // 获取所有集合
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`✅ 清空集合: ${collection.collectionName}`);
    }
    
    console.log('🎉 数据库已完全清空！');
    
  } catch (error) {
    console.error('❌ 清空失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

cleanDatabase();