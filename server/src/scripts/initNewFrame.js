const mongoose = require('mongoose');
const ShopItem = require('../models/ShopItem');
require('dotenv').config();

async function initCatFrame() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接数据库成功');

    const catFrame = {
      name: '猫咪头像框',
      type: 'avatarFrame',
      price: 10,
      currency: 'diamonds',
      rarity: 'rare',
      image: '/frames/cat.png',
      previewImage: '/frames/cat.png',
      description: '可爱的猫咪头像框',
      isActive: true
    };

    // 检查是否已存在
    const existing = await ShopItem.findOne({ name: '猫咪头像框' });
    if (existing) {
      console.log('⚠️ 猫咪头像框已存在，跳过创建');
      process.exit(0);
    }

    await ShopItem.create(catFrame);
    console.log('✅ 成功添加猫咪头像框！');
    console.log('图片路径: /frames/cat.png');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

initCatFrame();