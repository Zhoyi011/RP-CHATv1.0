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

module.exports = router;