const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const linkService = require('../services/linkService');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

/**
 * 批量获取链接预览
 * POST /api/link-preview/batch
 * Body: { urls: ["https://example.com", "https://github.com"] }
 */
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: '请提供链接数组' });
    }
    
    // 限制批量数量
    const limitedUrls = urls.slice(0, 10);
    
    // 去重
    const uniqueUrls = [...new Set(limitedUrls)];
    
    // 并发获取所有链接预览（限制并发数）
    const results = await Promise.all(
      uniqueUrls.map(url => linkService.analyzeUrl(url).catch(err => ({
        originalUrl: url,
        url: url,
        title: '无法加载预览',
        description: err.message || '',
        image: '',
        favicon: '',
        siteName: '',
        type: 'website',
        linkType: 'website',
        riskLevel: 'safe',
        warnings: [],
        isShortUrl: false,
        error: true
      })))
    );
    
    res.json({ previews: results });
    
  } catch (error) {
    console.error('批量获取链接预览失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取单个链接预览
 * POST /api/link-preview/single
 * Body: { url: "https://example.com" }
 */
router.post('/single', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供链接' });
    }
    
    const preview = await linkService.analyzeUrl(url);
    res.json({ preview });
    
  } catch (error) {
    console.error('获取链接预览失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 仅展开短链接
 * POST /api/link-preview/expand
 * Body: { url: "https://bit.ly/xxx" }
 */
router.post('/expand', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供链接' });
    }
    
    if (!linkService.isShortUrl(url)) {
      return res.json({ originalUrl: url, expandedUrl: url, isShortUrl: false });
    }
    
    const expandedUrl = await linkService.expandShortUrl(url);
    res.json({
      originalUrl: url,
      expandedUrl: expandedUrl !== url ? expandedUrl : undefined,
      isShortUrl: true
    });
    
  } catch (error) {
    console.error('展开短链接失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;