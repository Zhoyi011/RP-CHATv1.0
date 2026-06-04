// client/src/components/chat/MusicCard.tsx
import React, { useState, useEffect, useRef } from 'react';

interface SubtitleLine {
  text: string;
  startTime: number;  // 秒
  endTime: number;    // 秒
}

interface MusicCardProps {
  title: string;
  artist: string;
  coverUrl: string;
  videoUrl: string;
  platform?: 'youtube' | 'bilibili';
  isOwn?: boolean;
}

// API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// 从 YouTube URL 提取视频 ID
const getYoutubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
};

// 🔥 调用自己的后端 API 获取字幕
const fetchYouTubeSubtitles = async (videoId: string): Promise<SubtitleLine[]> => {
  try {
    const url = `${API_BASE}/youtube/subtitles?videoId=${videoId}`;
    console.log('🎤 [MusicCard] 请求字幕:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.subtitles && data.subtitles.length > 0) {
      console.log(`✅ [MusicCard] 获取到 ${data.subtitles.length} 条字幕`);
      return data.subtitles.map((sub: any) => ({
        text: sub.text,
        startTime: sub.start,
        endTime: sub.start + (sub.dur || 3)
      }));
    }
    console.log('⚠️ [MusicCard] 该视频没有字幕');
    return [];
  } catch (error) {
    console.error('❌ [MusicCard] 获取字幕失败:', error);
    return [];
  }
};

const MusicCard: React.FC<MusicCardProps> = ({ 
  title, 
  artist, 
  coverUrl, 
  videoUrl, 
  platform = 'youtube',
  isOwn = false 
}) => {
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  
  const playerRef = useRef<HTMLIFrameElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const videoId = getYoutubeVideoId(videoUrl);

  // 获取字幕
  useEffect(() => {
    if (!videoId) {
      setIsLoading(false);
      return;
    }
    
    const loadSubtitles = async () => {
      setIsLoading(true);
      try {
        const subs = await fetchYouTubeSubtitles(videoId);
        setSubtitles(subs);
        if (subs.length > 0) {
          setDuration(subs[subs.length - 1]?.endTime || 0);
        }
      } catch (error) {
        console.error('加载字幕失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSubtitles();
  }, [videoId]);

  // 监听 YouTube 播放器消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          setPlayerReady(true);
        }
        if (data.event === 'onCurrentTime') {
          setCurrentTime(data.info);
        }
      } catch {}
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 更新当前字幕索引（高亮）
  useEffect(() => {
    if (subtitles.length === 0) return;
    
    // 容错：给一个小的缓冲区间
    const buffer = 0.05;
    const newIndex = subtitles.findIndex(
      sub => currentTime + buffer >= sub.startTime && currentTime - buffer < sub.endTime
    );
    
    if (newIndex !== currentSubtitleIndex && newIndex !== -1) {
      setCurrentSubtitleIndex(newIndex);
      // 滚动到当前歌词
      if (lyricsContainerRef.current && newIndex >= 0) {
        const elements = lyricsContainerRef.current.querySelectorAll('.lyric-line');
        const currentElement = elements[newIndex] as HTMLElement;
        if (currentElement) {
          currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, subtitles, currentSubtitleIndex]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&playsinline=1`;

  if (!videoId) {
    return (
      <div className={`w-80 rounded-xl overflow-hidden shadow-md p-4 text-center text-gray-400 ${
        isOwn ? 'bg-blue-50' : 'bg-white dark:bg-gray-800'
      }`}>
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">无效的视频链接</p>
      </div>
    );
  }

  return (
    <div className={`w-80 rounded-xl overflow-hidden shadow-md ${
      isOwn ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
    }`}>
      {/* YouTube 播放器 */}
      <div className="relative bg-black aspect-video">
        <iframe
          ref={playerRef}
          src={embedUrl}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          title={title}
        />
      </div>

      {/* 歌曲信息 */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-gray-700">
        <img 
          src={coverUrl} 
          alt={title}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Music';
          }}
        />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium truncate text-sm ${isOwn ? 'text-blue-700' : 'text-gray-800 dark:text-white'}`}>
            {title}
          </h4>
          <p className="text-xs truncate text-gray-500 dark:text-gray-400">
            {artist}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
          🎵 MV
        </span>
      </div>

      {/* 进度条 */}
      {duration > 0 && (
        <div className="px-3 pt-2">
          <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* 歌词区域 */}
      <div className="p-3">
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4v16" />
          </svg>
          <span>滚动歌词</span>
          {subtitles.length > 0 && <span className="text-[10px] text-green-500">(YouTube 字幕)</span>}
        </div>
        
        <div ref={lyricsContainerRef} className="max-h-40 overflow-y-auto space-y-1.5">
          {isLoading && (
            <div className="text-center py-4 text-gray-400 text-sm">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              加载字幕中...
            </div>
          )}
          
          {!isLoading && subtitles.length > 0 && (
            subtitles.map((sub, index) => (
              <div
                key={index}
                className={`lyric-line text-sm transition-all duration-150 ${
                  index === currentSubtitleIndex
                    ? 'text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 py-0.5 rounded'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {sub.text}
              </div>
            ))
          )}
          
          {!isLoading && subtitles.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p>该视频暂无字幕</p>
              <p className="text-xs mt-1">可以在 YouTube 中开启字幕</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicCard;