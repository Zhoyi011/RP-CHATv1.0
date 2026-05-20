const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 使用内存存储（不写本地文件）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.mimetype);
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('只支持图片格式 (jpeg, jpg, png, gif, webp)'));
  }
});

// 上传到 Cloudinary
const uploadToCloudinary = (fileBuffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        transformation: [{ width: 300, height: 300, crop: 'limit' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    // 将 buffer 转换为 stream 并写入
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// 删除旧头像
const deleteOldAvatar = async (oldUrl) => {
  if (!oldUrl) return;
  
  try {
    // 从 URL 中提取 public_id
    // URL 格式: https://res.cloudinary.com/.../rp-chat/avatars/xxx.jpg
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

module.exports = { upload, uploadToCloudinary, deleteOldAvatar };