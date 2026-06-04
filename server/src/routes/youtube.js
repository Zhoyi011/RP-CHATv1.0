const express = require('express');
const router = express.Router();
const { getSubtitles, getAvailableLanguages } = require('youtube-caption-extractor');

/**
 * 获取 YouTube 视频的默认字幕
 * GET /api/youtube/subtitles?videoId=XXXX
 */
router.get('/subtitles', async (req, res) => {
  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: '缺少 videoId 参数' });
  }

  try {
    console.log(`🎤 [字幕接口] 获取视频 ${videoId} 的字幕`);
    
    // 1. 先获取视频所有可用的字幕语言
    const languages = await getAvailableLanguages({ videoID: videoId });
    console.log(`📝 [字幕接口] 可用字幕语言:`, languages);
    
    if (!languages || languages.length === 0) {
      console.log(`❌ [字幕接口] 该视频没有字幕`);
      return res.json({ subtitles: [], languages: [] });
    }
    
    // 2. 使用第一个可用字幕（视频的默认字幕）
    const defaultLang = languages[0];
    console.log(`✅ [字幕接口] 使用默认字幕: ${defaultLang.languageCode || defaultLang}`);
    
    const subtitles = await getSubtitles({
      videoID: videoId,
      langCode: defaultLang.languageCode || defaultLang
    });
    
    if (subtitles && subtitles.length > 0) {
      console.log(`✅ [字幕接口] 成功获取到 ${subtitles.length} 条字幕`);
      return res.json({ 
        subtitles, 
        language: defaultLang.languageName || defaultLang,
        languageCode: defaultLang.languageCode || defaultLang
      });
    }
    
    console.log(`❌ [字幕接口] 未找到任何字幕内容`);
    res.json({ subtitles: [] });
    
  } catch (error) {
    console.error(`❌ [字幕接口] 获取字幕失败:`, error.message);
    res.status(500).json({ error: '获取字幕失败' });
  }
});

module.exports = router;