// server/src/routes/upload.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Persona = require('../models/Persona');
const { upload, uploadToCloudinary, deleteOldAvatar } = require('../services/uploadService');

// Cloudinary 配置
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 用于音频上传的 multer 配置（增加内存限制）
const audioUpload = require('multer')({ 
  storage: require('multer').memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
});

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// ========== 用户头像 ==========

router.post('/user', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `user-${req.userId}-${uniqueSuffix}`;
    const result = await uploadToCloudinary(req.file.buffer, 'rp-chat/avatars', publicId);
    
    await User.updateOne(
      { _id: req.userId },
      { $set: { avatar: result.secure_url } }
    );
    
    res.json({ 
      success: true, 
      avatar: result.secure_url,
      message: '头像上传成功'
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

router.delete('/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    await User.updateOne(
      { _id: req.userId },
      { $set: { avatar: '' } }
    );
    
    res.json({ success: true, message: '已恢复默认头像' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 角色头像 ==========

router.post('/persona/:personaId', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }
    
    const { personaId } = req.params;
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在或无权限' });
    }
    
    if (persona.avatar) {
      await deleteOldAvatar(persona.avatar);
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `persona-${personaId}-${uniqueSuffix}`;
    const result = await uploadToCloudinary(req.file.buffer, 'rp-chat/avatars', publicId);
    
    await Persona.updateOne(
      { _id: personaId },
      { $set: { avatar: result.secure_url } }
    );
    
    res.json({ 
      success: true, 
      avatar: result.secure_url,
      message: '角色头像上传成功'
    });
  } catch (error) {
    console.error('上传角色头像失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

router.delete('/persona/:personaId', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.params;
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    
    if (!persona) return res.status(404).json({ error: '角色不存在或无权限' });
    
    if (persona.avatar) {
      await deleteOldAvatar(persona.avatar);
    }
    
    await Persona.updateOne(
      { _id: personaId },
      { $set: { avatar: '' } }
    );
    
    res.json({ success: true, message: '已恢复默认头像' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 🎙️ 语音消息上传（强制转为 MP3）==========

router.post('/audio', authMiddleware, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname || 'voice_message';
    
    console.log(`🎙️ 收到音频上传: ${originalName}, 大小: ${fileBuffer.length} bytes`);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `voice-${req.userId}-${uniqueSuffix}`;
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          format: 'mp3',
          folder: 'rp-chat/voice_messages',
          public_id: publicId,
          use_filename: false,
          unique_filename: true,
          overwrite: true,
          audio_codec: 'mp3',
          bit_rate: 48000, // 降低到 48kbps 减小文件大小
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary 上传错误:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });

    console.log(`✅ 音频上传成功 (MP3): ${result.secure_url}, 大小: ${Math.round(result.bytes / 1024)}KB`);

    res.json({
      success: true,
      url: result.secure_url,
      message: '语音上传成功'
    });
    
  } catch (error) {
    console.error('❌ 音频上传失败:', error);
    res.status(500).json({ 
      error: error.message || '音频上传失败，请重试',
      details: error.message 
    });
  }
});

router.delete('/audio', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供音频 URL' });
    }
    
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `rp-chat/voice_messages/${filename.split('.')[0]}`;
    
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    
    if (result.result === 'ok') {
      res.json({ success: true, message: '音频已删除' });
    } else {
      res.status(404).json({ error: '音频不存在或已删除' });
    }
  } catch (error) {
    console.error('删除音频失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 🎨 表情上传配置（优化版）==========

const EMOJI_CONFIG = {
  folder: 'rp-chat/emojis',
  allowedFormats: ['jpg', 'png', 'gif', 'webp'],
  maxSize: 2 * 1024 * 1024, // 2MB
  gifMaxSize: 5 * 1024 * 1024, // GIF 5MB
  transformation: {
    // 静态图优化
    static: [
      { width: 256, height: 256, crop: 'limit' },  // 限制最大尺寸 256px
      { quality: 'auto:good' },                     // 自动质量（平衡）
      { fetch_format: 'auto' }                      // 自动转 WebP
    ],
    // GIF 优化（保留动画，只压缩大小）
    gif: [
      { width: 256, height: 256, crop: 'limit' },
      { quality: 'auto:good' },
      { flags: 'lossy' }  // 有损压缩 GIF
    ]
  }
};

// 表情上传接口（优化版）
router.post('/emoji', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }

    const isGif = req.file.mimetype === 'image/gif';
    const maxSize = isGif ? EMOJI_CONFIG.gifMaxSize : EMOJI_CONFIG.maxSize;
    
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: isGif ? 'GIF 不能超过 5MB' : '图片不能超过 2MB' 
      });
    }

    // 根据文件类型选择转换参数
    const transformation = isGif ? EMOJI_CONFIG.transformation.gif : EMOJI_CONFIG.transformation.static;
    
    // 上传到 Cloudinary 并优化
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: EMOJI_CONFIG.folder,
        transformation: transformation,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: true,
        // 启用响应式图片标记
        responsive: true,
        // 自动去除元数据（减小文件大小）
        auto_tagging: 0.7
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      
      uploadStream.end(req.file.buffer);
    });

    // 返回优化后的信息
    const metadata = {
      width: Math.min(result.width, 256),
      height: Math.min(result.height, 256),
      fileSize: Math.round(result.bytes / 1024), // KB
      mimeType: req.file.mimetype,
      format: result.format,
      url: result.secure_url,
      publicId: result.public_id
    };

    console.log(`✅ 表情上传成功: ${metadata.fileSize}KB, ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`);

    res.json(metadata);
    
  } catch (error) {
    console.error('表情上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// ========== 📚 小说封面上传 ==========

router.post('/novel-cover/:personaId', authMiddleware, upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择封面图片' });
    }
    
    const { personaId } = req.params;
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在或无权限' });
    }
    
    // 小说封面不需要删除旧的，因为每本小说有自己的封面
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `novel-cover-${personaId}-${uniqueSuffix}`;
    
    // 小说封面建议尺寸：300x400，保持比例，质量优化
    const novelCoverTransformation = [
      { width: 300, height: 400, crop: 'limit' },
      { quality: 'auto:good' }
    ];
    const result = await uploadToCloudinary(req.file.buffer, 'rp-chat/novel-covers', publicId, novelCoverTransformation);
    
    res.json({ 
      success: true, 
      cover: result.secure_url,
      message: '小说封面上传成功'
    });
  } catch (error) {
    console.error('上传小说封面失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

module.exports = router;