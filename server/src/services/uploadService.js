const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ✅ 新版本：使用 CLOUDINARY_URL 环境变量
cloudinary.config({
  url: process.env.CLOUDINARY_URL || 'cloudinary://你的api_key:你的api_secret@你的cloud_name'
});

// 或者分别配置
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

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

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

const deleteOldAvatar = async (oldUrl) => {
  if (!oldUrl) return;
  try {
    const parts = oldUrl.split('/');
    const filename = parts.pop().split('.')[0];
    const folder = parts.slice(-2).join('/');
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ 已删除旧头像: ${publicId}`);
  } catch (error) {
    console.error('删除旧头像失败:', error);
  }
};

module.exports = { upload, deleteOldAvatar };