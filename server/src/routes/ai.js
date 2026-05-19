const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Persona = require('../models/Persona');
const AIPersona = require('../models/AIPersona');
const UserPersonaForAI = require('../models/UserPersonaForAI');
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

// ========== 旧版 AI 聊天（兼容 Persona）==========
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { personaId, message, history } = req.body;
    if (!personaId || !message) return res.status(400).json({ error: '缺少参数' });

    const persona = await Persona.findById(personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });

    // 获取用户当前角色名
    let userPersonaName = '用户';
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: req.userId }).populate('personaId');
    if (active?.personaId) {
      userPersonaName = active.personaId.displayName || active.personaId.name;
    }

    const reply = await aiService.chatWithAI(
      persona.displayName || persona.name,
      persona.description,
      message,
      history || [],
      userPersonaName
    );

    res.json({ reply, persona: persona.displayName || persona.name });
  } catch (error) {
    console.error('AI 对话失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 新版 AI 对话（支持 AI Persona + 用户 Persona）==========
router.post('/chat-with-persona', authMiddleware, async (req, res) => {
  try {
    const { aiPersonaId, message, history, userPersona } = req.body;
    if (!aiPersonaId || !message) return res.status(400).json({ error: '缺少参数' });

    const aiPersona = await AIPersona.findById(aiPersonaId);
    if (!aiPersona) return res.status(404).json({ error: 'AI 角色不存在' });

    // 获取用户自己的角色（如果前端没有传）
    let userPersonaData = userPersona;
    if (!userPersonaData) {
      userPersonaData = await UserPersonaForAI.findOne({ userId: req.userId });
    }

    const reply = await aiService.chatWithAIPersona(
      aiPersona,
      message,
      history || [],
      userPersonaData
    );

    res.json({ reply });
  } catch (error) {
    console.error('AI 对话失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== AI 角色 CRUD ==========

// 获取用户的所有 AI 角色
router.get('/personas', authMiddleware, async (req, res) => {
  try {
    const personas = await AIPersona.find({ userId: req.userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取默认 AI 角色
router.get('/default', authMiddleware, async (req, res) => {
  try {
    let defaultAI = await AIPersona.findOne({ userId: req.userId, isDefault: true });
    if (!defaultAI) {
      defaultAI = await AIPersona.create({
        userId: req.userId,
        name: 'AI 助手',
        description: '一个友善的 AI 助手，乐于帮助用户解决问题。',
        personality: '友善、热情、乐于助人',
        replyStyle: 'medium',
        isDefault: true
      });
    }
    res.json(defaultAI);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建 AI 角色
router.post('/personas', authMiddleware, async (req, res) => {
  try {
    const { name, description, personality, replyStyle, avatar, exampleDialogue } = req.body;
    if (!name) return res.status(400).json({ error: '角色名称不能为空' });
    
    const count = await AIPersona.countDocuments({ userId: req.userId });
    const aiPersona = await AIPersona.create({
      userId: req.userId,
      name,
      description: description || '',
      personality: personality || '',
      replyStyle: replyStyle || 'medium',
      avatar: avatar || '',
      exampleDialogue: exampleDialogue || '',
      isDefault: count === 0
    });
    res.json(aiPersona);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新 AI 角色
router.put('/personas/:id', authMiddleware, async (req, res) => {
  try {
    const aiPersona = await AIPersona.findOne({ _id: req.params.id, userId: req.userId });
    if (!aiPersona) return res.status(404).json({ error: '角色不存在' });
    
    const { name, description, personality, replyStyle, avatar, exampleDialogue, isDefault } = req.body;
    
    if (name !== undefined) aiPersona.name = name;
    if (description !== undefined) aiPersona.description = description;
    if (personality !== undefined) aiPersona.personality = personality;
    if (replyStyle !== undefined) aiPersona.replyStyle = replyStyle;
    if (avatar !== undefined) aiPersona.avatar = avatar;
    if (exampleDialogue !== undefined) aiPersona.exampleDialogue = exampleDialogue;
    
    if (isDefault !== undefined && isDefault) {
      await AIPersona.updateMany({ userId: req.userId }, { isDefault: false });
      aiPersona.isDefault = true;
    }
    
    aiPersona.updatedAt = new Date();
    await aiPersona.save();
    
    res.json(aiPersona);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除 AI 角色
router.delete('/personas/:id', authMiddleware, async (req, res) => {
  try {
    const aiPersona = await AIPersona.findOne({ _id: req.params.id, userId: req.userId });
    if (!aiPersona) return res.status(404).json({ error: '角色不存在' });
    if (aiPersona.isDefault) return res.status(400).json({ error: '不能删除默认角色' });
    
    await aiPersona.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 设置默认角色
router.post('/personas/:id/default', authMiddleware, async (req, res) => {
  try {
    await AIPersona.updateMany({ userId: req.userId }, { isDefault: false });
    await AIPersona.updateOne({ _id: req.params.id, userId: req.userId }, { isDefault: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 用户自己的角色（让 AI 认识你）==========

// 获取用户自己的角色
router.get('/my-persona', authMiddleware, async (req, res) => {
  try {
    let userPersona = await UserPersonaForAI.findOne({ userId: req.userId });
    if (!userPersona) {
      userPersona = await UserPersonaForAI.create({
        userId: req.userId,
        name: '用户',
        description: '一个喜欢角色扮演的用户。'
      });
    }
    res.json(userPersona);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新用户自己的角色
router.put('/my-persona', authMiddleware, async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    let userPersona = await UserPersonaForAI.findOne({ userId: req.userId });
    
    if (!userPersona) {
      userPersona = new UserPersonaForAI({ userId: req.userId });
    }
    
    if (name !== undefined) userPersona.name = name;
    if (description !== undefined) userPersona.description = description;
    if (avatar !== undefined) userPersona.avatar = avatar;
    userPersona.updatedAt = new Date();
    await userPersona.save();
    
    res.json(userPersona);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 获取角色设定（兼容旧版）==========
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

// ========== 检查 AI 服务状态 ==========
router.get('/status', authMiddleware, async (req, res) => {
  res.json({ 
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    status: 'ready'
  });
});

module.exports = router;