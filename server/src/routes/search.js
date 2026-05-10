const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const st = require('chinese-simple2traditional');

// 验证token中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'token无效' });
  }
};

// 生成搜索正则（支持模糊匹配和简繁转换）
function getSearchRegex(searchTerm) {
  if (!searchTerm || searchTerm.length === 0) return null;
  
  // 生成简体和繁体版本
  const simplified = searchTerm;
  const traditional = st.s2t(searchTerm);
  
  // 构建正则：每个字符支持简繁两种形式
  let pattern = '';
  for (let i = 0; i < searchTerm.length; i++) {
    const char = searchTerm[i];
    const tChar = traditional[i];
    if (char !== tChar) {
      pattern += `[${char}${tChar}]`;
    } else {
      pattern += char;
    }
  }
  
  // 添加模糊匹配：允许中间有任意字符
  const fuzzyPattern = pattern.split('').join('.*');
  return new RegExp(fuzzyPattern, 'i');
}

// ========== 搜索角色 ==========
router.get('/personas', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ personas: [], total: 0 });
    }
    
    const searchRegex = getSearchRegex(q);
    if (!searchRegex) {
      return res.json({ personas: [], total: 0 });
    }
    
    const query = {
      status: 'approved',
      $or: [
        { name: searchRegex },
        { displayName: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    };
    
    const personas = await Persona.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ usageCount: -1, createdAt: -1 });
    
    const total = await Persona.countDocuments(query);
    
    res.json({
      personas,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('搜索角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 搜索群组 ==========
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ rooms: [] });
    }
    
    const searchRegex = getSearchRegex(q);
    if (!searchRegex) {
      return res.json({ rooms: [] });
    }
    
    const rooms = await Room.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    })
    .limit(parseInt(limit))
    .sort({ memberCount: -1 });
    
    const roomsWithCount = rooms.map(room => ({
      ...room.toObject(),
      memberCount: room.members.length
    }));
    
    res.json({ rooms: roomsWithCount });
  } catch (error) {
    console.error('搜索群组失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 搜索用户 ==========
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }
    
    const searchRegex = getSearchRegex(q);
    if (!searchRegex) {
      return res.json({ users: [] });
    }
    
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [
        { username: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex }
      ]
    })
    .limit(parseInt(limit))
    .select('-password');
    
    res.json({ users });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;