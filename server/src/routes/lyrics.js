// server/src/routes/lyrics.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 初始化 Gemini（使用轻量级模型）
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = 'gemini-3.1-flash-lite';  // 🔥 使用轻量模型，15 RPM

// 智能清洗歌曲信息（使用 Gemini 3.1 Flash Lite）
async function cleanSongInfoWithGemini(originalTitle, originalArtist) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ GEMINI_API_KEY not set, skipping smart cleaning.");
        return { title: originalTitle, artist: originalArtist };
    }

    const prompt = `
你是一个音乐信息处理专家。你的任务是从可能包含杂音的标题中，提取出**最纯净的歌曲名和歌手名**，以便用于歌词 API (LRCLIB) 查询。

**输入信息：**
- 原始标题: "${originalTitle}"
- 原始歌手: "${originalArtist}"

**清洗规则：**
1.  **移除杂音**：删除括号（圆括号、方括号、【】）、版本标识（official video, live, remix, cover, instrumental, acoustic, sped up, slowed down, HD, 4K, with lyrics 等）。
2.  **移除合作歌手**：删除 "feat.", "ft.", "with", "&" 以及后面跟随的歌手名。
3.  **移除歌手前缀**：如果标题以歌手名开头并紧跟连字符（如 "Gareth.T - 玻璃"），请只保留歌曲名 "玻璃"。
4.  **保留核心**：只输出最核心的歌曲名和主歌手名。

**输出格式 (严格遵守 JSON 格式，不要输出任何其他文本)：**
{"cleanTitle": "清洗后的歌曲名", "cleanArtist": "清洗后的歌手名"}
`;

    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleaned = JSON.parse(jsonMatch[0]);
            console.log(`✨ [Gemini] 清洗成功: "${originalTitle}" -> "${cleaned.cleanTitle}"`);
            return { title: cleaned.cleanTitle, artist: cleaned.cleanArtist };
        } else {
            throw new Error("Gemini 返回的内容不是有效的 JSON");
        }
    } catch (error) {
        console.error("❌ Gemini 清洗失败:", error.message);
        // 降级：本地正则清洗
        const fallbackTitle = originalTitle
            .replace(/^.*?[-–—]\s*/, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\s+(official|live|cover|remix|instrumental|HD|4K).*$/i, '')
            .trim();
        return { title: fallbackTitle || originalTitle, artist: originalArtist };
    }
}

// 本地清洗函数（备选，不依赖 Gemini）
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

    // 1. 用原始信息尝试
    let lyricsData = await fetchFromLRCLIB(title, artist);
    if (lyricsData) {
        return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
    }

    // 2. 用 Gemini 智能清洗后再试
    console.log(`🤖 [Gemini] 原始信息未找到，启动智能清洗...`);
    const cleaned = await cleanSongInfoWithGemini(title, artist);
    if (cleaned.title !== title || cleaned.artist !== artist) {
        lyricsData = await fetchFromLRCLIB(cleaned.title, cleaned.artist);
        if (lyricsData) {
            return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
        }
    }

    // 3. 再用本地激进清洗（移除非中文/英文）
    const aggressiveTitle = title.replace(/[^\w\u4e00-\u9fff]/g, '').substring(0, 30);
    if (aggressiveTitle && aggressiveTitle !== cleaned.title) {
        lyricsData = await fetchFromLRCLIB(aggressiveTitle, cleaned.artist);
        if (lyricsData) {
            return res.json({ success: true, synced: lyricsData.syncedLyrics, plain: lyricsData.plainLyrics });
        }
    }

    // 4. 都找不到，返回失败
    console.log(`❌ [Lyrics] 最终未找到歌词: ${title} - ${artist}`);
    res.json({ success: false, error: 'Lyrics not found' });
});

module.exports = router;