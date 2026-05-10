const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const translateService = require('../services/translateService');

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

/**
 * 简体转繁体
 * POST /api/translate/s2t
 * Body: { text: "简体中文" }
 */
router.post('/s2t', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.json({ result: '' });
    }
    
    const result = await translateService.simplifiedToTraditional(text);
    res.json({ result });
  } catch (error) {
    console.error('翻译失败:', error);
    res.status(500).json({ error: '翻译失败' });
  }
});

/**
 * 繁体转简体
 * POST /api/translate/t2s
 * Body: { text: "繁體中文" }
 */
router.post('/t2s', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.json({ result: '' });
    }
    
    const result = await translateService.traditionalToSimplified(text);
    res.json({ result });
  } catch (error) {
    console.error('翻译失败:', error);
    res.status(500).json({ error: '翻译失败' });
  }
});

/**
 * 智能转换（自动检测）
 * POST /api/translate/convert
 * Body: { text: "要转换的文字" }
 */
router.post('/convert', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.json({ result: '' });
    }
    
    const result = await translateService.smartConvert(text);
    res.json({ result });
  } catch (error) {
    console.error('翻译失败:', error);
    res.status(500).json({ error: '翻译失败' });
  }
});

module.exports = router;