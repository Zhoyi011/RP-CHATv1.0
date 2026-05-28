// server/src/routes/pat.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');

// 认证中间件
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

// 预设动作列表
const PRESET_ACTIONS = [
  { id: 'hug', name: '抱了抱', icon: '🤗', defaultPattern: '{actor} 抱了抱 {target}' },
  { id: 'kiss', name: '亲了亲', icon: '😘', defaultPattern: '{actor} 亲了亲 {target}' },
  { id: 'touch', name: '贴了贴', icon: '💕', defaultPattern: '{actor} 贴了贴 {target}' },
  { id: 'pat', name: '拍了拍', icon: '👋', defaultPattern: '{actor} 拍了拍 {target}' },
  { id: 'poke', name: '戳了戳', icon: '👉', defaultPattern: '{actor} 戳了戳 {target}' },
  { id: 'rub', name: '揉了揉', icon: '🤲', defaultPattern: '{actor} 揉了揉 {target} 的头' },
  { id: 'tickle', name: '挠了挠', icon: '😄', defaultPattern: '{actor} 挠了挠 {target}' },
  { id: 'push', name: '推了推', icon: '👐', defaultPattern: '{actor} 推了推 {target}' },
  { id: 'headpat', name: '摸了摸头', icon: '🫳', defaultPattern: '{actor} 摸了摸 {target} 的头' },
  { id: 'boop', name: '点了点', icon: '👉', defaultPattern: '{actor} 点了点 {target} 的鼻子' },
];

// 获取预设动作列表
router.get('/actions', authMiddleware, async (req, res) => {
  res.json({ actions: PRESET_ACTIONS });
});

// 发送拍一拍消息
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { roomId, targetPersonaId, actionId, customPattern } = req.body;
    const userId = req.userId;
    
    // 获取发送者角色
    const activePersona = await Persona.findOne({ userId, status: 'approved' });
    if (!activePersona) {
      return res.status(400).json({ error: '请先选择角色' });
    }
    
    // 获取接收者角色
    const targetPersona = await Persona.findById(targetPersonaId);
    if (!targetPersona) {
      return res.status(400).json({ error: '目标角色不存在' });
    }
    
    // 获取动作
    let action;
    let pattern;
    
    if (customPattern) {
      // 自定义模式
      action = { name: '自定义', icon: '✨', id: 'custom' };
      pattern = customPattern;
    } else {
      action = PRESET_ACTIONS.find(a => a.id === actionId);
      if (!action) {
        return res.status(400).json({ error: '无效的动作' });
      }
      pattern = action.defaultPattern;
    }
    
    // 获取角色显示名称（带编号）
    const getPersonaDisplay = (persona) => {
      const name = persona.displayName || persona.name;
      const number = persona.sameNameNumber;
      return number ? `${name} #${number}` : name;
    };
    
    const actorDisplay = getPersonaDisplay(activePersona);
    const targetDisplay = getPersonaDisplay(targetPersona);
    
    // 生成消息（替换模板中的 {actor} 和 {target}）
    let message = pattern
      .replace(/{actor}/g, actorDisplay)
      .replace(/{target}/g, targetDisplay);
    
    // 保存到数据库（作为特殊消息类型）
    const Message = require('../models/Message');
    const patMessage = new Message({
      roomId,
      userId: activePersona._id,
      personaId: activePersona._id,
      content: message,
      isAction: true,
      isPat: true,  // 标记为拍一拍消息
      patData: {
        actionId: action.id,
        actionName: action.name,
        actionIcon: action.icon,
        customPattern: customPattern || null,
        targetPersonaId: targetPersona._id,
        targetPersonaName: targetDisplay
      }
    });
    
    await patMessage.save();
    
    // 广播给房间所有人
    const io = req.app.get('io');
    io.to(roomId).emit('new-message', {
      _id: patMessage._id,
      content: patMessage.content,
      isAction: true,
      isPat: true,
      createdAt: patMessage.createdAt,
      roomId,
      personaId: {
        _id: activePersona._id,
        name: activePersona.name,
        displayName: activePersona.displayName,
        avatar: activePersona.avatar,
        sameNameNumber: activePersona.sameNameNumber
      },
      userId: { _id: userId }
    });
    
    res.json({
      success: true,
      message: '拍一拍已发送',
      data: {
        content: message,
        targetPersona: targetDisplay
      }
    });
    
  } catch (error) {
    console.error('发送拍一拍失败:', error);
    res.status(500).json({ error: '发送失败' });
  }
});

module.exports = router;