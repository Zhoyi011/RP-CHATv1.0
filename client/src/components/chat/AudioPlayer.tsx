// client/src/components/chat/AudioPlayer.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';

// 音频缓存（内存缓存，刷新页面后失效）
const audioCache = new Map<string, string>();

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  isOwn?: boolean;
}

// 波形条组件
const WaveformBars: React.FC<{ isPlaying: boolean; barCount?: number }> = ({ 
  isPlaying, 
  barCount = 20 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0); // 🔧 修复：添加初始值 0
  const [bars, setBars] = useState<number[]>([]);

  // 生成随机/正弦波形数据
  useEffect(() => {
    const generateBars = () => {
      const newBars = [];
      for (let i = 0; i < barCount; i++) {
        // 使用正弦波形状，看起来更自然
        const value = (Math.sin(i / barCount * Math.PI * 2) * 0.4 + 0.5) * 0.6 + 0.2;
        newBars.push(value);
      }
      setBars(newBars);
    };
    generateBars();
  }, [barCount]);

  // 绘制波形
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || bars.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = Math.max(2, (width / barCount) - 2);
    const barSpacing = 2;
    
    ctx.clearRect(0, 0, width, height);
    
    bars.forEach((value, i) => {
      const barHeight = Math.max(3, value * height * 0.7);
      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;
      
      // 根据播放状态改变颜色
      let gradient;
      if (isPlaying) {
        gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#9ca3af');
        gradient.addColorStop(1, '#6b7280');
      }
      
      ctx.fillStyle = gradient;
      
      // 圆角矩形
      ctx.beginPath();
      const radius = Math.min(4, barWidth / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
  }, [bars, isPlaying, barCount]);

  // 动画循环（播放时产生跳动效果）
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform();
      return;
    }
    
    let lastTimestamp = 0;
    let phase = 0;
    
    const animate = (timestamp: number) => {
      if (!isPlaying) return;
      
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      
      if (delta > 50) {
        phase += 0.15;
        lastTimestamp = timestamp;
        
        // 更新 bars 产生跳动效果
        setBars(prev => prev.map((_, i) => {
          const offset = (Math.sin(phase + i * 0.3) * 0.3 + 0.5) * 0.6 + 0.2;
          return Math.min(0.9, Math.max(0.15, offset));
        }));
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  // 初始绘制
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform, bars]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={32}
      className="w-full h-8 rounded"
      style={{ minWidth: '120px' }}
    />
  );
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, duration, isOwn = false }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const progressRef = useRef<HTMLDivElement>(null);

  // 缓存音频
  useEffect(() => {
    if (!audioUrl) return;
    
    // 检查缓存
    if (audioCache.has(audioUrl)) {
      setCachedUrl(audioCache.get(audioUrl)!);
      return;
    }
    
    // 下载并缓存
    const cacheAudio = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioCache.set(audioUrl, blobUrl);
        setCachedUrl(blobUrl);
      } catch (err) {
        console.error('缓存失败:', err);
        setCachedUrl(audioUrl);
      } finally {
        setIsLoading(false);
      }
    };
    
    cacheAudio();
    
    return () => {
      if (cachedUrl && cachedUrl !== audioUrl && cachedUrl.startsWith('blob:')) {
        // 延迟释放，避免正在播放时被清理
        setTimeout(() => URL.revokeObjectURL(cachedUrl), 1000);
      }
    };
  }, [audioUrl]);

  // 获取实际时长
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [cachedUrl]);

  // 更新时间
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || isLoading) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('播放失败:', err));
    }
  };

  // 跳转进度
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = x * audioDuration;
    
    if (!isNaN(newTime) && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? 'bg-blue-600/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <span className="text-xs text-red-500">语音地址无效</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? 'bg-blue-600/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
      {/* 播放按钮 */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition flex-shrink-0 disabled:opacity-50"
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
      </button>

      {/* 波形和进度条区域 */}
      <div className="flex-1 min-w-0">
        {/* 波形可视化 */}
        <WaveformBars isPlaying={isPlaying} barCount={20} />
        
        {/* 进度条 */}
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative h-1.5 bg-white/30 rounded-full cursor-pointer overflow-hidden mt-1"
        >
          <div
            className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* 时间显示 */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] opacity-60">{formatTime(currentTime)}</span>
          <span className="text-[9px] opacity-60">{formatTime(audioDuration)}</span>
        </div>
      </div>

      {/* 隐藏的 audio 元素 */}
      <audio
        ref={audioRef}
        src={cachedUrl || audioUrl}
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default AudioPlayer;