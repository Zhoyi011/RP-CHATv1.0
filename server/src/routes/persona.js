// server/src/routes/persona.js
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
    const { name, description, tags, avatar } = req.body;
    
    // 验证必填字段
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '角色名称至少需要2个字符' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: '角色描述至少需要10个字符' });
    }
    // 🔥 头像必填
    if (!avatar || avatar.trim().length === 0) {
      return res.status(400).json({ error: '请上传角色头像' });
    }
    
    // 验证标签（最多5个，每个最多15字符）
    let validTags = [];
    if (tags && Array.isArray(tags)) {
      if (tags.length > 5) {
        return res.status(400).json({ error: '标签最多5个' });
      }
      for (const tag of tags) {
        if (tag.length > 15) {
          return res.status(400).json({ error: '单个标签不能超过15个字符' });
        }
        if (tag.trim()) {
          validTags.push(tag.trim());
        }
      }
    }
    
    // 🔥 检查用户是否已有同名角色（已批准）
    const existing = await Persona.findOne({
      name: name.trim(),
      userId: req.userId,
      status: 'approved'
    });
    
    if (existing) {
      return res.status(400).json({ error: '你已经拥有同名的角色了' });
    }
    
    // 获取当前用户
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 🔥 创建角色申请（直接设置 userId = 申请人，审核通过后直接可用）
    const persona = new Persona({
      name: name.trim(),
      displayName: name.trim(),
      description: description.trim(),
      tags: validTags,
      avatar: avatar,  // 头像必填
      userId: req.userId,  // 直接绑定用户
      createdBy: req.userId,
      status: 'pending',
      sameNameNumber: 1  // 临时值，审核通过时重新计算
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
  if (req.userRole !== 'admin' && req.userRole !== 'owner' && req.userRole !== 'super_admin') {
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

// 🔥 审核角色（通过后直接可用，不需要再"使用"）
router.post('/review/:id', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner' && req.userRole !== 'super_admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  try {
    const { status, comment } = req.body;
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: '无效的审核状态' });
    }
    
    const persona = await Persona.findById(req.params.id);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    if (status === 'approved') {
      // 🔥 重新计算同名编号（基于所有已批准的同名角色）
      const sameNameNumber = await Persona.getNextSameNameNumber(persona.name, persona._id);
      persona.sameNameNumber = sameNameNumber;
      persona.status = 'approved';
      persona.reviewComment = comment || '';
      persona.reviewedBy = req.userId;
      persona.reviewedAt = new Date();
      // userId 已经在创建时设置，不需要再改
    } else {
      // 拒绝：可以删除或标记为拒绝
      persona.status = 'rejected';
      persona.reviewComment = comment || '未通过审核';
      persona.reviewedBy = req.userId;
      persona.reviewedAt = new Date();
    }
    
    await persona.save();
    
    res.json({
      message: `角色已${status === 'approved' ? '通过' : '拒绝'}`,
      persona: {
        _id: persona._id,
        name: persona.name,
        displayName: persona.displayName,
        status: persona.status,
        sameNameNumber: persona.sameNameNumber
      }
    });
    
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 角色搜索和主页 ==========

// 🔥 搜索角色（只返回他人的已批准角色，不包含自己的）
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ personas: [], total: 0 });
    }
    
    const searchRegex = new RegExp(q, 'i');
    
    // 🔥 只搜索已批准且不属于当前用户的角色
    const query = {
      status: 'approved',
      userId: { $ne: req.userId },  // 排除自己的角色
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
      .populate('relationships.targetPersonaId', 'name displayName avatar sameNameNumber');
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    // 获取装备的图片 URL
    const ShopItem = require('../models/ShopItem');
    let equippedWithUrls = { avatarFrame: null, ring: null, relationshipCard: null };
    
    if (persona.equipped) {
      if (persona.equipped.avatarFrame) {
        const frame = await ShopItem.findById(persona.equipped.avatarFrame);
        if (frame) equippedWithUrls.avatarFrame = frame.image;
      }
      if (persona.equipped.ring) {
        const ring = await ShopItem.findById(persona.equipped.ring);
        if (ring) equippedWithUrls.ring = ring.image;
      }
      if (persona.equipped.relationshipCard) {
        const card = await ShopItem.findById(persona.equipped.relationshipCard);
        if (card) equippedWithUrls.relationshipCard = card.image;
      }
    }
    
    res.json({
      _id: persona._id,
      name: persona.name,
      displayName: persona.displayName,
      description: persona.description,
      avatar: persona.avatar,
      tags: persona.tags,
      status: persona.status,
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
      equipped: equippedWithUrls,
      guardianValue: persona.guardianValue || 0
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

// 🔥 删除 /use 路由 - 不再需要复制角色功能
// 用户直接创建自己的角色即可

// ========== 角色互动功能 ==========

// 添加守护
router.post('/:personaId/guardian', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const persona = await Persona.findById(req.params.personaId);
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    // 检查金币/钻石是否足够（需要实现）
    // await user.deductCoins(amount);
    
    persona.guardians.push({
      userId: req.userId,
      amount,
      createdAt: new Date()
    });
    persona.totalGuardianAmount = (persona.totalGuardianAmount || 0) + amount;
    await persona.save();
    
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
    
    // 检查是否已经是关系
    const existing = persona.relationships.find(r => r.targetPersonaId.toString() === targetPersonaId);
    if (existing) {
      return res.status(400).json({ error: '已经建立过关系了' });
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

// 获取角色动态列表
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
    console.error('点赞失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;