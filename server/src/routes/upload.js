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
          bit_rate: 64000,
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

    console.log(`✅ 音频上传成功 (MP3): ${result.secure_url}`);

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

// ========== 🎨 表情上传 ==========
const EMOJI_CONFIG = {
  folder: 'rp-chat/emojis',
  allowedFormats: ['jpg', 'png', 'gif', 'webp'],
  maxSize: 2 * 1024 * 1024,
  transformation: [
    { width: 512, height: 512, crop: 'limit', quality: 'auto' }
  ]
};

router.post('/emoji', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }

    if (req.file.size > (req.file.mimetype === 'image/gif' ? 5 * 1024 * 1024 : 2 * 1024 * 1024)) {
      return res.status(400).json({ error: req.file.mimetype === 'image/gif' ? 'GIF 不能超过 5MB' : '图片不能超过 2MB' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: EMOJI_CONFIG.folder,
        transformation: EMOJI_CONFIG.transformation,
        resource_type: 'auto'
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      
      uploadStream.end(req.file.buffer);
    });

    const metadata = {
      width: result.width,
      height: result.height,
      fileSize: Math.round(req.file.size / 1024),
      mimeType: req.file.mimetype,
      format: result.format
    };

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      ...metadata
    });
  } catch (error) {
    console.error('表情上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

module.exports = router;