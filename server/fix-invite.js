const mongoose = require('mongoose');
const InviteCode = require('./src/models/InviteCode');
const User = require('./src/models/User');
require('dotenv').config();

async function fixInvite() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');
    
    // 先删除所有旧的邀请码
    await InviteCode.deleteMany({});
    console.log('✅ 已删除所有旧邀请码');
    
    // 找到管理员
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ 找不到管理员，正在创建管理员...');
      
      // 创建管理员
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const newAdmin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      
      await newAdmin.save();
      console.log('✅ 管理员创建成功');
      
      // 使用新创建的管理员ID
      const adminId = newAdmin._id;
      
      // 创建新邀请码
      const newCode = new InviteCode({
        code: 'ADMIN123',
        createdBy: adminId,
        expiresAt: new Date('2025-12-31'),
        isActive: true
      });
      
      await newCode.save();
      console.log('✅ 新邀请码创建成功: ADMIN123');
      
    } else {
      console.log('✅ 找到管理员:', admin.username);
      
      // 使用找到的管理员ID
      const adminId = admin._id;
      
      // 创建新邀请码
      const newCode = new InviteCode({
        code: 'ADMIN123',
        createdBy: adminId,
        expiresAt: new Date('2025-12-31'),
        isActive: true
      });
      
      await newCode.save();
      console.log('✅ 新邀请码创建成功: ADMIN123');
    }
    
    // 验证邀请码
    const savedCode = await InviteCode.findOne({ code: 'ADMIN123' });
    if (savedCode) {
      console.log('✅ 邀请码验证成功:', savedCode.code);
      console.log('创建者ID:', savedCode.createdBy);
    }
    
  } catch (error) {
    console.error('❌ 失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixInvite();