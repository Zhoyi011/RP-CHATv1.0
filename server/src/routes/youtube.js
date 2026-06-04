const express = require('express');
const router = express.Router();
const { getSubtitles, getVideoDetails } = require('youtube-caption-extractor');

/**
 * 获取 YouTube 视频的可用字幕
 * GET /api/youtube/subtitles?videoId=XXXX
 */
router.get('/subtitles', async (req, res) => {
  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId 参数' });
  }

  try {
    console.log(`🎤 [字幕接口] 获取视频 ${videoId} 的字幕`);

    // ========== 方法1: 使用 getVideoDetails 获取所有可用字幕 ==========
    try {
      const videoDetails = await getVideoDetails({ videoID: videoId });
      
      if (videoDetails && videoDetails.subtitles && videoDetails.subtitles.length > 0) {
        const availableLangs = videoDetails.subtitles.map(function(sub) { return sub.languageCode; });
        console.log('📝 [方法1] 可用字幕语言:', availableLangs);
        
        // 语言优先级：中文 > 日文 > 英文 > 其他
        const priorityLangs = ['zh-Hans', 'zh-Hant', 'zh', 'ja', 'en'];
        let targetLang = null;
        
        for (let i = 0; i < priorityLangs.length; i++) {
          if (availableLangs.includes(priorityLangs[i])) {
            targetLang = priorityLangs[i];
            break;
          }
        }
        
        if (!targetLang && availableLangs.length > 0) {
          targetLang = availableLangs[0];
        }
        
        if (targetLang) {
          console.log('✅ [方法1] 使用语言:', targetLang);
          const subtitles = await getSubtitles({
            videoID: videoId,
            lang: targetLang
          });
          
          if (subtitles && subtitles.length > 0) {
            console.log('✅ [方法1] 成功获取', subtitles.length, '条字幕');
            return res.json({ 
              subtitles: subtitles,
              language: targetLang,
              source: 'getSubtitles',
              count: subtitles.length
            });
          }
        }
      }
    } catch (error) {
      console.log('⚠️ [方法1] 失败:', error.message);
    }

    // ========== 方法2: 尝试使用备用 API ==========
    try {
      console.log('🔄 [方法2] 尝试使用备用 API...');
      const fallbackUrl = 'https://yt.lemnoslife.com/video?videoId=' + videoId;
      const response = await fetch(fallbackUrl);
      const data = await response.json();
      
      if (data && data.captions && data.captions.length > 0) {
        // 优先级排序
        const priorityLangs = ['zh-Hans', 'zh-Hant', 'zh', 'ja', 'en'];
        let targetCaption = null;
        
        for (let i = 0; i < priorityLangs.length; i++) {
          targetCaption = data.captions.find(function(c) { return c.languageCode === priorityLangs[i]; });
          if (targetCaption) break;
        }
        
        if (!targetCaption && data.captions.length > 0) {
          targetCaption = data.captions[0];
        }
        
        if (targetCaption && targetCaption.subtitles) {
          console.log('✅ [方法2] 成功获取', targetCaption.subtitles.length, '条字幕');
          var formattedSubtitles = targetCaption.subtitles.map(function(sub) {
            return {
              text: sub.text,
              start: sub.start,
              dur: sub.dur
            };
          });
          return res.json({
            subtitles: formattedSubtitles,
            language: targetCaption.languageCode,
            source: 'lemnoslife',
            count: targetCaption.subtitles.length
          });
        }
      }
    } catch (error) {
      console.log('⚠️ [方法2] 失败:', error.message);
    }

    console.log('❌ [字幕接口] 所有方法均失败，该视频可能没有字幕');
    return res.json({ subtitles: [], message: 'No subtitles available' });
    
  } catch (error) {
    console.error('❌ [字幕接口] 获取字幕失败:', error.message);
    res.status(500).json({ error: 'Failed to fetch subtitles' });
  }
});

module.exports = router;