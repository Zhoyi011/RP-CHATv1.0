const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dz8luzlsg',
  api_key: process.env.CLOUDINARY_API_KEY || '362136848179316',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'iXWuEwbA0IOJPFP6q4FLi6Bwg8M'
});

// 配置存储
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rp-chat/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const type = req.params?.type || req.body?.type || 'user';
      return `${type}-${req.userId}-${uniqueSuffix}`;
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 删除旧头像
const deleteOldAvatar = async (oldUrl) => {
  if (!oldUrl) return;
  
  try {
    // 从 URL 中提取 public_id
    // 例如: https://res.cloudinary.com/.../rp-chat/avatars/user-xxx.jpg
    const parts = oldUrl.split('/');
    const filename = parts.pop().split('.')[0];
    const folder = parts.slice(-2).join('/'); // "rp-chat/avatars"
    const publicId = `${folder}/${filename}`;
    
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ 已删除旧头像: ${publicId}`);
  } catch (error) {
    console.error('删除旧头像失败:', error);
  }
};

module.exports = { upload, deleteOldAvatar };