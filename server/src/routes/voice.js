const express = require('express');
const router = express.Router();
const VoiceRoom = require('../models/VoiceRoom');
const User = require('../models/User');
const ActivePersona = require('../models/ActivePersona');
const jwt = require('jsonwebtoken');

// 验证token中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取所有语音房
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await VoiceRoom.find({ isActive: true })
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(50);
    
    res.json({ rooms });
  } catch (error) {
    console.error('获取语音房失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个语音房详情
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await VoiceRoom.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '语音房不存在' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('获取语音房详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建语音房
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, isPublic } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '房间名称至少需要2个字符' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const room = new VoiceRoom({
      name: name.trim(),
      description: description || '',
      category: category || 'chat',
      creatorId: req.userId,
      creatorName: user.username,
      creatorAvatar: user.avatar,
      isPublic: isPublic !== false,
      memberCount: 1
    });
    
    await room.save();
    
    res.status(201).json({
      message: '语音房创建成功',
      room
    });
    
  } catch (error) {
    console.error('创建语音房失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除语音房（仅房主）
router.delete('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await VoiceRoom.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '语音房不存在' });
    }
    
    if (room.creatorId.toString() !== req.userId) {
      return res.status(403).json({ error: '只有房主可以删除语音房' });
    }
    
    await VoiceRoom.findByIdAndDelete(req.params.roomId);
    
    res.json({ message: '语音房已删除' });
  } catch (error) {
    console.error('删除语音房失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新语音房信息（仅房主）
router.put('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, isPublic } = req.body;
    const room = await VoiceRoom.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '语音房不存在' });
    }
    
    if (room.creatorId.toString() !== req.userId) {
      return res.status(403).json({ error: '只有房主可以修改语音房信息' });
    }
    
    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description;
    if (category) room.category = category;
    if (isPublic !== undefined) room.isPublic = isPublic;
    room.updatedAt = new Date();
    
    await room.save();
    
    res.json({ message: '更新成功', room });
  } catch (error) {
    console.error('更新语音房失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;