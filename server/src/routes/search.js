const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const cc = require('chinese-conv');

// 简繁转换函数
function toSimplified(str) {
  return cc.sify(str);
}

function toTraditional(str) {
  return cc.tify(str);
}

// ✅ 修复：生成搜索正则（支持简繁转换，但不支持跨字符模糊）
function getSearchRegex(searchTerm) {
  if (!searchTerm || searchTerm.length === 0) return null;
  
  // 生成简体和繁体版本
  const simplified = toSimplified(searchTerm);
  const traditional = toTraditional(searchTerm);
  
  // ✅ 修复：不再使用 .* 连接，改为精确匹配每个字符
  let pattern = '';
  for (let i = 0; i < searchTerm.length; i++) {
    const sChar = simplified[i];
    const tChar = traditional[i];
    if (sChar !== tChar) {
      pattern += `[${sChar}${tChar}]`;
    } else {
      pattern += sChar;
    }
  }
  
  // ✅ 使用 ^ 和 $ 确保完整匹配（或使用 .* 前后可选）
  // 这里改为匹配包含关键词即可，但不允许中间插字
  return new RegExp(pattern, 'i');
}

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
    
    console.log(`搜索: "${q}", 正则: ${searchRegex}`);
    
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