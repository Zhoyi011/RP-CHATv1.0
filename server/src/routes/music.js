const express = require('express');
const router = express.Router();
const axios = require('axios');

// 检查 API Key 是否配置
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.warn('⚠️ [music] YOUTUBE_API_KEY 未配置，音乐搜索功能将不可用');
}

/**
 * 解析 ISO 8601 时长格式 (PT1H2M3S -> 1:02:03)
 */
function parseDuration(duration) {
  if (!duration) return '0:00';
  
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  if (hours) {
    return `${hours}:${minutes.padStart(2, '0') || '00'}:${seconds.padStart(2, '0') || '00'}`;
  }
  return `${minutes.padStart(2, '0') || '00'}:${seconds.padStart(2, '0') || '00'}`;
}

/**
 * YouTube 音乐搜索
 * GET /api/music/search?q=周杰伦
 */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  
  console.log(`🎵 [music] 搜索请求: ${q}`);
  
  // 验证 API Key
  if (!YOUTUBE_API_KEY) {
    console.error('❌ [music] YOUTUBE_API_KEY 未配置');
    return res.status(500).json({ 
      error: '服务器配置错误：YouTube API 密钥未设置',
      items: [] 
    });
  }
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: '请输入搜索内容', items: [] });
  }
  
  try {
    // 1. 搜索视频
    console.log('🔍 [music] 调用 YouTube Search API...');
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: q.trim(),
        type: 'video',
        maxResults: 10,
        videoCategoryId: '10',  // 音乐类别
        key: YOUTUBE_API_KEY
      },
      timeout: 10000
    });
    
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log('📭 [music] 未找到结果');
      return res.json({ items: [] });
    }
    
    console.log(`📦 [music] 找到 ${searchResponse.data.items.length} 个结果，获取详情...`);
    
    // 2. 获取视频详情（包括时长）
    const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'contentDetails,snippet',
        id: videoIds,
        key: YOUTUBE_API_KEY
      },
      timeout: 10000
    });
    
    // 建立视频详情映射
    const videoDetails = new Map();
    detailsResponse.data.items.forEach(item => {
      videoDetails.set(item.id, item);
    });
    
    // 3. 格式化结果
    const results = searchResponse.data.items.map(item => {
      const detail = videoDetails.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        coverUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        platform: 'youtube',
        duration: parseDuration(detail?.contentDetails?.duration)
      };
    });
    
    console.log(`✅ [music] 返回 ${results.length} 个结果`);
    res.json({ items: results });
    
  } catch (error) {
    console.error('❌ [music] YouTube API 错误:', error.response?.data || error.message);
    
    // 处理不同的错误类型
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'YouTube API 密钥无效或已过期，请检查配置',
        items: [] 
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        error: '请求参数错误',
        items: [] 
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: '请求超时，请重试',
        items: [] 
      });
    }
    
    res.status(500).json({ 
      error: '搜索失败，请稍后重试',
      items: [] 
    });
  }
});

/**
 * 健康检查（可选）
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    apiKeyConfigured: !!YOUTUBE_API_KEY,
    message: YOUTUBE_API_KEY ? 'YouTube API 已配置' : 'YouTube API 未配置'
  });
});

module.exports = router;