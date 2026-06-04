// client/src/services/youtubeSubtitleService.ts

export interface SubtitleLine {
  text: string;
  startTime: number;  // 秒
  endTime: number;    // 秒
}

export function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

export const fetchYouTubeSubtitles = async (videoId: string): Promise<SubtitleLine[]> => {
  const apiBase = import.meta.env.VITE_API_BASE || '/api';
  const url = `${apiBase}/youtube/subtitles?videoId=${videoId}`;
  
  console.log(`🎤 [前端] 请求后端字幕接口: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.subtitles && data.subtitles.length > 0) {
      console.log(`✅ [前端] 成功获取 ${data.subtitles.length} 条字幕，语言: ${data.language || '未知'}`);
      
      return data.subtitles.map((sub: any) => ({
        text: sub.text,
        startTime: sub.start,
        endTime: sub.start + (sub.dur || 3)  // 如果没有 dur，默认 3 秒
      }));
    }
    
    console.log(`⚠️ [前端] 该视频没有字幕`);
    return [];
  } catch (error) {
    console.error(`❌ [前端] 请求字幕接口失败:`, error);
    return [];
  }
};