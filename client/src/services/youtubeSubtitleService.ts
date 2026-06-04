// client/src/services/youtubeSubtitleService.ts

export interface SubtitleLine {
  text: string;
  startTime: number;  // 秒
  endTime: number;
}

/**
 * 从 YouTube URL 获取视频 ID
 */
export function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

/**
 * 获取 YouTube 字幕（自动生成）
 */
export async function fetchYouTubeSubtitles(videoId: string): Promise<SubtitleLine[]> {
  try {
    // 使用 yt.lemnoslife.com 公开 API
    const response = await fetch(`https://yt.lemnoslife.com/video?videoId=${videoId}`);
    const data = await response.json();
    
    if (data && data.captions && data.captions.length > 0) {
      // 找到中文字幕或第一个可用字幕
      const chineseCaption = data.captions.find((c: any) => 
        c.languageCode === 'zh-Hans' || c.languageCode === 'zh-Hant' || c.languageCode === 'zh'
      );
      const caption = chineseCaption || data.captions[0];
      
      if (caption && caption.subtitles) {
        return caption.subtitles.map((sub: any) => ({
          text: sub.text,
          startTime: sub.start,
          endTime: sub.end
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('获取 YouTube 字幕失败:', error);
    return [];
  }
}