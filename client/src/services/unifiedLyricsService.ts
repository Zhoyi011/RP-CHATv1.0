// client/src/services/lyricsService.ts

export interface SyncedLyric {
  text: string;
  startTime: number;  // 毫秒
  endTime?: number;
}

export interface LyricsResult {
  synced: SyncedLyric[];
  plain: string | null;
  title: string;
  artist: string;
  duration: number;
}

// LRCLIB 公开 API
const LRCLIB_API = 'https://lrclib.net/api';

export async function fetchLyrics(title: string, artist: string): Promise<LyricsResult | null> {
  console.log(`🎤 获取歌词: ${title} - ${artist}`);
  
  try {
    // 先搜索
    const searchUrl = `${LRCLIB_API}/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
    console.log('🔍 搜索:', searchUrl);
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    console.log('📦 搜索结果:', searchData);
    
    if (!searchData || searchData.length === 0) {
      console.log('❌ 未找到歌词');
      return null;
    }
    
    // 取第一个结果
    const firstResult = searchData[0];
    const trackName = firstResult.trackName;
    const artistName = firstResult.artistName;
    
    console.log(`📝 选中: ${trackName} - ${artistName}`);
    
    // 🔥 关键：需要用 /get 接口获取完整歌词（包含 syncedLyrics）
    const getUrl = `${LRCLIB_API}/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
    console.log('🔍 获取歌词:', getUrl);
    
    const lyricsRes = await fetch(getUrl);
    const lyricsData = await lyricsRes.json();
    
    console.log('📝 歌词数据:', lyricsData);
    
    if (!lyricsData) {
      return null;
    }
    
    let synced: SyncedLyric[] = [];
    
    if (lyricsData.syncedLyrics) {
      synced = parseLrcToArray(lyricsData.syncedLyrics);
      console.log(`✅ 解析到 ${synced.length} 行同步歌词`);
    } else if (lyricsData.plainLyrics) {
      // 没有时间戳的纯文本
      const lines = lyricsData.plainLyrics.split('\n').filter((l: string) => l.trim());
      synced = lines.map((line: string, idx: number) => ({
        text: line,
        startTime: idx * 3000,
        endTime: (idx + 1) * 3000
      }));
      console.log(`⚠️ 只有纯文本，共 ${synced.length} 行`);
    }
    
    return {
      synced,
      plain: lyricsData.plainLyrics || null,
      title: lyricsData.trackName || title,
      artist: lyricsData.artistName || artist,
      duration: lyricsData.duration || 0,
    };
    
  } catch (error) {
    console.error('获取歌词失败:', error);
    return null;
  }
}

/**
 * 解析 LRC 格式歌词
 */
function parseLrcToArray(lrcContent: string): SyncedLyric[] {
  const lines = lrcContent.split('\n');
  const result: SyncedLyric[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:[:.](\d{2}))?\]/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3] ? parseInt(match[3], 10) : 0;
      const startTime = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
      const text = trimmed.replace(timeRegex, '').trim();
      
      if (text) {
        result.push({ text, startTime });
      }
    }
  }
  
  // 计算结束时间
  for (let i = 0; i < result.length; i++) {
    if (i + 1 < result.length) {
      result[i].endTime = result[i + 1].startTime;
    } else {
      result[i].endTime = result[i].startTime + 5000;
    }
  }
  
  return result;
}