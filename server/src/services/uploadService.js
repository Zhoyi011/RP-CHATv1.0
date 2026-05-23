const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

// ✅ 支持两种配置方式
if (process.env.CLOUDINARY_URL) {
  // 新版本：使用 CLOUDINARY_URL
  cloudinary.config({
    url: process.env.CLOUDINARY_URL
  });
} else {
  // 旧版本：分开配置
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

console.log('📸 Cloudinary 已配置');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式'), false);
    }
  }
});

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
    
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

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

module.exports = { upload, uploadToCloudinary, deleteOldAvatar };