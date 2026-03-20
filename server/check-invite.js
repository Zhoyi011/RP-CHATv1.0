const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkInvite() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ 连接数据库成功');
    
    const db = client.db('rpchat');
    
    // 1. 查看所有集合
    const collections = await db.listCollections().toArray();
    console.log('📚 现有集合:', collections.map(c => c.name));
    
    // 2. 查看 users 集合
    const users = await db.collection('users').find().toArray();
    console.log('👤 用户列表:');
    users.forEach(u => {
      console.log(`  - ${u.username} (ID: ${u._id})`);
    });
    
    // 3. 查看 invitecodes 集合
    const invites = await db.collection('invitecodes').find().toArray();
    console.log('🔑 邀请码列表:');
    if (invites.length === 0) {
      console.log('  (没有邀请码)');
    } else {
      invites.forEach(i => {
        console.log(`  - ${i.code} (有效: ${i.isActive}, 过期: ${i.expiresAt})`);
      });
    }
    
    // 4. 尝试直接插入一个
    console.log('\n🔄 尝试插入新邀请码...');
    
    const admin = users.find(u => u.username === 'admin');
    if (admin) {
      const result = await db.collection('invitecodes').insertOne({
        code: 'TEST999',
        createdBy: admin._id,
        usedBy: null,
        expiresAt: new Date('2025-12-31'),
        isActive: true,
        createdAt: new Date()
      });
      console.log('✅ 插入成功，ID:', result.insertedId);
      
      // 验证
      const test = await db.collection('invitecodes').findOne({ code: 'TEST999' });
      console.log('✅ 验证成功，邀请码 TEST999 可用');
    } else {
      console.log('❌ 找不到 admin 用户');
    }
    
  } catch (error) {
    console.error('❌ 失败:', error);
  } finally {
    await client.close();
  }
}

checkInvite();