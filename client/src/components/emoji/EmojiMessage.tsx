// client/src/components/emoji/EmojiMessage.tsx
import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface EmojiMessageProps {
  url: string;
  emojiId?: string;
  isGif?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const EmojiMessage: React.FC<EmojiMessageProps> = ({ 
  url, 
  isGif = false, 
  size = 'md',
  onClick 
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  if (imageError) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-700 rounded-lg flex items-center justify-center`}>
        <ImageOff className="w-6 h-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      {loading && (
        <div className={`${sizeClasses[size]} bg-gray-700 rounded-lg animate-pulse`} />
      )}
      <img
        src={url}
        alt="表情"
        className={`${sizeClasses[size]} object-contain rounded-lg transition-transform hover:scale-105 ${loading ? 'hidden' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      {isGif && (
        <span className="absolute bottom-0 right-0 text-[10px] bg-black/50 text-white px-1 rounded">
          GIF
        </span>
      )}
    </div>
  );
};