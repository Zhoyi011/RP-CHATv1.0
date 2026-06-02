// server/src/routes/privateChat.js
const express = require('express');
const Message = require('../models/Message');
const Persona = require('../models/Persona');
const Friend = require('../models/Friend');

const router = express.Router();

// 辅助函数：从 token 获取当前角色
const getCurrentPersona = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: decoded.userId }).populate('personaId');
    return active?.personaId || null;
  } catch (error) {
    return null;
  }
};

// 中间件：需要角色
const requirePersona = async (req, res, next) => {
  const persona = await getCurrentPersona(req);
  if (!persona) {
    return res.status(401).json({ success: false, message: '请先选择一个角色' });
  }
  req.persona = persona;
  next();
};

// 获取私聊消息历史
router.get('/:targetPersonaId/messages', requirePersona, async (req, res) => {
  try {
    const { targetPersonaId } = req.params;
    const currentPersonaId = req.persona._id;

    // 检查是否为好友
    const areFriends = await Friend.areFriends(currentPersonaId, targetPersonaId);
    if (!areFriends) {
      return res.status(403).json({ success: false, message: '不是好友关系' });
    }

    // 私聊房间ID（两个角色ID排序后拼接）
    const roomId = [currentPersonaId.toString(), targetPersonaId].sort().join('-');

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('personaId', 'name displayName avatar sameNameNumber')
      .lean();

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('获取私聊消息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;