import React from 'react';

interface Props {
  avatarUrl: string;
  frameUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  // 手动调整头像框大小（相对于容器的比例）
  frameScale?: number;
  // 手动调整头像大小（相对于容器的比例）
  avatarScale?: number;
}

const sizeMap = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

// 默认配置（可全局调整）
const defaultConfig = {
  frameScale: 1.2,   // 头像框放大到容器的 120%
  avatarScale: 0.65, // 头像缩小到容器的 65%
};

// 根据头像框文件名自动配置（可选）
const getAutoConfig = (frameUrl: string | null | undefined) => {
  if (!frameUrl) return defaultConfig;
  
  const fileName = frameUrl.toLowerCase();
  
  // 猫耳头像框 - 需要更大
  if (fileName.includes('cat')) {
    return { frameScale: 1.4, avatarScale: 0.55 };
  }
  // 王冠头像框
  if (fileName.includes('crown')) {
    return { frameScale: 1.3, avatarScale: 0.6 };
  }
  // 恶魔头像框
  if (fileName.includes('demon')) {
    return { frameScale: 1.35, avatarScale: 0.58 };
  }
  // 翅膀头像框
  if (fileName.includes('wing')) {
    return { frameScale: 1.4, avatarScale: 0.55 };
  }
  // 紫色系列
  if (fileName.includes('purple')) {
    return { frameScale: 1.2, avatarScale: 0.65 };
  }
  
  // 默认
  return defaultConfig;
};

const getFullImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const API_BASE = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'https://rp-chatv1-0.onrender.com';
  return `${API_BASE}${url}`;
};

const AvatarFrame: React.FC<Props> = ({ 
  avatarUrl, 
  frameUrl, 
  size = 'md', 
  className = '',
  onClick,
  frameScale: customFrameScale,
  avatarScale: customAvatarScale,
}) => {
  const containerSize = sizeMap[size];
  
  // 获取自动配置
  const autoConfig = getAutoConfig(frameUrl);
  
  const frameScale = customFrameScale ?? autoConfig.frameScale;
  const avatarScale = customAvatarScale ?? autoConfig.avatarScale;
  
  const frameSize = containerSize * frameScale;
  const avatarSize = containerSize * avatarScale;
  
  const fullAvatarUrl = getFullImageUrl(avatarUrl);
  const fullFrameUrl = frameUrl ? getFullImageUrl(frameUrl) : null;
  
  const defaultAvatar = `https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&size=128`;
  
  if (!fullFrameUrl) {
    return (
      <div 
        className={`rounded-full overflow-hidden ${className}`}
        style={{ width: containerSize, height: containerSize }}
        onClick={onClick}
      >
        <img src={fullAvatarUrl || defaultAvatar} alt="头像" className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: containerSize, height: containerSize }}
      onClick={onClick}
    >
      {/* 头像（底层） */}
      <img
        src={fullAvatarUrl || defaultAvatar}
        alt="头像"
        className="absolute rounded-full object-cover"
        style={{
          width: avatarSize,
          height: avatarSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      />
      {/* 头像框（上层） */}
      <img
        src={fullFrameUrl}
        alt="头像框"
        className="absolute"
        style={{
          width: frameSize,
          height: frameSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default AvatarFrame;