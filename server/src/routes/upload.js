const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const { upload, uploadToCloudinary, deleteOldAvatar } = require('../services/uploadService');

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

// ========== 🎙️ 语音消息上传（新增）==========

/**
 * 上传语音消息
 * POST /api/upload/audio
 * 
 * 请求: multipart/form-data with field 'audio'
 * 响应: { url: string, duration?: number }
 */
router.post('/audio', authMiddleware, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    // 限制文件大小（10MB 已在 multer 配置中限制）
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname || 'voice_message';
    
    console.log(`🎙️ 收到音频上传: ${originalName}, 大小: ${fileBuffer.length} bytes`);

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `voice-${req.userId}-${uniqueSuffix}`;
    
    // 上传到 Cloudinary（作为 video 类型，因为音频被视为 video 的纯音频变体）
    // 可选参数：resource_type 设为 'video'，格式转成 m4a
    const result = await new Promise((resolve, reject) => {
      const cloudinary = require('cloudinary').v2;
      
      // 确保 Cloudinary 已配置（使用环境变量）
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',           // 音频使用 video 类型
          format: 'm4a',                    // 统一转为 M4A（最佳兼容性）
          folder: 'rp-chat/voice_messages',
          public_id: publicId,
          use_filename: false,
          unique_filename: true,
          overwrite: true,
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

    console.log(`✅ 音频上传成功: ${result.secure_url}`);

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

/**
 * 删除语音消息（可选，用于撤回时删除）
 * DELETE /api/upload/audio
 * 
 * 请求体: { url: string }
 */
router.delete('/audio', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供音频 URL' });
    }
    
    // 从 URL 中提取 public_id
    // 格式: https://res.cloudinary.com/.../upload/v.../rp-chat/voice_messages/voice-xxx.m4a
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `rp-chat/voice_messages/${filename.split('.')[0]}`;
    
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
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

module.exports = router;