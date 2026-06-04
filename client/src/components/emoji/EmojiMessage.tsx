// client/src/components/emoji/EmojiMessage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

interface EmojiMessageProps {
  url: string;
  emojiId?: string;
  isGif?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// 获取优化后的 Cloudinary URL
const getOptimizedUrl = (url: string, size: 'sm' | 'md' | 'lg'): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const sizeMap = {
    sm: 64,
    md: 128,
    lg: 256
  };
  
  const width = sizeMap[size];
  // 添加优化参数：宽度限制、质量80%、自动格式转换
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&c=limit&q=80&f=auto`;
};

// 获取低质量占位图（用于渐进加载）
const getLowQualityUrl = (url: string, size: 'sm' | 'md' | 'lg'): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64
  };
  
  const width = sizeMap[size];
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&c=limit&q=30&f=auto&blur=200`;
};

export const EmojiMessage: React.FC<EmojiMessageProps> = ({ 
  url, 
  isGif = false, 
  size = 'md',
  onClick 
}) => {
  const [imageError, setImageError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showLowQuality, setShowLowQuality] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const optimizedUrl = getOptimizedUrl(url, size);
  const lowQualityUrl = getLowQualityUrl(url, size);

  // 预加载图片
  useEffect(() => {
    if (!url) return;
    
    const img = new Image();
    img.src = optimizedUrl;
    img.onload = () => {
      setLoaded(true);
      setShowLowQuality(false);
    };
    img.onerror = () => {
      setImageError(true);
      setLoaded(false);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [optimizedUrl, url]);

  if (imageError) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center`}>
        <ImageOff className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      className="relative group cursor-pointer overflow-hidden rounded-lg"
      onClick={onClick}
      style={{ width: sizeClasses[size].split(' ')[0], height: sizeClasses[size].split(' ')[1] }}
    >
      {/* 低质量占位图（模糊） */}
      {showLowQuality && !loaded && !imageError && (
        <img
          src={lowQualityUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain filter blur-sm scale-105"
          aria-hidden="true"
        />
      )}
      
      {/* 骨架屏 */}
      {!loaded && !imageError && (
        <div className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse`} />
      )}
      
      {/* 高质量图片 */}
      <img
        ref={imgRef}
        src={optimizedUrl}
        alt="表情"
        className={`${sizeClasses[size]} object-contain rounded-lg transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } hover:scale-105 transition-transform`}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          setShowLowQuality(false);
        }}
        onError={() => {
          setImageError(true);
          setLoaded(false);
        }}
      />
      
      {isGif && (
        <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1 rounded backdrop-blur-sm">
          GIF
        </span>
      )}
    </div>
  );
};