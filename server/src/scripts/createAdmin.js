const mongoose = require('mongoose');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
require('dotenv').config();

async function createAdminAndInvite() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rpchat');
    
    // 检查是否已有管理员
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('管理员已存在，跳过创建');
      return;
    }
    
    // 创建管理员
    const admin = new User({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    });
    
    await admin.save();
    console.log('✅ 管理员创建成功');
    
    // 创建初始邀请码
    const inviteCode = new InviteCode({
      code: 'ADMIN123',
      createdBy: admin._id,
      expiresAt: new Date('2025-12-31'),
      isActive: true
    });
    
    await inviteCode.save();
    console.log('✅ 初始邀请码创建成功: ADMIN123');
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminAndInvite();