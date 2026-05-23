const mongoose = require('mongoose');
const ShopItem = require('../models/ShopItem');
require('dotenv').config();

const frames = [
  {
    name: '恶化羽',
    type: 'avatarFrame',
    price: 300,
    currency: 'diamonds',
    rarity: 'legendary',
    image: '/frames/demon.png',
    previewImage: '/frames/demon.png',
    description: '暗黑恶化羽毛边框',
    isActive: true
  },
  {
    name: '星辰之环',
    type: 'avatarFrame',
    price: 100,
    currency: 'diamonds',
    rarity: 'epic',
    image: '/frames/frame_star.png',
    previewImage: '/frames/frame_star.png',
    description: '星辰环绕的梦幻边框',
    isActive: true
  },
  {
    name: '樱花边框',
    type: 'avatarFrame',
    price: 50,
    currency: 'diamonds',
    rarity: 'rare',
    image: '/frames/frame_sakura.png',
    previewImage: '/frames/frame_sakura.png',
    description: '粉色樱花飞舞的边框',
    isActive: true
  },
  {
    name: '紫缎星轨',
    type: 'avatarFrame',
    price: 300,
    currency: 'diamonds',
    rarity: 'legendary',
    image: '/frames/purple.png',
    previewImage: '/frames/purple.png',
    description: '紫色缎面星轨边框',
    isActive: true
  },
  {
    name: '简约边框',
    type: 'avatarFrame',
    price: 20,
    currency: 'coins',
    rarity: 'common',
    image: '/frames/frame_simple.png',
    previewImage: '/frames/frame_simple.png',
    description: '简约线条边框',
    isActive: true
  },
];

async function init() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    for (const frame of frames) {
      const existing = await ShopItem.findOne({ name: frame.name });
      if (!existing) {
        await ShopItem.create(frame);
        console.log(`✅ 添加: ${frame.name}`);
      } else {
        console.log(`⏭️ 跳过: ${frame.name} (已存在)`);
      }
    }
    
    console.log('初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

init();