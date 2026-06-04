// server/src/routes/emoji.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserEmoji = require('../models/UserEmoji');
const EmojiCategory = require('../models/EmojiCategory');
const cloudinary = require('cloudinary').v2;

// ============ 分组管理 ============

// 获取我的所有分组
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await EmojiCategory.find({ userId: req.user.id })
      .sort({ order: 1, createdAt: 1 });
    
    // 添加"未分类"虚拟分组
    const uncategorizedCount = await UserEmoji.countDocuments({
      userId: req.user.id,
      categoryId: null,
      isBanned: false
    });
    
    res.json({
      categories,
      uncategorizedCount
    });
  } catch (error) {
    console.error('获取分组失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建分组
router.post('/categories', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '分组名称不能为空' });
    }
    if (name.length > 20) {
      return res.status(400).json({ error: '分组名称不能超过20个字符' });
    }
    
    const existing = await EmojiCategory.findOne({
      userId: req.user.id,
      name: name.trim()
    });
    
    if (existing) {
      return res.status(400).json({ error: '分组名称已存在' });
    }
    
    const category = new EmojiCategory({
      userId: req.user.id,
      name: name.trim()
    });
    
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('创建分组失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新分组
router.put('/categories/:categoryId', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await EmojiCategory.findOne({
      _id: req.params.categoryId,
      userId: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({ error: '分组不存在' });
    }
    
    if (name && name.trim()) {
      if (name.length > 20) {
        return res.status(400).json({ error: '分组名称不能超过20个字符' });
      }
      category.name = name.trim();
    }
    
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('更新分组失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除分组（表情移至未分类）
router.delete('/categories/:categoryId', auth, async (req, res) => {
  try {
    const category = await EmojiCategory.findOne({
      _id: req.params.categoryId,
      userId: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({ error: '分组不存在' });
    }
    
    // 将该分组下的表情移至未分类
    await UserEmoji.updateMany(
      { userId: req.user.id, categoryId: category._id },
      { categoryId: null }
    );
    
    await category.deleteOne();
    res.json({ message: '分组已删除' });
  } catch (error) {
    console.error('删除分组失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ============ 表情管理 ============

// 上传表情（复用 Cloudinary）
router.post('/upload', auth, async (req, res) => {
  try {
    // 检查数量限制
    const count = await UserEmoji.getUserCount(req.user.id);
    if (count >= 300) {
      return res.status(400).json({ error: '表情已达上限（300张），请删除一些后再上传' });
    }
    
    const { imageUrl, publicId, fileSize, width, height, mimeType, keywords } = req.body;
    
    if (!imageUrl || !publicId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const isGif = mimeType === 'image/gif';
    
    const emoji = new UserEmoji({
      userId: req.user.id,
      url: imageUrl,
      publicId,
      keywords: keywords || [],
      fileSize: fileSize || 0,
      width: width || 0,
      height: height || 0,
      mimeType,
      isGif
    });
    
    await emoji.save();
    
    res.json({
      id: emoji._id,
      url: emoji.url,
      publicId: emoji.publicId,
      isGif: emoji.isGif,
      keywords: emoji.keywords
    });
  } catch (error) {
    console.error('上传表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量上传（最多10张）
router.post('/batch-upload', auth, async (req, res) => {
  try {
    const { emojis } = req.body; // [{ imageUrl, publicId, fileSize, width, height, mimeType }]
    
    if (!emojis || !Array.isArray(emojis)) {
      return res.status(400).json({ error: '无效的参数' });
    }
    
    if (emojis.length > 10) {
      return res.status(400).json({ error: '单次最多上传10张表情' });
    }
    
    const currentCount = await UserEmoji.getUserCount(req.user.id);
    if (currentCount + emojis.length > 300) {
      return res.status(400).json({ 
        error: `上传后表情数将超过上限（300张），当前已有 ${currentCount} 张，最多可再上传 ${300 - currentCount} 张` 
      });
    }
    
    const savedEmojis = [];
    for (const emojiData of emojis) {
      const isGif = emojiData.mimeType === 'image/gif';
      const emoji = new UserEmoji({
        userId: req.user.id,
        url: emojiData.imageUrl,
        publicId: emojiData.publicId,
        keywords: [],
        fileSize: emojiData.fileSize || 0,
        width: emojiData.width || 0,
        height: emojiData.height || 0,
        mimeType: emojiData.mimeType,
        isGif
      });
      await emoji.save();
      savedEmojis.push({
        id: emoji._id,
        url: emoji.url,
        isGif: emoji.isGif
      });
    }
    
    res.json({ emojis: savedEmojis });
  } catch (error) {
    console.error('批量上传失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取我的表情列表
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, categoryId, sortBy = 'recent' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { userId: req.user.id, isBanned: false };
    if (categoryId === 'null') {
      query.categoryId = null;
    } else if (categoryId) {
      query.categoryId = categoryId;
    }
    
    let sort = {};
    switch (sortBy) {
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'favorite':
        sort = { isFavorite: -1, useCount: -1 };
        break;
      case 'most-used':
        sort = { useCount: -1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    const emojis = await UserEmoji.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UserEmoji.countDocuments(query);
    
    res.json({
      emojis,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('获取表情列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取常用表情（按使用次数）
router.get('/frequent', auth, async (req, res) => {
  try {
    const emojis = await UserEmoji.find({
      userId: req.user.id,
      isBanned: false
    })
      .sort({ useCount: -1, createdAt: -1 })
      .limit(30);
    
    res.json({ emojis });
  } catch (error) {
    console.error('获取常用表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取收藏表情
router.get('/favorites', auth, async (req, res) => {
  try {
    const emojis = await UserEmoji.find({
      userId: req.user.id,
      isFavorite: true,
      isBanned: false
    })
      .sort({ useCount: -1, createdAt: -1 });
    
    res.json({ emojis });
  } catch (error) {
    console.error('获取收藏表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新表情（分组、关键词、收藏）
router.put('/:emojiId', auth, async (req, res) => {
  try {
    const { categoryId, keywords, isFavorite } = req.body;
    const emoji = await UserEmoji.findOne({
      _id: req.params.emojiId,
      userId: req.user.id
    });
    
    if (!emoji) {
      return res.status(404).json({ error: '表情不存在' });
    }
    
    if (categoryId !== undefined) {
      // 验证分组属于当前用户
      if (categoryId) {
        const category = await EmojiCategory.findOne({
          _id: categoryId,
          userId: req.user.id
        });
        if (!category) {
          return res.status(400).json({ error: '分组不存在' });
        }
      }
      emoji.categoryId = categoryId || null;
    }
    
    if (keywords !== undefined) {
      emoji.keywords = keywords.map(k => k.toLowerCase().trim());
    }
    
    if (isFavorite !== undefined) {
      emoji.isFavorite = isFavorite;
    }
    
    await emoji.save();
    res.json(emoji);
  } catch (error) {
    console.error('更新表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除表情（真实删除）
router.delete('/:emojiId', auth, async (req, res) => {
  try {
    const emoji = await UserEmoji.findOne({
      _id: req.params.emojiId,
      userId: req.user.id
    });
    
    if (!emoji) {
      return res.status(404).json({ error: '表情不存在' });
    }
    
    // 从 Cloudinary 删除
    try {
      await cloudinary.uploader.destroy(emoji.publicId);
    } catch (cloudError) {
      console.error('Cloudinary删除失败:', cloudError);
      // 继续删除数据库记录
    }
    
    await emoji.deleteOne();
    res.json({ message: '表情已删除' });
  } catch (error) {
    console.error('删除表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量删除
router.post('/batch-delete', auth, async (req, res) => {
  try {
    const { emojiIds } = req.body;
    
    if (!emojiIds || !Array.isArray(emojiIds) || emojiIds.length === 0) {
      return res.status(400).json({ error: '请选择要删除的表情' });
    }
    
    if (emojiIds.length > 50) {
      return res.status(400).json({ error: '单次最多删除50张表情' });
    }
    
    const emojis = await UserEmoji.find({
      _id: { $in: emojiIds },
      userId: req.user.id
    });
    
    // 从 Cloudinary 批量删除
    for (const emoji of emojis) {
      try {
        await cloudinary.uploader.destroy(emoji.publicId);
      } catch (e) {
        console.error('Cloudinary删除失败:', emoji.publicId);
      }
    }
    
    await UserEmoji.deleteMany({
      _id: { $in: emojiIds },
      userId: req.user.id
    });
    
    res.json({ message: `已删除 ${emojis.length} 张表情` });
  } catch (error) {
    console.error('批量删除失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索表情（按关键词）
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ emojis: [] });
    }
    
    const searchTerm = q.toLowerCase().trim();
    
    const emojis = await UserEmoji.find({
      userId: req.user.id,
      isBanned: false,
      $or: [
        { keywords: { $in: [searchTerm] } },
        { keywords: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .sort({ useCount: -1 })
      .limit(parseInt(limit));
    
    res.json({ emojis });
  } catch (error) {
    console.error('搜索表情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 举报表情
router.post('/:emojiId/report', auth, async (req, res) => {
  try {
    const emoji = await UserEmoji.findById(req.params.emojiId);
    
    if (!emoji) {
      return res.status(404).json({ error: '表情不存在' });
    }
    
    // 不能举报自己的表情
    if (emoji.userId.toString() === req.user.id) {
      return res.status(400).json({ error: '不能举报自己的表情' });
    }
    
    emoji.reportCount += 1;
    
    // 被举报 3 次自动下架
    if (emoji.reportCount >= 3) {
      emoji.isBanned = true;
    }
    
    await emoji.save();
    res.json({ message: '举报成功，审核后将处理' });
  } catch (error) {
    console.error('举报失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 增加使用次数（发送表情时调用）
router.post('/:emojiId/use', auth, async (req, res) => {
  try {
    await UserEmoji.updateOne(
      { _id: req.params.emojiId, userId: req.user.id },
      { $inc: { useCount: 1 } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('更新使用次数失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;