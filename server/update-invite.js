const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateInvite() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ 连接数据库成功');
    
    const db = client.db('rpchat');
    
    // 更新所有邀请码的过期日期到明年
    const result = await db.collection('invitecodes').updateMany(
      {}, // 匹配所有
      { 
        $set: { 
          expiresAt: new Date('2027-12-31') // 改到2027年
        } 
      }
    );
    
    console.log(`✅ 已更新 ${result.modifiedCount} 个邀请码`);
    
    // 验证
    const invites = await db.collection('invitecodes').find().toArray();
    console.log('📋 当前邀请码:');
    invites.forEach(i => {
      console.log(`  - ${i.code} (过期: ${i.expiresAt})`);
    });
    
  } catch (error) {
    console.error('❌ 失败:', error);
  } finally {
    await client.close();
  }
}

updateInvite();