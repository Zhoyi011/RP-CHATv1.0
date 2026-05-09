// server/src/routes/search.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

// 简繁转换映射表（常用字）
const s2t: { [key: string]: string } = {
  '爱': '愛', '国': '國', '会': '會', '学': '學', '书': '書',
  '龙': '龍', '对': '對', '发': '發', '开': '開', '关': '關',
  '体': '體', '头': '頭', '点': '點', '电': '電', '飞': '飛',
  '个': '個', '过': '過', '后': '後', '时': '時', '间': '間',
  '门': '門', '马': '馬', '鸟': '鳥', '鱼': '魚', '贝': '貝',
  '车': '車', '长': '長', '门': '門', '东': '東', '乐': '樂'
};

const t2s: { [key: string]: string } = {
  '愛': '爱', '國': '国', '會': '会', '學': '学', '書': '书',
  '龍': '龙', '對': '对', '發': '发', '開': '开', '關': '关',
  '體': '体', '頭': '头', '點': '点', '電': '电', '飛': '飞',
  '個': '个', '過': '过', '後': '后', '時': '时', '間': '间',
  '門': '门', '馬': '马', '鳥': '鸟', '魚': '鱼', '貝': '贝',
  '車': '车', '長': '长', '東': '东', '樂': '乐'
};

// 简繁转换函数
function toTraditional(str: string): string {
  let result = '';
  for (const char of str) {
    result += s2t[char] || char;
  }
  return result;
}

function toSimplified(str: string): string {
  let result = '';
  for (const char of str) {
    result += t2s[char] || char;
  }
  return result;
}

// 生成搜索正则（支持模糊匹配和简繁）
function getSearchRegex(searchTerm: string): RegExp {
  // 生成简体和繁体的组合
  const simplified = toSimplified(searchTerm);
  const traditional = toTraditional(searchTerm);
  
  // 将每个字符转换为 [简|繁] 的形式
  let pattern = '';
  for (let i = 0; i < searchTerm.length; i++) {
    const char = searchTerm[i];
    const s = toSimplified(char);
    const t = toTraditional(char);
    if (s !== t) {
      pattern += `[${s}${t}]`;
    } else {
      pattern += char;
    }
  }
  
  // 添加模糊匹配：允许中间有任意字符
  const fuzzyPattern = pattern.split('').join('.*');
  return new RegExp(fuzzyPattern, 'i');
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

// 模糊搜索角色（支持简体/繁体/模糊匹配）
router.get('/personas', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ personas: [], total: 0 });
    }
    
    const searchRegex = getSearchRegex(q);
    
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

// 模糊搜索群组
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ rooms: [] });
    }
    
    const searchRegex = getSearchRegex(q);
    
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

// 搜索用户
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }
    
    const searchRegex = getSearchRegex(q);
    
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