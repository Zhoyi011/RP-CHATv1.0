// client/src/components/chat/MusicCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicCardProps {
  title: string;
  artist: string;
  channelName?: string;
  publishDate?: string;
  coverUrl: string;
  videoUrl: string;
  platform?: 'youtube' | 'bilibili';
  isOwn?: boolean;
  duration?: string;
  durationSeconds?: number;
}

// 从 YouTube URL 提取视频 ID
const getYoutubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
};

// 获取 Bilibili 嵌入 URL
const getBilibiliEmbedUrl = (videoUrl: string): string => {
  const bvidMatch = videoUrl.match(/BV\w+/);
  if (!bvidMatch) return videoUrl;
  const bvid = bvidMatch[0];
  return `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${bvid}&page=1&autoplay=0&danmaku=0`;
};

// 解析 LRC 歌词
interface LrcLine {
  time: number;
  text: string;
}

const parseLrc = (lrcContent: string): LrcLine[] => {
  const lines = lrcContent.split('\n');
  const parsed: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:[:.](\d{2,3}))?]/;
  
  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? parseInt(match[3]) / (match[3].length === 2 ? 100 : 1000) : 0;
      const time = minutes * 60 + seconds + milliseconds;
      const text = line.replace(/\[[^\]]+\]/g, '').trim();
      if (text) parsed.push({ time, text });
    }
  }
  parsed.sort((a, b) => a.time - b.time);
  return parsed;
};

const MusicCard: React.FC<MusicCardProps> = ({
  title,
  artist,
  channelName,
  publishDate,
  coverUrl,
  videoUrl,
  platform = 'youtube',
  isOwn = false,
  duration: propDuration,
  durationSeconds: propDurationSeconds,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(propDurationSeconds || 0);
  const [playerError, setPlayerError] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);
  
  // 歌词相关状态
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const videoId = platform === 'youtube' ? getYoutubeVideoId(videoUrl) : null;
  const embedUrl = platform === 'youtube' && videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&playsinline=1`
    : '';

  // 获取视频时长
  useEffect(() => {
    const getDuration = async () => {
      if (propDurationSeconds && propDurationSeconds > 0) {
        setVideoDuration(propDurationSeconds);
        return;
      }
      if (propDuration) {
        const parts = propDuration.split(':');
        if (parts.length === 2) {
          const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (seconds > 0) setVideoDuration(seconds);
        }
      }
    };
    getDuration();
  }, [propDurationSeconds, propDuration]);

  // 🔥 通过后端 API 获取歌词（后端负责智能清洗）
  const fetchLyrics = async () => {
    if (lyrics.length > 0) {
      setShowLyrics(!showLyrics);
      return;
    }
    
    if (!title || !artist) {
      setLyricsError('无法获取歌曲信息');
      setShowLyrics(true);
      return;
    }
    
    setLoadingLyrics(true);
    setLyricsError(null);
    
    try {
      const durationSec = videoDuration > 0 ? Math.floor(videoDuration) : (propDurationSeconds || 180);
      
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          artist: artist,
          durationSeconds: durationSec
        })
      });
      
      const data = await response.json();
      
      if (data.success && (data.synced || data.plain)) {
        const lrcContent = data.synced || data.plain;
        const parsedLyrics = parseLrc(lrcContent);
        if (parsedLyrics.length > 0) {
          setLyrics(parsedLyrics);
        } else {
          setLyrics([{ time: 0, text: lrcContent }]);
        }
        setShowLyrics(true);
      } else {
        setLyricsError('未找到歌词，尝试其他版本吧~');
        setShowLyrics(true);
      }
    } catch (error) {
      console.error('获取歌词失败:', error);
      setLyricsError('网络错误，请稍后重试');
      setShowLyrics(true);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // 点击歌词跳转
  const seekToTime = (time: number) => {
    if (platform !== 'youtube' || !playerRef.current) return;
    playerRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }),
      'https://www.youtube.com'
    );
  };

  // 更新当前歌词高亮
  useEffect(() => {
    if (lyrics.length === 0 || (lyrics[0]?.time === 0 && lyrics.length === 1)) return;
    
    let newIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        newIndex = i;
        break;
      }
    }
    
    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
      if (newIndex >= 0 && lyricsContainerRef.current && showLyrics) {
        const lyricElements = lyricsContainerRef.current.querySelectorAll('.music-card-lyric-line');
        const activeElement = lyricElements[newIndex] as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, lyrics, showLyrics]);

  // 监听 YouTube 播放器消息
  useEffect(() => {
    if (platform !== 'youtube') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') setIsPlaying(data.info === 1);
        if (data.event === 'onCurrentTime') setCurrentTime(data.info);
        if (data.event === 'onDuration') setVideoDuration(data.info);
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [platform]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const displayAuthor = channelName && channelName !== '未知频道' ? channelName : artist;
  const displayDate = publishDate ? publishDate.slice(0, 10) : null;

  if ((platform === 'youtube' && !videoId) || (platform === 'bilibili' && !videoUrl.match(/BV\w+/))) {
    return (
      <div className={`w-72 rounded-xl shadow-md p-3 text-center text-xs text-gray-400 ${isOwn ? 'bg-blue-50' : 'bg-white dark:bg-gray-800'}`}>
        无效的视频链接
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 24 }}
      className={`w-72 rounded-xl overflow-hidden shadow-md ${isOwn ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-white dark:bg-gray-800'}`}
    >
      {/* 封面/播放区域 */}
      {platform === 'youtube' && (
        <div className="relative cursor-pointer group" onClick={() => setShowPlayer(!showPlayer)}>
          <img src={coverUrl} alt={title} className="w-full aspect-video object-cover" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              {showPlayer ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {platform === 'bilibili' && (
        <div className="relative cursor-pointer group bg-gradient-to-br from-blue-500 to-purple-500 aspect-video flex items-center justify-center" onClick={() => setShowPlayer(!showPlayer)}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.223 3.086a1.5 1.5 0 0 1 2.12 2.12l-2.88 2.88h2.88a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5h2.88l-2.88-2.88a1.5 1.5 0 1 1 2.12-2.12L12 5.086l3.223-3.223a1.5 1.5 0 1 1 2.12 2.12L14.12 7.086h2.88l2.88-2.88z" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium">点击播放</p>
            <p className="text-white/70 text-xs mt-1 line-clamp-1">{title}</p>
          </div>
        </div>
      )}

      {/* 播放器 */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="aspect-video">
              {platform === 'youtube' ? (
                <iframe
                  ref={playerRef}
                  src={embedUrl + (isPlaying ? '&autoplay=1' : '')}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              ) : (
                !playerError ? (
                  <iframe
                    src={getBilibiliEmbedUrl(videoUrl)}
                    width="100%"
                    height="100%"
                    allowFullScreen
                    className="rounded-lg"
                    title={title}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                    onError={() => setPlayerError(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-900 text-white text-xs">
                    <div className="text-center p-4">
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p>本视频无法在外站播放</p>
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-3 py-1 bg-blue-500 rounded text-white text-xs hover:bg-blue-600 transition">去B站观看 →</a>
                    </div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 信息区 */}
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          {platform === 'youtube' ? (
            <img src={coverUrl} alt={title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.223 3.086a1.5 1.5 0 0 1 2.12 2.12l-2.88 2.88h2.88a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5h2.88l-2.88-2.88a1.5 1.5 0 1 1 2.12-2.12L12 5.086l3.223-3.223a1.5 1.5 0 1 1 2.12 2.12L14.12 7.086h2.88l2.88-2.88z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold truncate text-sm ${isOwn ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{title}</h4>
            <p className={`text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{displayAuthor}</p>
            {displayDate && <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>📅 {displayDate}</p>}
          </div>
          
          {/* 歌词按钮 */}
          <button
            onClick={fetchLyrics}
            className={`p-1 rounded-full transition-colors ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-purple-500'}`}
            title={showLyrics ? "隐藏歌词" : "查看歌词"}
            disabled={loadingLyrics}
          >
            {loadingLyrics ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            )}
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-1 rounded-full transition-colors ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-blue-500'}`}
            title="详细信息"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${platform === 'youtube' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {platform === 'youtube' ? '🎵 YouTube' : '📺 Bilibili'}
          </span>
        </div>

        {/* 进度条（仅 YouTube） */}
        {platform === 'youtube' && videoDuration > 0 && (
          <div className="mt-2">
            <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
          </div>
        )}

        {/* Bilibili 时长显示 */}
        {platform === 'bilibili' && videoDuration > 0 && (
          <div className="mt-2 text-right">
            <span className="text-[10px] text-gray-400">时长 {formatTime(videoDuration)}</span>
          </div>
        )}

        {/* 详细信息 */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className={`pt-2 border-t text-[11px] space-y-0.5 ${isOwn ? 'border-blue-400/30 text-blue-100' : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                <div className="flex justify-between"><span>{platform === 'youtube' ? '频道' : 'UP主'}</span><span className="font-medium truncate ml-2">{displayAuthor}</span></div>
                {displayDate && <div className="flex justify-between"><span>发布</span><span className="font-medium">{displayDate}</span></div>}
                {videoDuration > 0 && <div className="flex justify-between"><span>时长</span><span className="font-medium">{formatTime(videoDuration)}</span></div>}
                <div className="flex justify-between"><span>平台</span><span className="font-medium capitalize">{platform}</span></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 歌词区域 */}
        <AnimatePresence>
          {showLyrics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className={`pt-2 border-t ${isOwn ? 'border-blue-400/30' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className={`text-xs font-medium mb-2 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
                  📝 歌词 {lyrics.length > 0 && `· 共${lyrics.length}行`}
                </div>
                <div ref={lyricsContainerRef} className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {lyricsError ? (
                    <div className={`text-xs text-center py-4 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{lyricsError}</div>
                  ) : lyrics.length === 0 && !loadingLyrics ? (
                    <div className={`text-xs text-center py-4 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>暂无歌词</div>
                  ) : lyrics.length === 0 && loadingLyrics ? (
                    <div className="flex justify-center py-4">
                      <svg className="w-4 h-4 animate-spin text-purple-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : (
                    lyrics.map((line, index) => (
                      <div
                        key={index}
                        onClick={() => seekToTime(line.time)}
                        className={`music-card-lyric-line text-xs py-1 px-2 rounded cursor-pointer transition-all duration-200 ${
                          index === currentLyricIndex
                            ? `bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium ${isOwn ? 'bg-white/20' : ''}`
                            : `hover:bg-gray-100 dark:hover:bg-gray-700 ${isOwn ? 'text-blue-100 hover:bg-white/10' : 'text-gray-600 dark:text-gray-400'}`
                        }`}
                      >
                        {line.text || '♪'}
                      </div>
                    ))
                  )}
                </div>
                {!lyricsError && lyrics.length > 0 && (
                  <div className={`text-[10px] text-center mt-2 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                    💡 点击歌词跳转
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MusicCard;