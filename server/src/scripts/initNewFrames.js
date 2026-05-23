// server/scripts/uploadFramesToCloudinary.js
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ========== Cloudinary 配置 ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dz8luzlsg',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========== 本地图片文件夹路径 ==========
// 把你的头像框 PNG 文件放在这个文件夹里
const FRAMES_FOLDER = path.join(__dirname, '../public/frames');

// 文件名映射（本地文件名 -> 上传后的公共名称）
const frames = [
  { localName: 'simple.png', publicName: 'simple', displayName: '简约边框', price: 20, rarity: 'common', description: '简约风格边框' },
  { localName: 'star.png', publicName: 'star', displayName: '星辰之环', price: 100, rarity: 'epic', description: '星辰环绕的边框' },
  { localName: 'gold.png', publicName: 'gold', displayName: '金色传说', price: 200, rarity: 'legendary', description: '金色的华丽边框' },
  { localName: 'demon.png', publicName: 'demon', displayName: '恶化羽', price: 300, rarity: 'legendary', description: '暗黑恶化羽毛边框' },
  { localName: 'purple.png', publicName: 'purple', displayName: '紫缎星轨', price: 300, rarity: 'legendary', description: '紫色缎面星轨边框' },
  { localName: 'cat.png', publicName: 'cat', displayName: '猫咪头像框', price: 10, rarity: 'rare', description: '可爱的猫咪头像框' },
  { localName: 'sakura.png', publicName: 'sakura', displayName: '樱花边框', price: 50, rarity: 'rare', description: '粉色樱花边框' },
];

// ========== MongoDB 连接 ==========
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ 数据库连接成功'))
 .catch(err => console.error('❌ 连接失败:', err));

const shopItemSchema = new mongoose.Schema({
  name: String,
  type: String,
  price: Number,
  currency: String,
  rarity: String,
  image: String,
  previewImage: String,
  description: String,
  isActive: { type: Boolean, default: true }
});

const ShopItem = mongoose.model('ShopItem', shopItemSchema);

// ========== 上传图片到 Cloudinary ==========
async function uploadToCloudinary(localPath, publicId) {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'rp-chat-frames',
      public_id: publicId,
      overwrite: true
    });
    console.log(`  ✅ 上传成功: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`  ❌ 上传失败 ${publicId}:`, error.message);
    return null;
  }
}

// ========== 更新数据库 ==========
async function updateDatabase(name, imageUrl, price, rarity, description) {
  const existing = await ShopItem.findOne({ name });
  
  const itemData = {
    name,
    type: 'avatarFrame',
    price,
    currency: 'diamonds',
    rarity,
    image: imageUrl,
    previewImage: imageUrl,
    description,
    isActive: true
  };
  
  if (existing) {
    await ShopItem.updateOne({ name }, itemData);
    console.log(`  📝 更新数据库: ${name}`);
  } else {
    await ShopItem.create(itemData);
    console.log(`  ➕ 新增数据库: ${name}`);
  }
}

// ========== 主流程 ==========
async function main() {
  console.log('🚀 开始批量上传头像框到 Cloudinary...\n');
  
  // 检查文件夹是否存在
  if (!fs.existsSync(FRAMES_FOLDER)) {
    console.error(`❌ 文件夹不存在: ${FRAMES_FOLDER}`);
    console.log('💡 请创建文件夹并把图片放进去');
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (const frame of frames) {
    const localPath = path.join(FRAMES_FOLDER, frame.localName);
    
    // 检查本地文件是否存在
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️ 跳过: ${frame.localName} (文件不存在)`);
      continue;
    }
    
    console.log(`📤 上传: ${frame.localName} -> ${frame.publicName}`);
    
    // 上传到 Cloudinary
    const imageUrl = await uploadToCloudinary(localPath, frame.publicName);
    
    if (imageUrl) {
      // 更新数据库
      await updateDatabase(frame.displayName, imageUrl, frame.price, frame.rarity, frame.description);
      successCount++;
    }
    
    console.log('');
  }
  
  console.log(`🎉 完成！成功上传 ${successCount}/${frames.length} 个头像框`);
  process.exit(0);
}

main();