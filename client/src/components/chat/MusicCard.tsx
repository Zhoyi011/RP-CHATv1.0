// client/src/components/chat/MusicCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicCardProps {
  title: string;
  artist: string;
  coverUrl: string;
  videoUrl: string;
  platform?: 'youtube' | 'bilibili';
  isOwn?: boolean;
}

// 从 YouTube URL 提取视频 ID
const getYoutubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
};

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const animationRef = useRef<number>(0);  // 🔧 修复：添加初始值 0
  
  const videoId = getYoutubeVideoId(videoUrl);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&playsinline=1`;

  // Canvas 音频可视化效果
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width = 200;
    const height = canvas.height = 40;
    
    let bars: number[] = [];
    let phase = 0;
    
    const draw = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, width, height);
      
      if (bars.length === 0) {
        bars = Array.from({ length: 30 }, () => Math.random() * 0.3 + 0.2);
      }
      
      if (isPlaying) {
        phase += 0.1;
        bars = bars.map((_, i) => {
          const variation = Math.sin(phase + i * 0.3) * 0.2 + 0.3;
          return Math.min(0.8, Math.max(0.15, variation));
        });
      }
      
      const barWidth = (width - bars.length * 2) / bars.length;
      
      bars.forEach((value, i) => {
        const barHeight = value * height * 0.7;
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (isPlaying) {
          gradient.addColorStop(0, '#60a5fa');
          gradient.addColorStop(1, '#3b82f6');
        } else {
          gradient.addColorStop(0, '#9ca3af');
          gradient.addColorStop(1, '#6b7280');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // 监听播放器消息
  useEffect(() => {
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
        if (data.event === 'onReady') {
          if (playerRef.current) {
            playerRef.current.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'getDuration' }),
              'https://www.youtube.com'
            );
          }
        }
        if (data.event === 'onDuration') {
          setDuration(data.info);
        }
      } catch {}
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoId) {
    return (
      <div className={`w-80 rounded-xl overflow-hidden shadow-md p-4 text-center text-gray-400 ${
        isOwn ? 'bg-blue-50' : 'bg-white dark:bg-gray-800'
      }`}>
        <p className="text-sm">无效的视频链接</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className={`w-80 rounded-xl overflow-hidden shadow-lg ${
        isOwn 
          ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
          : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* 封面区域 */}
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowPlayer(!showPlayer)}
      >
        <img 
          src={coverUrl} 
          alt={title}
          className="w-full aspect-video object-cover"
        />
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          >
            {showPlayer ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.div>
        </div>
      </div>

      {/* 播放器（展开时） */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="aspect-video">
              <iframe
                ref={playerRef}
                src={embedUrl + '&autoplay=1'}
                width="100%"
                height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                title={title}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 歌曲信息 + 可视化 */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <img 
            src={coverUrl} 
            alt={title}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold truncate text-sm ${isOwn ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
              {title}
            </h4>
            <p className={`text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {artist}
            </p>
          </div>
          
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            platform === 'youtube' 
              ? 'bg-red-100 text-red-600' 
              : 'bg-pink-100 text-pink-600'
          }`}>
            {platform === 'youtube' ? '🎵 MV' : '📺 视频'}
          </span>
        </div>

        {/* Canvas 波形可视化 */}
        <div className="mt-3">
          <canvas 
            ref={canvasRef} 
            className="w-full h-10 rounded"
            width={200}
            height={40}
          />
        </div>

        {/* 进度条 */}
        {duration > 0 && (
          <div className="mt-2">
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
      </div>
    </motion.div>
  );
};

export default MusicCard;