const express = require('express');
const router = express.Router();
const Persona = require('../models/Persona');
const jwt = require('jsonwebtoken');
const cardService = require('../services/cardService');

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

// ========== 角色申请和审核 ==========

// 创建角色申请
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '角色名称至少需要2个字符' });
    }
    
    // ✅ 获取当前用户的 ObjectId
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const persona = new Persona({
      name: name.trim(),
      description: description || '',
      tags: tags || [],
      userId: req.userId,
      createdBy: req.userId,  // ✅ 添加 createdBy 字段
      status: 'pending'
    });
    
    await persona.save();
    
    console.log(`✅ 用户 ${user.username} 创建角色申请: ${persona.name}`);
    
    res.status(201).json({
      message: '角色申请已提交，等待审核',
      persona: {
        _id: persona._id,
        name: persona.name,
        status: persona.status
      }
    });
    
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的角色
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(personas);
  } catch (error) {
    console.error('获取角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取待审核角色（管理员/群主）
router.get('/pending', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  try {
    const pending = await Persona.find({ status: 'pending' })
      .populate('userId', 'username email')
      .sort({ createdAt: 1 });
    
    res.json(pending);
  } catch (error) {
    console.error('获取待审核角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 审核角色
router.post('/review/:id', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  try {
    const { status, comment } = req.body;
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: '无效的审核状态' });
    }
    
    const persona = await Persona.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewComment: comment || '',
        reviewedBy: req.userId,
        reviewedAt: new Date()
      },
      { new: true }
    );
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    res.json({
      message: `角色已${status === 'approved' ? '通过' : '拒绝'}`,
      persona: {
        _id: persona._id,
        name: persona.name,
        displayName: persona.displayName,
        status: persona.status,
        sameNameNumber: persona.sameNameNumber,
        globalNumber: persona.globalNumber
      }
    });
    
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 角色搜索和主页 ==========

// 搜索角色
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ personas: [], total: 0 });
    }
    
    const searchRegex = new RegExp(q, 'i');
    
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

// 获取角色详情
router.get('/:personaId', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId)
      .populate('createdBy', 'username')
      .populate('guardians.userId', 'username avatar')
      .populate('relationships.targetPersonaId', 'name displayName avatar globalNumber');
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    // ✅ 获取装备的图片 URL
    const ShopItem = require('../models/ShopItem');
    let equippedWithUrls = { avatarFrame: null, ring: null, relationshipCard: null };
    
    if (persona.equipped) {
      // 头像框
      if (persona.equipped.avatarFrame) {
        const frame = await ShopItem.findById(persona.equipped.avatarFrame);
        if (frame) {
          equippedWithUrls.avatarFrame = frame.image;
        }
      }
      // 戒指
      if (persona.equipped.ring) {
        const ring = await ShopItem.findById(persona.equipped.ring);
        if (ring) {
          equippedWithUrls.ring = ring.image;
        }
      }
      // 关系卡
      if (persona.equipped.relationshipCard) {
        const card = await ShopItem.findById(persona.equipped.relationshipCard);
        if (card) {
          equippedWithUrls.relationshipCard = card.image;
        }
      }
    }
    
    // 返回角色数据，包含装备图片 URL
    res.json({
      _id: persona._id,
      name: persona.name,
      displayName: persona.displayName,
      description: persona.description,
      avatar: persona.avatar,
      tags: persona.tags,
      status: persona.status,
      globalNumber: persona.globalNumber,
      sameNameNumber: persona.sameNameNumber,
      userId: persona.userId,
      usageCount: persona.usageCount,
      viewCount: persona.viewCount,
      likeCount: persona.likeCount,
      postsCount: persona.postsCount,
      createdBy: persona.createdBy,
      createdAt: persona.createdAt,
      guardians: persona.guardians,
      totalGuardianAmount: persona.totalGuardianAmount,
      relationships: persona.relationships,
      equipped: equippedWithUrls  // ✅ 返回带图片 URL 的装备
    });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 生成角色卡图片
router.get('/:personaId/card', async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    
    const buffer = await cardService.generatePersonaCard(persona);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error) {
    console.error('生成角色卡失败:', error);
    res.status(500).json({ error: '生成失败' });
  }
});

// 使用角色（创建副本）
router.post('/:personaId/use', authMiddleware, async (req, res) => {
  try {
    const original = await Persona.findById(req.params.personaId);
    
    if (!original || original.status !== 'approved') {
      return res.status(404).json({ error: '角色不存在或未审核' });
    }
    
    // 检查用户是否已经拥有这个角色
    const existing = await Persona.findOne({
      name: original.name,
      userId: req.userId,
      status: 'approved'
    });
    
    if (existing) {
      return res.status(400).json({ error: '你已经拥有这个角色了' });
    }
    
    // 创建用户的角色副本
    const userPersona = new Persona({
      name: original.name,
      description: original.description,
      tags: original.tags,
      avatar: original.avatar,
      userId: req.userId,
      originalPersonaId: original._id,
      status: 'approved'
    });
    
    await userPersona.save();
    
    // 增加原角色的使用次数
    original.usageCount = (original.usageCount || 0) + 1;
    await original.save();
    
    res.json({
      message: `已获得角色 ${userPersona.displayName}`,
      persona: userPersona
    });
    
  } catch (error) {
    console.error('使用角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 角色互动功能 ==========

// 添加守护
router.post('/:personaId/guardian', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const persona = await Persona.findById(req.params.personaId);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    await persona.addGuardian(req.userId, amount);
    
    res.json({
      message: '守护成功',
      totalGuardianAmount: persona.totalGuardianAmount,
      guardians: persona.guardians.slice(0, 10)
    });
  } catch (error) {
    console.error('添加守护失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加亲密关系
router.post('/:personaId/relationship', authMiddleware, async (req, res) => {
  try {
    const { targetPersonaId, type, cardId } = req.body;
    const persona = await Persona.findById(req.params.personaId);
    const target = await Persona.findById(targetPersonaId);
    
    if (!persona || !target) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    if (persona.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '只能修改自己的角色关系' });
    }
    
    persona.relationships.push({ targetPersonaId, type, cardId, createdAt: new Date() });
    await persona.save();
    
    target.relationships.push({ targetPersonaId: req.params.personaId, type, cardId, createdAt: new Date() });
    await target.save();
    
    res.json({
      message: '关系已建立',
      relationships: persona.relationships
    });
  } catch (error) {
    console.error('添加关系失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 移除亲密关系
router.delete('/:personaId/relationship/:targetId', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    if (persona.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '只能修改自己的角色关系' });
    }
    
    persona.relationships = persona.relationships.filter(
      r => r.targetPersonaId.toString() !== req.params.targetId
    );
    await persona.save();
    
    // 同时移除对方的关系
    await Persona.updateOne(
      { _id: req.params.targetId },
      { $pull: { relationships: { targetPersonaId: req.params.personaId } } }
    );
    
    res.json({
      message: '关系已解除',
      relationships: persona.relationships
    });
  } catch (error) {
    console.error('移除关系失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加动态
router.post('/:personaId/post', authMiddleware, async (req, res) => {
  try {
    const { content, images } = req.body;
    const persona = await Persona.findById(req.params.personaId);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    if (persona.userId.toString() !== req.userId) {
      return res.status(403).json({ error: '只能发布自己的角色动态' });
    }
    
    // 动态存储在 Persona 的 posts 数组中（需要在模型中添加）
    if (!persona.posts) persona.posts = [];
    persona.posts.unshift({
      content,
      images: images || [],
      likes: [],
      comments: [],
      createdAt: new Date()
    });
    persona.postsCount = persona.posts.length;
    await persona.save();
    
    res.json({
      message: '动态发布成功',
      posts: persona.posts.slice(0, 10)
    });
  } catch (error) {
    console.error('发布动态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取角色动态列表（修复版）
router.get('/:personaId/posts', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const persona = await Persona.findById(req.params.personaId);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    const posts = persona.posts || [];
    const start = (parseInt(page) - 1) * parseInt(limit);
    const pagedPosts = posts.slice(start, start + parseInt(limit));
    
    res.json({
      posts: pagedPosts,
      total: posts.length,
      page: parseInt(page),
      totalPages: Math.ceil(posts.length / parseInt(limit))
    });
  } catch (error) {
    console.error('获取动态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞动态
router.post('/:personaId/posts/:postId/like', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    
    const post = persona.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ error: '动态不存在' });
    
    const liked = post.likes.includes(req.userId);
    if (liked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.push(req.userId);
    }
    
    await persona.save();
    res.json({ message: liked ? '已取消点赞' : '点赞成功', likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 生成角色卡图片
router.get('/:personaId/card', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId)
      .populate('createdBy', 'username');
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    // 简单返回一个 SVG 角色卡（或重定向到默认图片）
    const svg = `
      <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="500" fill="#1a1a2e" rx="20"/>
        <circle cx="200" cy="120" r="60" fill="#3b82f6"/>
        <text x="200" y="135" text-anchor="middle" fill="white" font-size="40" font-weight="bold">${persona.name.charAt(0)}</text>
        <text x="200" y="220" text-anchor="middle" fill="white" font-size="24" font-weight="bold">${persona.displayName || persona.name}</text>
        <text x="200" y="260" text-anchor="middle" fill="#94a3b8" font-size="14">${persona.description?.substring(0, 50) || ''}</text>
        <rect x="50" y="400" width="300" height="2" fill="#334155"/>
        <text x="200" y="440" text-anchor="middle" fill="#64748b" font-size="12">RP Chat 角色卡</text>
        <text x="200" y="460" text-anchor="middle" fill="#64748b" font-size="10">${persona.createdBy?.username || '未知'}</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;