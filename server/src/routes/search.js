// server/src/routes/search.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

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

// 模糊搜索角色（支持简体/繁体）
router.get('/personas', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ personas: [], total: 0 });
    }
    
    // 简体转繁体、繁体转简体的简单映射（可以使用更完整的库）
    const searchTerms = [q];
    // 添加常见简繁转换
    const s2t = { '爱': '愛', '国': '國', '会': '會', '学': '學', '书': '書' };
    const t2s = { '愛': '爱', '國': '国', '會': '会', '學': '学', '書': '书' };
    
    for (const [s, t] of Object.entries(s2t)) {
      if (q.includes(s)) searchTerms.push(q.replaceAll(s, t));
      if (q.includes(t)) searchTerms.push(q.replaceAll(t, s));
    }
    
    // 模糊搜索条件
    const searchRegex = new RegExp(searchTerms.map(term => term.split('').join('.*')).join('|'), 'i');
    
    const query = {
      status: 'approved',
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    };
    
    const personas = await Persona.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ usageCount: -1, createdAt: -1 });
    
    const total = await Persona.countDocuments(query);
    
    res.json({
      personas,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('搜索角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索用户（加好友）
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
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

// 搜索群组
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    const rooms = await Room.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    })
    .limit(parseInt(limit))
    .sort({ memberCount: -1 });
    
    // 添加成员数
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

module.exports = router;