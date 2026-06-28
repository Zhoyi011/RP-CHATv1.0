// server/src/routes/novel.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 模型
const Novel = require('../models/Novel');
const Chapter = require('../models/Chapter');
const Persona = require('../models/Persona');
const AuthorApplication = require('../models/AuthorApplication');
const Favorite = require('../models/Favorite');
const FollowAuthor = require('../models/FollowAuthor');
const Comment = require('../models/Comment');
const Donation = require('../models/Donation');
const User = require('../models/User');
const TransactionRecord = require('../models/TransactionRecord');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取当前激活的角色
const getActivePersona = async (userId) => {
  const ActivePersona = require('../models/ActivePersona');
  const active = await ActivePersona.findOne({ userId }).populate('personaId');
  return active?.personaId || null;
};

// ========== 公开接口 ==========

// 获取小说列表（分页/分类/搜索）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, search, sort = 'latest', authorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { isActive: true };
    if (category && category !== '全部') query.category = category;
    if (status) query.status = status;
    if (authorId) query.authorPersonaId = authorId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortOption = {};
    switch (sort) {
      case 'latest': sortOption = { createdAt: -1 }; break;
      case 'popular': sortOption = { views: -1 }; break;
      case 'likes': sortOption = { likes: -1 }; break;
      case 'wordCount': sortOption = { wordCount: -1 }; break;
      default: sortOption = { createdAt: -1 };
    }
    
    const [novels, total] = await Promise.all([
      Novel.find(query).sort(sortOption).skip(skip).limit(parseInt(limit)).populate('authorPersonaId', 'name displayName avatar isAuthor followersCount level title'),
      Novel.countDocuments(query)
    ]);
    
    res.json({
      novels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取小说列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 具体路径的路由（必须在 /:id 之前） ==========

// 获取章节内容
router.get('/:novelId/chapter/:chapterId', async (req, res) => {
  try {
    const chapter = await Chapter.findOne({
      _id: req.params.chapterId,
      novelId: req.params.novelId,
      isPublished: true
    });
    
    if (!chapter) return res.status(404).json({ error: '章节不存在' });
    
    await Chapter.findByIdAndUpdate(chapter._id, { $inc: { views: 1 } });
    
    const [prevChapter, nextChapter] = await Promise.all([
      Chapter.findOne({ novelId: req.params.novelId, chapterNumber: chapter.chapterNumber - 1, isPublished: true }).select('_id chapterNumber title'),
      Chapter.findOne({ novelId: req.params.novelId, chapterNumber: chapter.chapterNumber + 1, isPublished: true }).select('_id chapterNumber title')
    ]);
    
    res.json({
      chapter,
      prev: prevChapter,
      next: nextChapter
    });
  } catch (error) {
    console.error('获取章节失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取小说评论
router.get('/:novelId/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const comments = await Comment.find({ 
      novelId: req.params.novelId, 
      isDeleted: false,
      parentCommentId: null 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('personaId', 'name displayName avatar level title');
    
    const total = await Comment.countDocuments({ novelId: req.params.novelId, isDeleted: false, parentCommentId: null });
    
    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的申请状态
router.get('/my-application', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.query;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const application = await AuthorApplication.findOne({
      applicantPersonaId: personaId,
      applicantUserId: req.userId
    }).sort({ createdAt: -1 });
    
    res.json({ application });
  } catch (error) {
    console.error('获取申请状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的收藏
router.get('/my/favorites', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.query;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const favorites = await Favorite.find({ userId: req.userId, personaId })
      .populate('novelId')
      .sort({ createdAt: -1 });
    
    res.json({ favorites });
  } catch (error) {
    console.error('获取收藏失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的关注
router.get('/my/follows', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.query;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const follows = await FollowAuthor.find({ userId: req.userId, personaId })
      .populate('authorPersonaId', 'name displayName avatar isAuthor followersCount createdNovelCount level title');
    
    res.json({ follows });
  } catch (error) {
    console.error('获取关注失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取小说详情（通配符 - 必须放在所有具体路径之后）
router.get('/:id', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id).populate('authorPersonaId', 'name displayName avatar isAuthor followersCount totalDonationIncome level title');
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    await Novel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    
    const chapters = await Chapter.find({ novelId: novel._id, isPublished: true })
      .sort({ chapterNumber: 1 })
      .select('_id chapterNumber title wordCount createdAt');
    
    const [favoriteCount, followCount, commentCount, donationTotal] = await Promise.all([
      Favorite.countDocuments({ novelId: novel._id }),
      FollowAuthor.countDocuments({ authorPersonaId: novel.authorPersonaId._id }),
      Comment.countDocuments({ novelId: novel._id, isDeleted: false }),
      Donation.aggregate([
        { $match: { novelId: novel._id } },
        { $group: { _id: null, total: { $sum: '$diamondAmount' } } }
      ])
    ]);
    
    res.json({
      novel,
      chapters,
      stats: {
        favoriteCount,
        followCount,
        commentCount,
        donationTotal: donationTotal[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('获取小说详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 需要登录的接口 ==========

// 申请成为作者
router.post('/apply-author', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    if (persona.isAuthor) return res.status(400).json({ error: '该角色已经是作者了' });
    
    const existingApplication = await AuthorApplication.findOne({
      applicantPersonaId: personaId,
      status: 'pending'
    });
    if (existingApplication) return res.status(400).json({ error: '已有待审核的申请' });
    
    const user = await User.findById(req.userId);
    const totalDiamonds = (user.paidDiamonds || 0) + (user.freeDiamonds || 0);
    if (totalDiamonds < 10) return res.status(400).json({ error: '钻石不足，需要10钻石' });
    
    let remainingCost = 10;
    let paidDeduction = 0;
    let freeDeduction = 0;
    
    if (user.freeDiamonds >= remainingCost) {
      freeDeduction = remainingCost;
      user.freeDiamonds -= remainingCost;
      remainingCost = 0;
    } else {
      freeDeduction = user.freeDiamonds;
      remainingCost -= user.freeDiamonds;
      user.freeDiamonds = 0;
      paidDeduction = remainingCost;
      user.paidDiamonds -= remainingCost;
      user.diamonds = (user.paidDiamonds || 0) + (user.freeDiamonds || 0);
    }
    
    await user.save();
    
    await TransactionRecord.create({
      userId: req.userId,
      type: 'author_application',
      amount: -10,
      paidAmount: -paidDeduction,
      freeAmount: -freeDeduction,
      diamondType: paidDeduction > 0 ? 'paid' : 'free',
      balanceAfter: user.diamonds,
      description: `申请作者资格（角色：${persona.displayName || persona.name}）`
    });
    
    const application = await AuthorApplication.create({
      applicantPersonaId: personaId,
      applicantUserId: req.userId,
      diamondCost: 10
    });
    
    res.json({ 
      success: true, 
      message: '申请已提交，等待管理员审核',
      application 
    });
  } catch (error) {
    console.error('申请作者失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 收藏/取消收藏小说
router.post('/favorite/:novelId', authMiddleware, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { personaId } = req.body;
    
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const existing = await Favorite.findOne({
      userId: req.userId,
      personaId,
      novelId
    });
    
    if (existing) {
      await existing.deleteOne();
      res.json({ success: true, action: 'removed', message: '已取消收藏' });
    } else {
      await Favorite.create({
        userId: req.userId,
        personaId,
        novelId
      });
      res.json({ success: true, action: 'added', message: '已收藏' });
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 关注/取消关注作者
router.post('/follow/:authorPersonaId', authMiddleware, async (req, res) => {
  try {
    const { authorPersonaId } = req.params;
    const { personaId } = req.body;
    
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const author = await Persona.findById(authorPersonaId);
    if (!author) return res.status(404).json({ error: '作者不存在' });
    
    const existing = await FollowAuthor.findOne({
      userId: req.userId,
      personaId,
      authorPersonaId
    });
    
    if (existing) {
      await existing.deleteOne();
      await Persona.findByIdAndUpdate(authorPersonaId, { $inc: { followersCount: -1 } });
      res.json({ success: true, action: 'unfollowed', message: '已取消关注' });
    } else {
      await FollowAuthor.create({
        userId: req.userId,
        personaId,
        authorPersonaId
      });
      await Persona.findByIdAndUpdate(authorPersonaId, { $inc: { followersCount: 1 } });
      res.json({ success: true, action: 'followed', message: '已关注' });
    }
  } catch (error) {
    console.error('关注操作失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发表评论
router.post('/comment/:novelId', authMiddleware, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { content, chapterId, parentCommentId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    
    const activePersona = await getActivePersona(req.userId);
    if (!activePersona) return res.status(400).json({ error: '请先选择角色' });
    
    const comment = await Comment.create({
      novelId,
      chapterId: chapterId || null,
      parentCommentId: parentCommentId || null,
      userId: req.userId,
      personaId: activePersona._id,
      personaName: activePersona.displayName || activePersona.name,
      content: content.trim()
    });
    
    res.json({ success: true, comment });
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 点赞评论
router.post('/comment/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    
    const hasLiked = comment.likedBy.includes(req.userId);
    
    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== req.userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(req.userId);
      comment.likes += 1;
    }
    
    await comment.save();
    
    res.json({ success: true, likes: comment.likes, hasLiked: !hasLiked });
  } catch (error) {
    console.error('点赞评论失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 赞赏作者（仅付费钻石）
router.post('/donate/:novelId', authMiddleware, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { diamondAmount, message } = req.body;
    
    if (!diamondAmount || diamondAmount < 1) {
      return res.status(400).json({ error: '请输入有效的赞赏金额' });
    }
    
    const novel = await Novel.findById(novelId).populate('authorPersonaId');
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const activePersona = await getActivePersona(req.userId);
    if (!activePersona) return res.status(400).json({ error: '请先选择角色' });
    
    const user = await User.findById(req.userId);
    const paidDiamonds = user.paidDiamonds || 0;
    
    if (paidDiamonds < diamondAmount) {
      return res.status(400).json({ error: `付费钻石不足，当前仅有 ${paidDiamonds} 付费钻石` });
    }
    
    user.paidDiamonds = paidDiamonds - diamondAmount;
    user.diamonds = (user.paidDiamonds || 0) + (user.freeDiamonds || 0);
    await user.save();
    
    await Donation.create({
      fromPersonaId: activePersona._id,
      fromUserId: req.userId,
      toPersonaId: novel.authorPersonaId._id,
      toUserId: novel.authorPersonaId.userId,
      novelId,
      diamondAmount,
      message: message || ''
    });
    
    await Persona.findByIdAndUpdate(novel.authorPersonaId._id, {
      $inc: { totalDonationIncome: diamondAmount }
    });
    
    await TransactionRecord.create({
      userId: req.userId,
      type: 'donation',
      amount: -diamondAmount,
      paidAmount: -diamondAmount,
      freeAmount: 0,
      diamondType: 'paid',
      balanceAfter: user.diamonds,
      description: `赞赏小说《${novel.title}》`
    });

    // 🔥 Phase 1: 赞赏获得经验（每1钻石 = 5经验）
    try {
      const experienceService = require('../services/experienceService');
      await experienceService.addExp(
        activePersona._id,
        req.userId,
        'GOT_DONATION_PER_DIAMOND',
        diamondAmount * 5,
        { isPublicSquare: false }
      );
    } catch (expError) {
      console.error('添加经验值失败（赞赏）:', expError);
    }
    
    res.json({ 
      success: true, 
      message: `赞赏成功！已送出 ${diamondAmount} 钻石`,
      newBalance: user.diamonds
    });
  } catch (error) {
    console.error('赞赏失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 作者专用接口（需要作者权限）==========

// 获取我的小说列表
router.get('/author/my-novels', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.query;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    if (!persona.isAuthor) return res.status(403).json({ error: '该角色不是作者' });
    
    const novels = await Novel.find({ 
      authorPersonaId: personaId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .select('_id title cover category status wordCount totalChapters views likes createdAt updatedAt');
    
    res.json({ 
      novels,
      novelSlots: persona.novelSlots,
      createdNovelCount: persona.createdNovelCount,
      remainingSlots: persona.novelSlots - persona.createdNovelCount
    });
  } catch (error) {
    console.error('获取我的小说列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建小说
router.post('/author/novel', authMiddleware, async (req, res) => {
  try {
    const { personaId, title, description, category, tags, cover } = req.body;
    
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    if (!title || title.trim().length === 0) return res.status(400).json({ error: '书名不能为空' });
    if (!description || description.trim().length === 0) return res.status(400).json({ error: '简介不能为空' });
    if (!category) return res.status(400).json({ error: '请选择分类' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    if (!persona.isAuthor) return res.status(403).json({ error: '该角色不是作者' });
    
    if (persona.createdNovelCount >= persona.novelSlots) {
      return res.status(400).json({ 
        error: `创作数量已达上限（${persona.novelSlots}/${persona.novelSlots}），可花费10钻石扩展名额`,
        needExpand: true
      });
    }
    
    let processedTags = [];
    if (tags && Array.isArray(tags)) {
      processedTags = tags.slice(0, 5).map(t => t.trim()).filter(t => t.length > 0);
    }
    
    const novel = await Novel.create({
      title: title.trim(),
      authorPersonaId: personaId,
      authorName: persona.displayName || persona.name,
      description: description.trim(),
      category,
      tags: processedTags,
      cover: cover || ''
    });
    
    await Persona.findByIdAndUpdate(personaId, {
      $inc: { createdNovelCount: 1 }
    });
    
    res.json({ 
      success: true, 
      message: '小说创建成功',
      novel 
    });
  } catch (error) {
    console.error('创建小说失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 编辑小说信息
router.put('/author/novel/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, cover, status } = req.body;
    
    const novel = await Novel.findById(id);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限编辑' });
    
    if (title !== undefined) novel.title = title.trim();
    if (description !== undefined) novel.description = description.trim();
    if (category !== undefined) novel.category = category;
    if (status !== undefined) novel.status = status;
    if (cover !== undefined) novel.cover = cover;
    if (tags !== undefined) {
      novel.tags = tags.slice(0, 5).map(t => t.trim()).filter(t => t.length > 0);
    }
    
    await novel.save();
    
    res.json({ success: true, message: '小说信息已更新', novel });
  } catch (error) {
    console.error('编辑小说失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除小说（软删除）
router.delete('/author/novel/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const novel = await Novel.findById(id);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    if (novel.isActive === false) {
      return res.json({ success: true, message: '小说已删除' });
    }
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限删除' });
    
    novel.isActive = false;
    await novel.save();
    
    await Persona.findByIdAndUpdate(novel.authorPersonaId, {
      $inc: { createdNovelCount: -1 }
    });
    
    if (persona.createdNovelCount - 1 < 0) {
      await Persona.findByIdAndUpdate(novel.authorPersonaId, {
        $set: { createdNovelCount: 0 }
      });
    }
    
    res.json({ success: true, message: '小说已删除' });
  } catch (error) {
    console.error('删除小说失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 扩展创作名额（花费10钻石）
router.post('/author/expand-slot', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) return res.status(404).json({ error: '角色不存在' });
    if (!persona.isAuthor) return res.status(403).json({ error: '该角色不是作者' });
    
    const user = await User.findById(req.userId);
    const totalDiamonds = (user.paidDiamonds || 0) + (user.freeDiamonds || 0);
    
    if (totalDiamonds < 10) {
      return res.status(400).json({ error: '钻石不足，需要10钻石' });
    }
    
    let remainingCost = 10;
    let paidDeduction = 0;
    let freeDeduction = 0;
    
    if (user.freeDiamonds >= remainingCost) {
      freeDeduction = remainingCost;
      user.freeDiamonds -= remainingCost;
      remainingCost = 0;
    } else {
      freeDeduction = user.freeDiamonds;
      remainingCost -= user.freeDiamonds;
      user.freeDiamonds = 0;
      paidDeduction = remainingCost;
      user.paidDiamonds -= remainingCost;
      user.diamonds = (user.paidDiamonds || 0) + (user.freeDiamonds || 0);
    }
    
    await user.save();
    
    await TransactionRecord.create({
      userId: req.userId,
      type: 'expand_novel_slot',
      amount: -10,
      paidAmount: -paidDeduction,
      freeAmount: -freeDeduction,
      diamondType: paidDeduction > 0 ? 'paid' : 'free',
      balanceAfter: user.diamonds,
      description: `扩展创作名额（角色：${persona.displayName || persona.name}）`
    });
    
    await Persona.findByIdAndUpdate(personaId, {
      $inc: { novelSlots: 1 }
    });
    
    const updatedPersona = await Persona.findById(personaId);
    
    res.json({ 
      success: true, 
      message: '扩展成功！新增1个创作名额',
      novelSlots: updatedPersona.novelSlots,
      createdNovelCount: updatedPersona.createdNovelCount,
      remainingSlots: updatedPersona.novelSlots - updatedPersona.createdNovelCount
    });
  } catch (error) {
    console.error('扩展名额失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 章节管理接口 ==========

// 获取小说的所有章节（作者视角，含未发布）
router.get('/author/novel/:novelId/chapters', authMiddleware, async (req, res) => {
  try {
    const { novelId } = req.params;
    
    const novel = await Novel.findById(novelId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限查看' });
    
    const chapters = await Chapter.find({ novelId })
      .sort({ chapterNumber: 1 })
      .select('_id chapterNumber title wordCount views isPublished createdAt updatedAt');
    
    res.json({ chapters });
  } catch (error) {
    console.error('获取章节列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建章节
router.post('/author/novel/:novelId/chapter', authMiddleware, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { title, content, isPublished } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '章节标题不能为空' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '章节内容不能为空' });
    }
    
    const novel = await Novel.findById(novelId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限添加章节' });
    
    const lastChapter = await Chapter.findOne({ novelId }).sort({ chapterNumber: -1 });
    const nextChapterNumber = (lastChapter?.chapterNumber || 0) + 1;
    
    const cleanContent = content.replace(/\s+/g, '');
    const chineseChars = cleanContent.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || [];
    const englishChars = cleanContent.match(/[a-zA-Z0-9]/g) || [];
    const wordCount = chineseChars.length + englishChars.length;
    
    const chapter = await Chapter.create({
      novelId,
      chapterNumber: nextChapterNumber,
      title: title.trim(),
      content: content,
      wordCount,
      isPublished: isPublished !== false
    });
    
    const totalChapters = await Chapter.countDocuments({ novelId, isPublished: true });
    const totalWordCount = await Chapter.aggregate([
      { $match: { novelId: novel._id, isPublished: true } },
      { $group: { _id: null, total: { $sum: '$wordCount' } } }
    ]);
    
    novel.totalChapters = totalChapters;
    novel.wordCount = totalWordCount[0]?.total || 0;
    await novel.save();

    // 🔥 Phase 1: 发布章节获得经验（仅当发布时）
    if (isPublished !== false) {
      try {
        const experienceService = require('../services/experienceService');
        await experienceService.addExp(
          persona._id,
          req.userId,
          'PUBLISH_CHAPTER',
          null,
          { isPublicSquare: false }
        );
      } catch (expError) {
        console.error('添加经验值失败（发布章节）:', expError);
      }
    }
    
    res.json({ 
      success: true, 
      message: '章节创建成功',
      chapter,
      chapterNumber: nextChapterNumber
    });
  } catch (error) {
    console.error('创建章节失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 编辑章节
router.put('/author/chapter/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPublished } = req.body;
    
    const chapter = await Chapter.findById(id);
    if (!chapter) return res.status(404).json({ error: '章节不存在' });
    
    const novel = await Novel.findById(chapter.novelId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限编辑' });
    
    if (title !== undefined) chapter.title = title.trim();
    if (content !== undefined) {
      chapter.content = content;
      const cleanContent = content.replace(/\s+/g, '');
      const chineseChars = cleanContent.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || [];
      const englishChars = cleanContent.match(/[a-zA-Z0-9]/g) || [];
      chapter.wordCount = chineseChars.length + englishChars.length;
    }
    if (isPublished !== undefined) chapter.isPublished = isPublished;
    
    await chapter.save();
    
    const totalWordCount = await Chapter.aggregate([
      { $match: { novelId: novel._id, isPublished: true } },
      { $group: { _id: null, total: { $sum: '$wordCount' } } }
    ]);
    novel.wordCount = totalWordCount[0]?.total || 0;
    await novel.save();

    // 🔥 Phase 1: 如果章节从草稿变为发布，获得经验
    if (isPublished === true && chapter.isPublished === true) {
      try {
        const experienceService = require('../services/experienceService');
        await experienceService.addExp(
          persona._id,
          req.userId,
          'PUBLISH_CHAPTER',
          null,
          { isPublicSquare: false }
        );
      } catch (expError) {
        console.error('添加经验值失败（发布章节）:', expError);
      }
    }
    
    res.json({ success: true, message: '章节已更新', chapter });
  } catch (error) {
    console.error('编辑章节失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除章节
router.delete('/author/chapter/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const chapter = await Chapter.findById(id);
    if (!chapter) return res.status(404).json({ error: '章节不存在' });
    
    const novel = await Novel.findById(chapter.novelId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限删除' });
    
    await chapter.deleteOne();
    
    const remainingChapters = await Chapter.find({ novelId: novel._id }).sort({ chapterNumber: 1 });
    for (let i = 0; i < remainingChapters.length; i++) {
      if (remainingChapters[i].chapterNumber !== i + 1) {
        remainingChapters[i].chapterNumber = i + 1;
        await remainingChapters[i].save();
      }
    }
    
    const totalChapters = await Chapter.countDocuments({ novelId: novel._id, isPublished: true });
    const totalWordCount = await Chapter.aggregate([
      { $match: { novelId: novel._id, isPublished: true } },
      { $group: { _id: null, total: { $sum: '$wordCount' } } }
    ]);
    
    novel.totalChapters = totalChapters;
    novel.wordCount = totalWordCount[0]?.total || 0;
    await novel.save();
    
    res.json({ success: true, message: '章节已删除' });
  } catch (error) {
    console.error('删除章节失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单章详情（作者编辑用）
router.get('/author/chapter/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const chapter = await Chapter.findById(id);
    if (!chapter) return res.status(404).json({ error: '章节不存在' });
    
    const novel = await Novel.findById(chapter.novelId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });
    
    const persona = await Persona.findOne({ _id: novel.authorPersonaId, userId: req.userId });
    if (!persona) return res.status(403).json({ error: '无权限查看' });
    
    res.json({ chapter });
  } catch (error) {
    console.error('获取章节失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员接口 ==========

// 获取待审核的作者申请
router.get('/admin/applications', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '无权限访问' });
    }
    
    const applications = await AuthorApplication.find({ status: 'pending' })
      .populate('applicantPersonaId', 'name displayName avatar level title')
      .populate('applicantUserId', 'username email')
      .sort({ appliedAt: -1 });
    
    res.json({ applications });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 审核作者申请
router.put('/admin/applications/:id/review', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '无权限访问' });
    }
    
    const { id } = req.params;
    const { status, reviewComment } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    
    const application = await AuthorApplication.findById(id);
    if (!application) return res.status(404).json({ error: '申请不存在' });
    if (application.status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理' });
    }
    
    application.status = status;
    application.reviewComment = reviewComment || '';
    application.reviewedBy = req.userId;
    application.reviewedAt = new Date();
    await application.save();
    
    if (status === 'approved') {
      await Persona.findByIdAndUpdate(application.applicantPersonaId, {
        isAuthor: true,
        authorApprovedAt: new Date()
      });
    }
    
    res.json({ success: true, message: status === 'approved' ? '已批准作者申请' : '已拒绝作者申请' });
  } catch (error) {
    console.error('审核申请失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;