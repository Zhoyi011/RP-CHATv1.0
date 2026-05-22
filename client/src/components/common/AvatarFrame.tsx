import React from 'react';

interface Props {
  avatarUrl: string;
  frameUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const containerSizeMap = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

const avatarSizeMap = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 96,
};

const frameConfigs: Record<string, { scale: number; offsetX: number; offsetY: number }> = {
  'cat': { scale: 1.55, offsetX: 35, offsetY: 0 },
  'star': { scale: 1.1, offsetX: 0, offsetY: 0 },
  'gold': { scale: 1.1, offsetX: 0, offsetY: 0 },
  'sakura': { scale: 1.1, offsetX: 0, offsetY: 0 },
  'simple': { scale: 1.1, offsetX: 0, offsetY: 0 },
  'default': { scale: 1.1, offsetX: 0, offsetY: 0 },
};

const getFrameKey = (url: string | null | undefined): string => {
  if (!url) return 'default';
  const match = url.match(/\/([^/]+)\.png$/);
  return match ? match[1] : 'default';
};

const AvatarFrame: React.FC<Props> = ({ 
  avatarUrl, 
  frameUrl, 
  size = 'md', 
  className = '',
  onClick 
}) => {
  const containerSize = containerSizeMap[size];
  const avatarSize = avatarSizeMap[size];
  const frameKey = getFrameKey(frameUrl);
  const config = frameConfigs[frameKey] || frameConfigs.default;

  if (!frameUrl) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center cursor-pointer ${className}`}
        style={{ width: avatarSize, height: avatarSize }}
        onClick={onClick}
      >
        <img
          src={avatarUrl || `https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff`}
          alt="头像"
          className="rounded-full object-cover w-full h-full"
        />
      </div>
    );
  }

  const frameSize = containerSize * config.scale;
  const leftOffset = (containerSize - frameSize) / 2 + config.offsetX;
  const topOffset = (containerSize - frameSize) / 2 + config.offsetY;

  return (
    <div 
      className={`relative inline-flex items-center justify-center cursor-pointer ${className}`}
      style={{ width: containerSize, height: containerSize }}
      onClick={onClick}
    >
      {/* 头像框（底层） */}
      <img
        src={frameUrl}
        alt="头像框"
        className="absolute pointer-events-none"
        style={{ 
          width: frameSize,
          height: frameSize,
          left: leftOffset,
          top: topOffset,
          objectFit: 'cover',
        }}
      />
      
      {/* 头像（上层，居中） */}
      <img
        src={avatarUrl || `https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff`}
        alt="头像"
        className="rounded-full object-cover absolute"
        style={{ 
          width: avatarSize,
          height: avatarSize,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
};

export default AvatarFrame;