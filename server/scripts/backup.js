// server/scripts/backup.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups');
const DATE = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

// 创建备份目录
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backup() {
  console.log('🔄 开始备份数据库...');
  
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取所有集合名称
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};
    let totalRecords = 0;
    
    for (const collection of collections) {
      const name = collection.name;
      const data = await mongoose.connection.db.collection(name).find({}).toArray();
      backupData[name] = data;
      totalRecords += data.length;
      console.log(`  ✅ 备份集合: ${name} (${data.length} 条记录)`);
    }
    
    // 保存为 JSON 文件
    const outputPath = path.join(BACKUP_DIR, `backup-${DATE}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));
    
    // 计算文件大小
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ 备份成功: ${outputPath}`);
    console.log(`📊 统计: ${collections.length} 个集合, ${totalRecords} 条记录, ${fileSizeMB} MB`);
    
    // 删除 7 天前的旧备份
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < sevenDaysAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ 删除旧备份: ${file}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ 已删除 ${deletedCount} 个旧备份`);
    }
    
    console.log('🎉 备份完成！');
    
  } catch (error) {
    console.error('❌ 备份失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

backup();