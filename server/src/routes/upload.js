const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const { upload, uploadToCloudinary, deleteOldAvatar } = require('../services/uploadService');

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

// 上传用户头像
router.post('/user', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 删除旧头像
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    // 上传到 Cloudinary
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `user-${req.userId}-${uniqueSuffix}`;
    const result = await uploadToCloudinary(req.file.buffer, 'rp-chat/avatars', publicId);
    
    user.avatar = result.secure_url;
    await user.save();
    
    res.json({ 
      success: true, 
      avatar: user.avatar,
      message: '头像上传成功'
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

// 删除用户头像
router.delete('/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    user.avatar = '';
    await user.save();
    
    res.json({ success: true, message: '已恢复默认头像' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 角色头像 ==========

// 上传角色头像
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
    
    // 删除旧头像
    if (persona.avatar) {
      await deleteOldAvatar(persona.avatar);
    }
    
    // 上传到 Cloudinary
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `persona-${personaId}-${uniqueSuffix}`;
    const result = await uploadToCloudinary(req.file.buffer, 'rp-chat/avatars', publicId);
    
    persona.avatar = result.secure_url;
    await persona.save();
    
    res.json({ 
      success: true, 
      avatar: persona.avatar,
      message: '角色头像上传成功'
    });
  } catch (error) {
    console.error('上传角色头像失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

// 删除角色头像
router.delete('/persona/:personaId', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.params;
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    
    if (!persona) return res.status(404).json({ error: '角色不存在或无权限' });
    
    if (persona.avatar) {
      await deleteOldAvatar(persona.avatar);
    }
    
    persona.avatar = '';
    await persona.save();
    
    res.json({ success: true, message: '已恢复默认头像' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;