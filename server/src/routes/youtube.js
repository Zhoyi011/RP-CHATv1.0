// server/src/routes/youtube.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// 复用你已经配置好的 YouTube API Key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * 获取 YouTube 视频的详细信息（频道名、发布日期、时长等）
 * GET /api/youtube/info?videoId=XXXX
 */
router.get('/info', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId 参数' });
  }
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 YouTube API Key' });
  }

  try {
    // 调用 YouTube Data API v3
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const response = await axios.get(url, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY,
      },
    });

    const items = response.data.items;
    if (!items || items.length === 0) {
      return res.status(404).json({ error: '视频不存在' });
    }

    const video = items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // 解析时长（ISO 8601 -> 秒）
    const durationStr = contentDetails.duration; // 例如 "PT3M45S"
    const match = durationStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    let durationSeconds = 0;
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const seconds = match[3] ? parseInt(match[3]) : 0;
      durationSeconds = hours * 3600 + minutes * 60 + seconds;
    }

    // 发布日期（格式：YYYY-MM-DD）
    const publishDate = snippet.publishedAt ? snippet.publishedAt.split('T')[0] : null;

    // 返回前端需要的信息
    res.json({
      title: snippet.title,
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,
      publishDate: publishDate,
      duration: durationSeconds,
      viewCount: video.statistics?.viewCount || 0,
      likeCount: video.statistics?.likeCount || 0,
      thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    });
  } catch (error) {
    console.error('获取视频信息失败:', error.response?.data || error.message);
    res.status(500).json({ error: '获取视频信息失败' });
  }
});

module.exports = router;