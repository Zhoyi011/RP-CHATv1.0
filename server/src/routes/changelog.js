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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // 从环境变量读取

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

// 获取 GitHub 请求头
const getGitHubHeaders = () => {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'RP-Chat-App'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  return headers;
};

// 获取 commit 类型（用于显示图标）
const getCommitType = (message) => {
  const msg = message.toLowerCase();
  if (msg.startsWith('feat') || msg.startsWith('add') || msg.includes('新增')) return 'feat';
  if (msg.startsWith('fix') || msg.includes('修复')) return 'fix';
  if (msg.startsWith('docs') || msg.includes('文档')) return 'docs';
  if (msg.startsWith('style') || msg.includes('样式')) return 'style';
  if (msg.startsWith('refactor') || msg.includes('重构')) return 'refactor';
  if (msg.startsWith('chore') || msg.includes('调整')) return 'chore';
  if (msg.startsWith('perf') || msg.includes('性能')) return 'perf';
  if (msg.startsWith('test') || msg.includes('测试')) return 'test';
  return 'other';
};

// 获取 commit 图标
const getCommitIcon = (type) => {
  const icons = {
    feat: '✨',
    add: '➕',
    fix: '🐛',
    docs: '📝',
    style: '🎨',
    refactor: '♻️',
    chore: '🔧',
    perf: '⚡',
    test: '🧪',
    other: '💬'
  };
  return icons[type] || '💬';
};

// 格式化 commit 消息（提取标题）
const formatCommitMessage = (message) => {
  // 取第一行作为标题
  const firstLine = message.split('\n')[0];
  // 如果太长，截断
  if (firstLine.length > 80) {
    return firstLine.substring(0, 77) + '...';
  }
  return firstLine;
};

// ========== 从 GitHub 拉取并保存所有 commits ==========
async function fetchAndSaveGitHubCommits() {
  try {
    console.log('📡 正在从 GitHub 获取所有更新记录...');
    
    // 检查是否被限流
    const rateLimitRecord = await Changelog.findOne({ sha: 'rate_limit' });
    if (rateLimitRecord && rateLimitRecord.date) {
      const timeSinceLastAttempt = Date.now() - new Date(rateLimitRecord.date).getTime();
      if (timeSinceLastAttempt < 5 * 60 * 1000) {
        console.log('⏭️ 距离上次限流不足5分钟，跳过同步');
        return 0;
      }
    }
    
    // 获取最新的 commit 记录
    const lastAutoEntry = await Changelog.findOne({ type: 'auto' })
      .sort({ date: -1 });
    
    const params = { per_page: 100 }; // 获取更多记录
    if (lastAutoEntry && lastAutoEntry.date) {
      params.since = lastAutoEntry.date.toISOString();
      console.log(`📅 上次同步时间: ${params.since}`);
    }
    
    const response = await axios.get(GITHUB_API, {
      params,
      headers: getGitHubHeaders(),
      timeout: 15000
    });
    
    // 检查限流信息
    const remaining = response.headers['x-ratelimit-remaining'];
    if (remaining) {
      console.log(`📊 GitHub API 剩余请求次数: ${remaining}`);
    }
    
    // 不过滤，保存所有 commits
    const allCommits = response.data;
    console.log(`📝 从 GitHub 获取到 ${allCommits.length} 条新记录`);
    
    // 保存新的 commits 到数据库
    let savedCount = 0;
    for (const commit of allCommits) {
      const exists = await Changelog.findOne({ sha: commit.sha });
      if (!exists) {
        const commitType = getCommitType(commit.commit.message);
        const formattedMessage = formatCommitMessage(commit.commit.message);
        
        await Changelog.create({
          type: 'auto',
          sha: commit.sha,
          message: commit.commit.message,
          formattedMessage: formattedMessage,  // 格式化后的消息
          commitType: commitType,              // commit 类型
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          url: commit.html_url
        });
        savedCount++;
        console.log(`  ✅ 新增: ${formattedMessage} (${commitType})`);
      }
    }
    
    // 清除限流记录
    if (savedCount > 0 || allCommits.length === 0) {
      await Changelog.deleteOne({ sha: 'rate_limit' });
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
      console.error('⚠️ GitHub API 限流！');
      const resetTime = error.response.headers['x-ratelimit-reset'];
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        console.error(`⏰ 限流将在 ${resetDate.toLocaleString()} 重置`);
      }
      
      await Changelog.findOneAndUpdate(
        { sha: 'rate_limit' },
        { 
          type: 'auto',
          sha: 'rate_limit',
          message: 'GitHub API 限流',
          date: new Date(),
          author: 'system'
        },
        { upsert: true }
      );
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
      .limit(200); // 显示最近 200 条
    
    // 检查是否需要后台同步（每小时最多一次）
    const lastAuto = await Changelog.findOne({ type: 'auto' }).sort({ date: -1 });
    const rateLimited = await Changelog.findOne({ sha: 'rate_limit' });
    
    let shouldSync = false;
    
    if (!lastAuto) {
      shouldSync = true;
    } else if (rateLimited) {
      const timeSinceLimit = Date.now() - new Date(rateLimited.date).getTime();
      shouldSync = timeSinceLimit > 60 * 60 * 1000;
    } else {
      const lastSyncTime = new Date(lastAuto.date).getTime();
      const hoursSinceLastSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
      shouldSync = hoursSinceLastSync > 1;
    }
    
    if (shouldSync) {
      console.log('🔄 触发后台 GitHub 同步...');
      fetchAndSaveGitHubCommits().catch(err => 
        console.error('后台同步 GitHub 失败:', err.message)
      );
    } else if (!rateLimited) {
      console.log('⏭️ 跳过 GitHub 同步（距离上次同步不足1小时）');
    }
    
    res.json({ entries });
  } catch (error) {
    console.error('获取更新日志失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 手动添加更新日志
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
      author: user.username,
      commitType: 'manual'
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

// 删除手动更新
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

// 手动触发 GitHub 同步
router.post('/sync-github', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    await Changelog.deleteOne({ sha: 'rate_limit' });
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

// 导出函数
module.exports = router;
module.exports.fetchAndSaveGitHubCommits = fetchAndSaveGitHubCommits;