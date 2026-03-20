const { MongoClient } = require('mongodb');
require('dotenv').config();

async function forceFix() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ 连接数据库成功');
    
    const db = client.db('rpchat');
    
    // 直接删除整个 invitecodes 集合
    await db.collection('invitecodes').drop().catch(() => console.log('集合不存在，继续...'));
    console.log('✅ 已删除 invitecodes 集合');
    
    // 创建新集合
    await db.createCollection('invitecodes');
    console.log('✅ 已创建新 invitecodes 集合');
    
    // 查找 admin 用户
    const admin = await db.collection('users').findOne({ username: 'admin' });
    console.log('✅ 找到管理员:', admin._id);
    
    // 插入新邀请码
    const result = await db.collection('invitecodes').insertOne({
      code: 'ADMIN123',
      createdBy: admin._id,
      usedBy: null,
      expiresAt: new Date('2025-12-31'),
      isActive: true,
      createdAt: new Date()
    });
    
    console.log('✅ 邀请码创建成功!');
    console.log('邀请码: ADMIN123');
    console.log('插入ID:', result.insertedId);
    
    // 验证
    const check = await db.collection('invitecodes').findOne({ code: 'ADMIN123' });
    console.log('✅ 验证成功:', check ? '存在' : '不存在');
    
  } catch (error) {
    console.error('❌ 失败:', error);
  } finally {
    await client.close();
  }
}

forceFix();