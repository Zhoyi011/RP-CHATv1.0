// client/src/services/lyricsService.ts
import { Client } from 'lrclib-api';

// 单例客户端
const client = new Client();

// 歌词缓存
const lyricsCache = new Map<string, { synced: Array<{ text: string; startTime: number }>; plain: string | null }>();

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

/**
 * 根据歌曲名和歌手获取歌词
 */
export async function fetchLyrics(title: string, artist: string): Promise<LyricsResult | null> {
  const cacheKey = `${title.toLowerCase()}|${artist.toLowerCase()}`;
  
  // 检查缓存
  if (lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey)!;
    return {
      synced: cached.synced,
      plain: cached.plain,
      title,
      artist,
      duration: 0,
    };
  }

  try {
    // 使用 lrclib-api 获取歌词，使用 as any 绕过类型检查
    const result = await client.getSynced({
      track_name: title,
      artist_name: artist,
    }) as any;

    // 检查是否有同步歌词
    if (result && result.syncedLyrics && typeof result.syncedLyrics === 'string') {
      const synced = parseLrcToArray(result.syncedLyrics);
      const lyricsData = {
        synced,
        plain: result.plainLyrics || null,
        title: result.trackName || title,
        artist: result.artistName || artist,
        duration: result.duration || 0,
      };
      
      lyricsCache.set(cacheKey, { synced: lyricsData.synced, plain: lyricsData.plain });
      return lyricsData;
    }
    
    // 尝试获取纯文本歌词
    const plainResult = await client.getUnsynced({
      track_name: title,
      artist_name: artist,
    }) as any;
    
    if (plainResult && plainResult.length > 0) {
      const plainText = plainResult.map((l: any) => l.text).join('\n');
      lyricsCache.set(cacheKey, { synced: [], plain: plainText });
      return {
        synced: [],
        plain: plainText,
        title,
        artist,
        duration: 0,
      };
    }
    
    lyricsCache.set(cacheKey, { synced: [], plain: null });
    return null;
    
  } catch (error) {
    console.error('获取歌词失败:', error);
    return null;
  }
}

/**
 * 解析 LRC 格式歌词为数组
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