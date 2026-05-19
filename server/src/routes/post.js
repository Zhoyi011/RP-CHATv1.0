const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const Persona = require('../models/Persona');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

// 创建帖子
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { personaId, content, images } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: '内容不能超过500字' });
    }
    if (images && images.length > 2) {
      return res.status(400).json({ error: '最多只能上传2张图片' });
    }
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) {
      return res.status(400).json({ error: '角色不存在' });
    }
    
    const post = await Post.create({
      userId: req.userId,
      personaId,
      content: content.trim(),
      images: images || []
    });
    
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户的帖子
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const posts = await Post.find({ userId, isDeleted: false })
      .populate('personaId', 'name displayName avatar sameNameNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Post.countDocuments({ userId, isDeleted: false });
    
    // 检查当前用户是否点赞了这些帖子
    const postsWithLikeStatus = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.includes(req.userId)
    }));
    
    res.json({ posts: postsWithLikeStatus, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取角色主页的帖子
router.get('/persona/:personaId', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const persona = await Persona.findById(personaId);
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    
    const posts = await Post.find({ personaId, isDeleted: false })
      .populate('personaId', 'name displayName avatar sameNameNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Post.countDocuments({ personaId, isDeleted: false });
    
    const postsWithLikeStatus = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.includes(req.userId)
    }));
    
    res.json({ posts: postsWithLikeStatus, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 点赞/取消点赞
router.post('/like/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    
    const hasLiked = post.likes.includes(req.userId);
    
    if (hasLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.userId);
      post.likeCount--;
    } else {
      post.likes.push(req.userId);
      post.likeCount++;
    }
    
    await post.save();
    
    res.json({ 
      success: true, 
      isLiked: !hasLiked, 
      likeCount: post.likeCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除帖子
router.delete('/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findOne({ _id: postId, userId: req.userId });
    if (!post) return res.status(404).json({ error: '帖子不存在或无权限' });
    
    post.isDeleted = true;
    await post.save();
    
    res.json({ success: true, message: '帖子已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;