const express = require('express');
const router = express.Router();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ========== YouTube 搜索 ==========
async function searchYouTube(query) {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YOUTUBE_API_KEY 未配置');
    return [];
  }
  
  try {
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 10,
        videoCategoryId: '10',
        key: YOUTUBE_API_KEY
      },
      timeout: 10000
    });
    
    if (!searchRes.data.items?.length) return [];
    
    const videoIds = searchRes.data.items.map(item => item.id.videoId).join(',');
    const detailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'contentDetails,snippet',
        id: videoIds,
        key: YOUTUBE_API_KEY
      },
      timeout: 10000
    });
    
    const videoDetails = new Map();
    detailsRes.data.items.forEach(item => videoDetails.set(item.id, item));
    
    return searchRes.data.items.map(item => {
      const detail = videoDetails.get(item.id.videoId);
      const duration = detail?.contentDetails?.duration || '';
      const durationStr = parseYouTubeDuration(duration);
      
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        coverUrl: item.snippet.thumbnails.medium?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        platform: 'youtube',
        duration: durationStr,
        channelName: item.snippet.channelTitle,
        publishDate: item.snippet.publishedAt?.split('T')[0]
      };
    });
  } catch (error) {
    console.error('YouTube 搜索失败:', error.response?.data || error.message);
    return [];
  }
}

function parseYouTubeDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  if (hours) {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
}

// ========== 🆕 Bilibili 搜索 ==========
async function searchBilibili(query) {
  try {
    // 使用 Bilibili 公开搜索 API（无需 key，但有频率限制）
    const url = 'https://api.bilibili.com/x/web-interface/search/type';
    const response = await axios.get(url, {
      params: {
        search_type: 'video',
        keyword: query,
        page: 1,
        pagesize: 10
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });
    
    if (response.data?.code !== 0 || !response.data?.data?.result) {
      console.log('Bilibili 搜索返回空:', response.data?.message);
      return [];
    }
    
    return response.data.data.result.map(item => ({
      id: item.bvid,
      title: item.title.replace(/<em class="keyword">|<\/em>/g, ''),
      artist: item.author,
      coverUrl: item.pic,
      videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
      platform: 'bilibili',
      duration: formatBilibiliDuration(item.duration),
      channelName: item.author,
      publishDate: item.pubdate ? new Date(item.pubdate * 1000).toISOString().split('T')[0] : null,
      playCount: item.play,
      danmakuCount: item.video_review
    }));
  } catch (error) {
    console.error('Bilibili 搜索失败:', error.message);
    return [];
  }
}

function formatBilibiliDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== 统一搜索接口 ==========
router.get('/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: '请输入搜索内容', items: [] });
  }
  
  console.log(`🎵 搜索: ${q}`);
  
  try {
    // 并行搜索 YouTube 和 Bilibili
    const [youtubeResults, bilibiliResults] = await Promise.all([
      searchYouTube(q),
      searchBilibili(q)
    ]);
    
    // 合并结果，YouTube 在前
    const allResults = [...youtubeResults, ...bilibiliResults];
    
    console.log(`✅ 找到 ${youtubeResults.length} 个 YouTube + ${bilibiliResults.length} 个 Bilibili = ${allResults.length} 个结果`);
    
    res.json({ items: allResults });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: '搜索失败', items: [] });
  }
});

// ========== 🆕 Bilibili 视频详情接口 ==========
router.get('/bilibili/info', async (req, res) => {
  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId' });
  }
  
  try {
    // 提取 BV 号
    let bvid = videoId;
    if (videoId.includes('bilibili.com')) {
      const match = videoId.match(/BV\w+/);
      if (match) bvid = match[0];
    }
    
    const url = 'https://api.bilibili.com/x/web-interface/view';
    const response = await axios.get(url, {
      params: { bvid },
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });
    
    if (response.data?.code !== 0) {
      return res.status(404).json({ error: '视频不存在' });
    }
    
    const data = response.data.data;
    res.json({
      title: data.title,
      channelName: data.owner.name,
      channelId: data.owner.mid,
      publishDate: data.pubdate ? new Date(data.pubdate * 1000).toISOString().split('T')[0] : null,
      duration: data.duration,
      coverUrl: data.pic,
      playCount: data.stat?.view || 0,
      likeCount: data.stat?.like || 0,
      danmakuCount: data.stat?.danmaku || 0
    });
  } catch (error) {
    console.error('获取 Bilibili 视频信息失败:', error.message);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;