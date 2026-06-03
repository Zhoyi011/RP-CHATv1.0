// client/src/components/chat/AudioPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  isOwn?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, duration, isOwn = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // 检测移动端
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // 初始化音频
  useEffect(() => {
    const audio = new Audio();
    
    // 🔥 关键：为移动端添加特殊处理
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    
    // 使用 source 标签方式（更兼容）
    const source = document.createElement('source');
    source.src = audioUrl;
    source.type = 'audio/mpeg';  // MP3 的 MIME 类型
    audio.appendChild(source);
    
    audio.addEventListener('loadedmetadata', () => {
      setIsLoading(false);
      // 修正 duration
      if (duration === 0 && audio.duration && !isNaN(audio.duration)) {
        // 可以触发回调更新 duration
      }
    });
    
    audio.addEventListener('canplay', () => {
      setIsLoading(false);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('音频加载错误:', e, audio.error);
      // 🔥 移动端降级方案：尝试重新加载
      if (isMobile && audio.error?.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
        console.log('尝试降级方案：直接设置 src');
        audio.removeChild(source);
        audio.src = audioUrl;
        audio.load();
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    });
    
    audioRef.current = audio;
    
    // 🔥 移动端：用户首次交互后激活音频上下文
    const activateAudio = () => {
      if (audioRef.current && audioRef.current.paused && audioRef.current.readyState >= 2) {
        // 预加载但不自动播放
      }
      document.removeEventListener('touchstart', activateAudio);
      document.removeEventListener('click', activateAudio);
    };
    
    document.addEventListener('touchstart', activateAudio);
    document.addEventListener('click', activateAudio);
    
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      document.removeEventListener('touchstart', activateAudio);
      document.removeEventListener('click', activateAudio);
    };
  }, [audioUrl, isMobile]);

  // 播放/暂停
  const togglePlay = async () => {
    if (!audioRef.current || hasError) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // 🔥 移动端：确保用户交互后可以播放
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('播放失败:', err);
      // 🔥 显示友好错误提示
      setHasError(true);
    }
  };

  // 跳转进度
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 错误降级显示
  if (hasError) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? 'bg-blue-600/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-gray-500">语音加载失败</span>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-blue-500 underline ml-auto"
        >
          重试
        </button>
      </div>
    );
  }

  // 实际 duration 显示（优先使用传入的 duration）
  const displayDuration = duration > 0 ? duration : (audioRef.current?.duration || 0);

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? 'bg-blue-600/30' : 'bg-gray-100 dark:bg-gray-700'} min-w-[160px] max-w-[200px]`}>
      {/* 播放按钮 */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        disabled={isLoading}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition text-current flex-shrink-0"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </motion.button>

      {/* 进度条区域 */}
      <div className="flex-1 min-w-0">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative h-1.5 bg-white/30 rounded-full cursor-pointer overflow-hidden"
        >
          <div
            className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] opacity-75">{formatTime(currentTime)}</span>
          <span className="text-[10px] opacity-75">{formatTime(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;