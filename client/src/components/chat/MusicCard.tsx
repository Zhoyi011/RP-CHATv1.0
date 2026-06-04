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
  duration?: number;
}

// 从 YouTube URL 提取视频 ID
const getYoutubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
};

// 获取 Bilibili 嵌入 URL（移动版，支持进度条）
const getBilibiliEmbedUrl = (videoUrl: string): string => {
  const bvidMatch = videoUrl.match(/BV\w+/);
  if (!bvidMatch) return videoUrl;
  const bvid = bvidMatch[0];
  return `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${bvid}&page=1&autoplay=0&danmaku=0`;
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
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(propDuration || 0);
  const [playerError, setPlayerError] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  const videoId = platform === 'youtube' ? getYoutubeVideoId(videoUrl) : null;
  const embedUrl = platform === 'youtube' && videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&playsinline=1`
    : '';

  // 监听 YouTube 播放器消息
  useEffect(() => {
    if (platform !== 'youtube') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          setIsPlaying(data.info === 1);
        }
        if (data.event === 'onCurrentTime') {
          setCurrentTime(data.info);
        }
        if (data.event === 'onDuration') {
          setVideoDuration(data.info);
        }
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

  // 无效链接处理
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
      className={`w-72 rounded-xl overflow-hidden shadow-md ${
        isOwn ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* YouTube：显示封面图 + 播放按钮 */}
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

      {/* Bilibili：无封面，显示平台图标 + 播放按钮 */}
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
        </div>
      )}

      {/* 播放器（展开） */}
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
                <>
                  {!playerError ? (
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
                        <p className="text-gray-500 text-xs mt-1">请点击下方链接到B站观看</p>
                        <a 
                          href={videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block mt-2 px-3 py-1 bg-blue-500 rounded text-white text-xs hover:bg-blue-600 transition"
                        >
                          去B站观看 →
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 信息区 */}
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          {/* YouTube：显示小封面图；Bilibili：显示平台图标 */}
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
            <h4 className={`font-semibold truncate text-sm ${isOwn ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
              {title}
            </h4>
            <p className={`text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {displayAuthor}
            </p>
            {displayDate && (
              <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                📅 {displayDate}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-1 rounded-full transition-colors ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-blue-500'}`}
            title="详细信息"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            platform === 'youtube'
              ? 'bg-red-100 text-red-600'
              : 'bg-blue-100 text-blue-600'
          }`}>
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

        {/* 详细信息（折叠） */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className={`pt-2 border-t text-[11px] space-y-0.5 ${isOwn ? 'border-blue-400/30 text-blue-100' : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                <div className="flex justify-between">
                  <span>{platform === 'youtube' ? '频道' : 'UP主'}</span>
                  <span className="font-medium truncate ml-2">{displayAuthor}</span>
                </div>
                {displayDate && (
                  <div className="flex justify-between">
                    <span>发布</span>
                    <span className="font-medium">{displayDate}</span>
                  </div>
                )}
                {videoDuration > 0 && (
                  <div className="flex justify-between">
                    <span>时长</span>
                    <span className="font-medium">{formatTime(videoDuration)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>平台</span>
                  <span className="font-medium capitalize">{platform}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MusicCard;