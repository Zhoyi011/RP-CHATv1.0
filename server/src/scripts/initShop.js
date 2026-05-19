const mongoose = require('mongoose');
const ShopItem = require('../models/ShopItem');
require('dotenv').config();

const items = [
  // 头像框
  { name: '金色传说', type: 'avatarFrame', price: 200, rarity: 'legendary', image: '/frames/gold.png', description: '金色的华丽边框' },
  { name: '星辰之环', type: 'avatarFrame', price: 100, rarity: 'epic', image: '/frames/star.png', description: '星辰环绕的边框' },
  { name: '樱花边框', type: 'avatarFrame', price: 50, rarity: 'rare', image: '/frames/sakura.png', description: '粉色樱花边框' },
  { name: '简约边框', type: 'avatarFrame', price: 20, rarity: 'common', image: '/frames/simple.png', description: '简约风格边框' },
  
  // 戒指
  { name: '永恒钻戒', type: 'ring', price: 500, rarity: 'legendary', image: '/rings/diamond.png', description: '闪耀的钻石戒指' },
  { name: '银月之戒', type: 'ring', price: 150, rarity: 'epic', image: '/rings/silver.png', description: '月光般闪耀的银戒' },
  { name: '情侣对戒', type: 'ring', price: 80, rarity: 'rare', image: '/rings/couple.png', description: '情侣款戒指' },
  { name: '铜质戒指', type: 'ring', price: 30, rarity: 'common', image: '/rings/copper.png', description: '简单的铜戒指' },
  
  // 关系卡
  { name: '羁绊之证', type: 'relationshipCard', price: 300, rarity: 'legendary', image: '/cards/bond.png', description: '证明深厚羁绊的卡片' },
  { name: '友谊卡片', type: 'relationshipCard', price: 100, rarity: 'rare', image: '/cards/friend.png', description: '见证友谊的卡片' },
];

async function initShop() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    for (const item of items) {
      const existing = await ShopItem.findOne({ name: item.name });
      if (!existing) {
        await ShopItem.create(item);
        console.log(`Added: ${item.name}`);
      }
    }
    
    console.log('Shop initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

initShop();