const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Changelog = require('../models/Changelog');
const jwt = require('jsonwebtoken');

// GitHub 配置
const GITHUB_OWNER = 'Zhoyi011';
const GITHUB_REPO = 'RP-CHATv1.0';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`;

// 需要过滤的关键词
const RELEVANT_KEYWORDS = [
  'feat', 'add', '新增', '添加', 'feature', '功能',
  'fix', '修复', '优化', 'improve', '更新', 'update',
  'docs', '文档', 'style', '样式', 'refactor', '重构'
];

// 验证token中间件
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

// ========== 从 GitHub 拉取并保存 commits ==========
async function fetchAndSaveGitHubCommits() {
  try {
    console.log('📡 正在从 GitHub 获取更新记录...');
    
    // 获取最新的 commit 记录
    const lastAutoEntry = await Changelog.findOne({ type: 'auto' })
      .sort({ date: -1 });
    
    const params = { per_page: 50 };
    if (lastAutoEntry) {
      params.since = lastAutoEntry.date.toISOString();
      console.log(`📅 上次同步时间: ${params.since}`);
    }
    
    const response = await axios.get(GITHUB_API, {
      params,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RP-Chat-App'
      },
      timeout: 10000
    });
    
    // 过滤相关 commits
    const newCommits = response.data.filter(commit => {
      const msg = commit.commit.message.toLowerCase();
      return RELEVANT_KEYWORDS.some(kw => 
        msg.startsWith(kw.toLowerCase()) || 
        msg.includes(kw.toLowerCase())
      );
    });
    
    // 保存新的 commits 到数据库
    let savedCount = 0;
    for (const commit of newCommits) {
      const exists = await Changelog.findOne({ sha: commit.sha });
      if (!exists) {
        await Changelog.create({
          type: 'auto',
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          url: commit.html_url
        });
        savedCount++;
        console.log(`  ✅ 新增: ${commit.commit.message.substring(0, 50)}...`);
      }
    }
    
    if (savedCount > 0) {
      console.log(`✅ GitHub 同步完成，新增 ${savedCount} 条记录`);
    } else {
      console.log(`✅ GitHub 同步完成，无新记录`);
    }
    
    return savedCount;
  } catch (error) {
    console.error('❌ 获取 GitHub commits 失败:', error.message);
    if (error.response?.status === 403) {
      console.error('⚠️ GitHub API 限流，请稍后再试');
    }
    return 0;
  }
}

// ========== 路由 ==========

// 获取更新日志
router.get('/', async (req, res) => {
  try {
    // 从数据库获取所有更新日志
    const entries = await Changelog.find()
      .sort({ date: -1 })
      .limit(100);
    
    // 后台异步同步 GitHub（不阻塞响应）
    fetchAndSaveGitHubCommits().catch(err => 
      console.error('后台同步 GitHub 失败:', err.message)
    );
    
    res.json({ entries });
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
    
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '请填写标题和内容' });
    }
    
    const newEntry = await Changelog.create({
      type: 'manual',
      title: title.trim(),
      content: content.trim(),
      date: new Date(),
      author: user.username
    });
    
    console.log(`📝 手动添加更新: ${title} (by ${user.username})`);
    
    res.json({
      message: '添加成功',
      entry: newEntry
    });
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
    
    const entry = await Changelog.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: '条目不存在' });
    }
    
    if (entry.type !== 'manual') {
      return res.status(400).json({ error: '只能删除手动添加的条目' });
    }
    
    await Changelog.deleteOne({ _id: req.params.id });
    
    console.log(`🗑️ 删除手动更新: ${entry.title} (by ${user.username})`);
    
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除手动更新失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// 手动触发 GitHub 同步（管理员）
router.post('/sync-github', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const count = await fetchAndSaveGitHubCommits();
    res.json({
      message: `同步完成，新增 ${count} 条记录`,
      count
    });
  } catch (error) {
    console.error('同步 GitHub 失败:', error);
    res.status(500).json({ error: '同步失败' });
  }
});

// 导出函数供 app.js 使用
module.exports = router;
module.exports.fetchAndSaveGitHubCommits = fetchAndSaveGitHubCommits;