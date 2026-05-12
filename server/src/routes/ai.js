const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Persona = require('../models/Persona');
const aiService = require('../services/aiService');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// 和 AI 角色聊天
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { personaId, message, history } = req.body;
    if (!personaId || !message) return res.status(400).json({ error: '缺少参数' });

    const persona = await Persona.findById(personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });

    const reply = await aiService.chatWithAI(
      persona.name,
      persona.description,
      message,
      history || []
    );

    res.json({ reply, persona: persona.displayName || persona.name });
  } catch (error) {
    console.error('AI 对话失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取角色设定
router.get('/persona/:personaId', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });

    res.json({
      name: persona.displayName || persona.name,
      description: persona.description,
      avatar: persona.avatar,
      tags: persona.tags
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;