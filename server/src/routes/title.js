// server/src/routes/title.js
const express = require('express');
const router = express.Router();
const Title = require('../models/Title');
const PersonaRoom = require('../models/PersonaRoom');
const jwt = require('jsonwebtoken');
const { logAction } = require('../middlewares/auditLog');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取群组的头衔列表
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const titles = await Title.find({ roomId: req.params.roomId, isActive: true });
    res.json(titles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建头衔（群主/管理员）
router.post('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { name, color, icon, permission } = req.body;
    const { roomId } = req.params;
    
    // 检查权限
    const personaRoom = await PersonaRoom.findOne({ 
      personaId: req.userId, 
      roomId,
      role: { $in: ['owner', 'admin'] }
    });
    
    if (!personaRoom) {
      return res.status(403).json({ error: '没有权限创建头衔' });
    }
    
    const title = new Title({
      name,
      color: color || '#6b7280',
      icon: icon || '🏷️',
      permission: permission || 'member',
      roomId,
      createdBy: req.userId
    });
    
    await title.save();
    
    await logAction(req, 'CREATE_TITLE', { roomId, titleName: name });
    
    res.json({ message: '头衔创建成功', title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除头衔
router.delete('/:titleId', authMiddleware, async (req, res) => {
  try {
    const title = await Title.findById(req.params.titleId);
    if (!title) return res.status(404).json({ error: '头衔不存在' });
    
    const personaRoom = await PersonaRoom.findOne({ 
      personaId: req.userId, 
      roomId: title.roomId,
      role: { $in: ['owner', 'admin'] }
    });
    
    if (!personaRoom) {
      return res.status(403).json({ error: '没有权限删除头衔' });
    }
    
    title.isActive = false;
    await title.save();
    
    await logAction(req, 'DELETE_TITLE', { roomId: title.roomId, titleName: title.name });
    
    res.json({ message: '头衔已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 给成员分配头衔
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { roomId, targetPersonaId, titleId } = req.body;
    
    // 检查权限
    const personaRoom = await PersonaRoom.findOne({ 
      personaId: req.userId, 
      roomId,
      role: { $in: ['owner', 'admin'] }
    });
    
    if (!personaRoom) {
      return res.status(403).json({ error: '没有权限分配头衔' });
    }
    
    const title = await Title.findById(titleId);
    if (!title || !title.isActive) {
      return res.status(404).json({ error: '头衔不存在' });
    }
    
    // 更新成员头衔
    await PersonaRoom.findOneAndUpdate(
      { personaId: targetPersonaId, roomId },
      { title: title.name }
    );
    
    await logAction(req, 'ASSIGN_TITLE', { roomId, targetPersonaId, titleName: title.name });
    
    res.json({ message: '头衔已分配' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;