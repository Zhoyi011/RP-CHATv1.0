// server/src/routes/lyrics.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ========== 歌词专用模型池（不与其他功能冲突）==========
const LYRIC_MODELS = {
  primary: 'gemini-3.1-flash-lite',      // 15 RPM - 主力
  fallback1: 'gemini-2.5-flash-lite',    // 10 RPM - 第一备选
  fallback2: 'gemini-2.0-flash',         // 10 RPM - 第二备选
};

// 重试配置
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带模型降级的 Gemini 调用
async function callGeminiWithFallback(prompt, modelIndex = 0, retryCount = 0) {
  const modelList = [LYRIC_MODELS.primary, LYRIC_MODELS.fallback1, LYRIC_MODELS.fallback2];
  const currentModel = modelList[modelIndex];
  
  if (!currentModel) {
    throw new Error('所有模型都不可用');
  }

  try {
    const model = genAI.getGenerativeModel({ model: currentModel });
    const result = await model.generateContent(prompt);
    return result;
  } catch (error) {
    const isRateLimit = error.message?.includes('429') || 
                        error.message?.includes('quota') ||
                        error.message?.includes('RPM');
    
    // 限流：当前模型重试
    if (isRateLimit && retryCount < MAX_RETRIES) {
      console.log(`⏳ 模型 ${currentModel} 限流，${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return callGeminiWithFallback(prompt, modelIndex, retryCount + 1);
    }
    
    // 模型错误或重试用尽：切换到下一个模型
    if (modelIndex < modelList.length - 1) {
      console.log(`🔄 切换到备用模型: ${modelList[modelIndex + 1]}`);
      await delay(500);
      return callGeminiWithFallback(prompt, modelIndex + 1, 0);
    }
    
    throw error;
  }
}

// 智能清洗歌曲信息
async function cleanSongInfoWithGemini(originalTitle, originalArtist) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ GEMINI_API_KEY not set, using local cleaning.");
        return cleanSongInfoLocally(originalTitle, originalArtist);
    }

    const prompt = `
你是一个音乐信息处理专家。你的任务是从可能包含杂音的标题中，提取出**最纯净的歌曲名和歌手名**。

**输入信息：**
- 原始标题: "${originalTitle}"
- 原始歌手: "${originalArtist}"

**清洗规则：**
1. 移除括号内容：(official video)、【4K】、[live] 等
2. 移除合作歌手：feat., ft., with, & 及后面的名字
3. 移除歌手前缀：如果标题以歌手名+连字符开头（如 "Gareth.T - 玻璃"），只保留歌曲名
4. 移除版本标识：live, cover, remix, instrumental, acoustic, sped up, slowed down, HD, 4K

**输出格式 (只输出 JSON)：**
{"cleanTitle": "清洗后的歌曲名", "cleanArtist": "清洗后的歌手名"}
`;

    try {
        const result = await callGeminiWithFallback(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const cleaned = JSON.parse(jsonMatch[0]);
            console.log(`✨ [Gemini/${LYRIC_MODELS.primary}] 清洗成功: "${originalTitle}" -> "${cleaned.cleanTitle}"`);
            return { title: cleaned.cleanTitle, artist: cleaned.cleanArtist };
        }
        throw new Error("Invalid JSON response");
    } catch (error) {
        console.error("❌ Gemini 清洗失败:", error.message);
        return cleanSongInfoLocally(originalTitle, originalArtist);
    }
}

// 本地清洗函数（备选）
function cleanSongInfoLocally(originalTitle, originalArtist) {
    let cleaned = originalTitle;
    
    cleaned = cleaned.replace(/^.*?[-–—]\s*/, '');
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    cleaned = cleaned.replace(/【[^】]*】/g, '');
    cleaned = cleaned.replace(/（[^）]*）/g, '');
    cleaned = cleaned.replace(/\s+(official|live|cover|remix|instrumental|acoustic|sped\s+up|slowed\s+down|HD|4K)/i, '');
    cleaned = cleaned.replace(/\s+(feat\.|ft\.|featuring|with)\s+\S+$/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    if (!cleaned || cleaned.length === 0) {
        const chineseMatch = originalTitle.match(/[\u4e00-\u9fff]+/g);
        if (chineseMatch) cleaned = chineseMatch.join('');
    }
    
    console.log(`🔧 [Local] 本地清洗: "${originalTitle}" -> "${cleaned || originalTitle}"`);
    return { title: cleaned || originalTitle, artist: originalArtist };
}

// 核心歌词查询接口
router.post('/', async (req, res) => {
    const { title, artist, durationSeconds } = req.body;

    if (!title || !artist) {
        return res.status(400).json({ error: 'Missing title or artist' });
    }

    let duration = durationSeconds ? Math.floor(durationSeconds) : 180;
    if (duration < 1 || duration > 3600) duration = 180;

    const fetchFromLRCLIB = async (trackName, artistName) => {
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}&duration=${duration}`;
        console.log(`🔍 [LRCLIB] Trying: ${url}`);
        try {
            const response = await axios.get(url, { timeout: 8000 });
            if (response.status === 200 && response.data) {
                return response.data;
            }
        } catch (error) {
            if (error.response?.status === 404) return null;
            console.error(`❌ [LRCLIB] Request failed:`, error.message);
        }
        return null;
    };

    // 1. 原始信息尝试
    let lyricsData = await fetchFromLRCLIB(title, artist);
    if (lyricsData) {
        return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
    }

    // 2. Gemini 智能清洗后尝试
    console.log(`🤖 [Gemini] 原始信息未找到，启动智能清洗...`);
    const cleaned = await cleanSongInfoWithGemini(title, artist);
    if (cleaned.title !== title || cleaned.artist !== artist) {
        lyricsData = await fetchFromLRCLIB(cleaned.title, cleaned.artist);
        if (lyricsData) {
            return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
        }
    }

    // 3. 激进清洗（移除非中文/英文）
    const aggressiveTitle = title.replace(/[^\w\u4e00-\u9fff]/g, '').substring(0, 30);
    if (aggressiveTitle && aggressiveTitle !== cleaned.title) {
        lyricsData = await fetchFromLRCLIB(aggressiveTitle, cleaned.artist);
        if (lyricsData) {
            return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
        }
    }

    console.log(`❌ [Lyrics] 最终未找到歌词: ${title} - ${artist}`);
    res.json({ success: false, error: 'Lyrics not found' });
});

module.exports = router;