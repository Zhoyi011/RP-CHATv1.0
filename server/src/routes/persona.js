const express = require('express');
const router = express.Router();
const Persona = require('../models/Persona');
const jwt = require('jsonwebtoken');

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

// 创建角色申请
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    const persona = new Persona({
      name,
      description,
      tags: tags || [],
      createdBy: req.userId,
      status: 'pending'
    });
    
    await persona.save();
    
    res.status(201).json({
      message: '角色申请已提交，等待审核',
      persona: {
        id: persona._id,
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
    const personas = await Persona.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(personas);
  } catch (error) {
    console.error('获取角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员：获取待审核角色
router.get('/pending', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  try {
    const pending = await Persona.find({ status: 'pending' })
      .populate('createdBy', 'username')
      .sort({ createdAt: 1 });
    
    res.json(pending);
  } catch (error) {
    console.error('获取待审核角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员：审核角色
router.post('/review/:id', authMiddleware, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  try {
    const { status, comment } = req.body; // status: 'approved' 或 'rejected'
    
    const persona = await Persona.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewComment: comment,
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
      persona
    });
    
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 角色搜索和主页功能 ==========

// 搜索已审核的角色
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    
    const query = {
      status: 'approved',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { description: { $regex: q, $options: 'i' } }
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
      totalPages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('搜索角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取角色详情（主页）
router.get('/:personaId', authMiddleware, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.personaId)
      .populate('createdBy', 'username email')
      .populate('relationships.targetPersonaId', 'name avatar globalNumber')
      .populate('guardians.userId', 'username avatar');
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    // 增加浏览次数
    persona.viewCount++;
    await persona.save();
    
    res.json(persona.toSafeObject());
    
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
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
      createdBy: req.userId,
      status: 'approved'
    });
    
    if (existing) {
      return res.status(400).json({ error: '你已经拥有这个角色了' });
    }
    
    // 获取当前该角色的使用次数
    const lastUsed = await Persona.findOne({ name: original.name })
      .sort({ usageCount: -1 });
    
    const number = lastUsed ? lastUsed.usageCount + 1 : 1;
    
    // 创建用户的角色副本
    const userPersona = new Persona({
      name: original.name,
      description: original.description,
      tags: original.tags,
      avatar: original.avatar,
      globalNumber: original.globalNumber,
      usageCount: number,
      createdBy: req.userId,
      originalPersonaId: original._id,
      status: 'approved'
    });
    
    await userPersona.save();
    
    // 增加原角色的使用次数
    original.usageCount++;
    await original.save();
    
    res.json({
      message: `已获得角色 ${original.name} No.${number}`,
      persona: userPersona
    });
    
  } catch (error) {
    console.error('使用角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

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
    
    // 检查是否是自己的角色
    if (persona.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: '只能修改自己的角色关系' });
    }
    
    await persona.addRelationship(targetPersonaId, type, cardId);
    await target.addRelationship(req.params.personaId, type, cardId);
    
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
    
    if (persona.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: '只能修改自己的角色关系' });
    }
    
    await persona.removeRelationship(req.params.targetId);
    
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
    
    if (persona.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: '只能发布自己的角色动态' });
    }
    
    await persona.addPost(content, images);
    
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
    const persona = await Persona.findById(req.params.personaId)
      .populate('posts.comments.userId', 'username avatar')
      .populate('posts.likes', 'username');
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在' });
    }
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const posts = persona.posts.slice(start, start + parseInt(limit));
    
    res.json({
      posts,
      total: persona.posts.length,
      page: parseInt(page),
      totalPages: Math.ceil(persona.posts.length / parseInt(limit))
    });
    
  } catch (error) {
    console.error('获取动态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;