// client/src/components/chat/MusicCard.tsx
import React, { useState } from 'react';
// @ts-ignore - 临时忽略类型错误
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicCardProps {
  title: string;
  artist: string;
  coverUrl: string;
  videoUrl: string;
  platform?: 'youtube' | 'bilibili' | 'local';
  isOwn?: boolean;
}

const MusicCard: React.FC<MusicCardProps> = ({ 
  title, 
  artist, 
  coverUrl, 
  videoUrl, 
  platform = 'youtube',
  isOwn = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  // 判断是本地文件
  const isLocalFile = videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.startsWith('/');

  // 获取 Bilibili 嵌入 URL
  const getBilibiliEmbedUrl = () => {
    const bvidMatch = videoUrl.match(/BV\w+/);
    if (bvidMatch) {
      return `https://player.bilibili.com/player.html?bvid=${bvidMatch[0]}&page=1&high_quality=1&autoplay=0`;
    }
    return videoUrl;
  };

  // 渲染播放器
  const renderPlayer = () => {
    // Bilibili 使用 iframe
    if (platform === 'bilibili') {
      return (
        <iframe
          src={getBilibiliEmbedUrl()}
          width="100%"
          height="160px"
          allowFullScreen
          className="rounded-lg"
          title={title}
        />
      );
    }

    // YouTube 和本地 MP4 使用 react-player
    // 🔥 使用 as any 绕过类型检查（最简单）
    return (
      <ReactPlayer
        url={videoUrl}
        playing={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls
        width="100%"
        height="160px"
        {...{ modestbranding: 1, rel: '0' } as any}
      />
    );
  };

  // 获取平台标签
  const getPlatformLabel = () => {
    if (platform === 'bilibili') return '📺 Bilibili';
    if (isLocalFile) return '🎬 本地视频';
    return '🎵 YouTube MV';
  };

  const getPlatformColor = () => {
    if (platform === 'bilibili') return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
    if (isLocalFile) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className={`w-72 rounded-2xl shadow-lg overflow-hidden transition-all duration-200 ${
      isOwn 
        ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
        : 'bg-white dark:bg-gray-800'
    }`}>
      {/* CD 唱片区域 */}
      <div 
        className="relative aspect-square cursor-pointer group"
        onClick={() => setShowPlayer(!showPlayer)}
      >
        <img 
          src={coverUrl} 
          alt={title}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isPlaying ? 'animate-spin-slow' : ''
          }`}
          style={{ animationDuration: '10s' }}
        />
        
        {/* 黑胶唱片中心效果 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isOwn ? 'bg-blue-500/70' : 'bg-black/50'
          }`}>
            <div className={`w-7 h-7 rounded-full ${
              isOwn ? 'bg-cyan-300' : 'bg-white/80'
            }`} />
          </div>
        </div>
        
        {/* 悬停播放按钮 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            {isPlaying ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 歌曲信息 */}
      <div className="p-3">
        <h4 className={`font-semibold truncate ${
          isOwn ? 'text-white' : 'text-gray-800 dark:text-white'
        }`}>
          {title}
        </h4>
        <p className={`text-sm truncate ${
          isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {artist}
        </p>
        
        {/* 平台标签 */}
        <div className="mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isOwn ? 'bg-white/20 text-white' : getPlatformColor()
          }`}>
            {getPlatformLabel()}
          </span>
        </div>
      </div>

      {/* 展开的播放器 */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-3 border-t ${
              isOwn ? 'border-blue-400/30' : 'border-gray-100 dark:border-gray-700'
            }`}>
              {renderPlayer()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicCard;