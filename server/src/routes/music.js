// server/src/routes/music.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ========== 辅助函数 ==========
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

function formatBilibiliDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
      
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        coverUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        platform: 'youtube',
        duration: parseYouTubeDuration(duration),
        channelName: item.snippet.channelTitle,
        publishDate: item.snippet.publishedAt?.split('T')[0]
      };
    });
  } catch (error) {
    console.error('YouTube 搜索失败:', error.response?.data || error.message);
    return [];
  }
}

// ========== Bilibili 搜索 ==========
async function searchBilibili(query) {
  try {
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
    
    const results = response.data.data.result.map(item => {
      // 获取封面图（多种备选字段）
      let coverUrl = item.pic;
      if (!coverUrl) coverUrl = item.cover;
      if (!coverUrl) coverUrl = item.cover_url;
      if (!coverUrl) coverUrl = item.picture;
      if (!coverUrl) coverUrl = item.cover_default;
      if (!coverUrl) coverUrl = 'https://via.placeholder.com/120x90?text=Bilibili';
      
      // 确保图片 URL 使用 https
      if (coverUrl && coverUrl.startsWith('http://')) {
        coverUrl = coverUrl.replace('http://', 'https://');
      }
      
      // 处理时长
      let duration = item.duration;
      if (typeof duration === 'string') {
        // 格式如 "04:32" 已经是 mm:ss
        duration = duration;
      } else if (typeof duration === 'number') {
        duration = formatBilibiliDuration(duration);
      } else {
        duration = '0:00';
      }
      
      return {
        id: item.bvid,
        title: (item.title || '').replace(/<em class="keyword">|<\/em>/g, ''),
        artist: item.author || '未知UP主',
        coverUrl: coverUrl,
        videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
        platform: 'bilibili',
        duration: duration,
        channelName: item.author || '未知UP主',
        publishDate: item.pubdate ? new Date(item.pubdate * 1000).toISOString().split('T')[0] : null,
        playCount: item.play || 0,
        danmakuCount: item.video_review || 0
      };
    });
    
    return results;
  } catch (error) {
    console.error('Bilibili 搜索失败:', error.message);
    return [];
  }
}

// ========== 统一搜索接口 ==========
router.get('/search', async (req, res) => {
  const { q, platform } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: '请输入搜索内容', items: [] });
  }
  
  console.log(`🎵 搜索: ${q}, 平台: ${platform || '全部'}`);
  
  try {
    let items = [];
    
    if (!platform || platform === 'youtube') {
      const youtubeResults = await searchYouTube(q);
      items.push(...youtubeResults);
      console.log(`✅ YouTube: ${youtubeResults.length} 条`);
    }
    
    if (!platform || platform === 'bilibili') {
      const bilibiliResults = await searchBilibili(q);
      items.push(...bilibiliResults);
      console.log(`✅ Bilibili: ${bilibiliResults.length} 条`);
    }
    
    res.json({ items });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: '搜索失败', items: [] });
  }
});

// ========== Bilibili 视频详情接口 ==========
router.get('/bilibili/info', async (req, res) => {
  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId' });
  }
  
  try {
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
      channelName: data.owner?.name || '未知UP主',
      channelId: data.owner?.mid,
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