const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 验证token中间件（直接从 auth.js 复制过来）
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// GitHub 配置
const GITHUB_OWNER = 'Zhoyi011';
const GITHUB_REPO = 'RP-CHATv1.0';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`;

// 需要过滤的关键词
const RELEVANT_KEYWORDS = [
  'feat', 'add', '新增', '添加', 'feature', '功能',
  'fix', '修复', '优化', 'improve', '更新', 'update'
];

// 手动添加的更新（存入内存，重启会丢失，生产环境应存入数据库）
let manualEntries = [
  {
    id: '1',
    type: 'manual',
    title: '📢 正式版发布',
    content: 'RP Chat v1.0 正式上线！',
    date: new Date('2026-03-20').toISOString(),
    author: 'system'
  }
];

// 获取 GitHub commits
router.get('/commits', async (req, res) => {
  try {
    const { limit = 30, since } = req.query;
    
    const response = await axios.get(GITHUB_API, {
      params: {
        per_page: limit,
        ...(since && { since })
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RP-Chat-App'
      }
    });
    
    const commits = response.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author.date,
      author: commit.commit.author.name,
      url: commit.html_url
    }));
    
    res.json({ commits });
  } catch (error) {
    console.error('获取 GitHub commits 失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取合并后的更新日志
router.get('/', async (req, res) => {
  try {
    let autoEntries = [];
    
    try {
      const commitsRes = await axios.get(GITHUB_API, {
        params: { per_page: 50 },
        headers: { 'Accept': 'application/json', 'User-Agent': 'RP-Chat-App' }
      });
      
      autoEntries = commitsRes.data
        .filter(commit => {
          const msg = commit.commit.message.toLowerCase();
          return RELEVANT_KEYWORDS.some(kw => 
            msg.startsWith(kw.toLowerCase()) || 
            msg.includes(kw.toLowerCase())
          );
        })
        .map(commit => ({
          type: 'auto',
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          url: commit.html_url
        }));
    } catch (err) {
      console.error('获取 GitHub commits 失败:', err.message);
    }
    
    // 合并手动添加的条目
    const allEntries = [...manualEntries, ...autoEntries]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ entries: allEntries });
  } catch (error) {
    console.error('获取更新日志失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 手动添加更新日志（需要管理员权限）
router.post('/manual', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const { title, content, type } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '请填写标题和内容' });
    }
    
    const newEntry = {
      id: Date.now().toString(),
      type: 'manual',
      title,
      content,
      date: new Date().toISOString(),
      author: user.username
    };
    
    manualEntries.unshift(newEntry);
    
    // 只保留最近100条
    if (manualEntries.length > 100) {
      manualEntries = manualEntries.slice(0, 100);
    }
    
    res.json({ message: '添加成功', entry: newEntry });
  } catch (error) {
    console.error('添加手动更新失败:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

// 删除手动更新（需要管理员权限）
router.delete('/manual/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const index = manualEntries.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '条目不存在' });
    }
    
    manualEntries.splice(index, 1);
    
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除手动更新失败:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

module.exports = router;