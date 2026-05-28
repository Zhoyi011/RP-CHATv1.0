// client/src/components/common/AvatarFrame.tsx
import React from 'react';

interface Props {
  avatarUrl: string;
  frameName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;  // 👈 新增双击事件
  // 手动调整参数（每个位置独立调整）
  frameSize?: number;   // 头像框大小（像素）
  avatarSize?: number;  // 头像大小（像素）
  offsetX?: number;     // 水平偏移
  offsetY?: number;     // 垂直偏移
}

const sizeMap = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

// 每个头像框的独立调整参数
const frameAdjustments: Record<string, Record<string, { frameSize: number; avatarSize: number; offsetX: number; offsetY: number }>> = {
  'chat-message-other': {
    'cat': { frameSize: 70, avatarSize: 40, offsetX: 0, offsetY: 0 },
    'demon': { frameSize: 75, avatarSize: 38, offsetX: 0, offsetY: 2 },
    'purple': { frameSize: 500, avatarSize: 42, offsetX: 0, offsetY: 0 },
    'default': { frameSize: 65, avatarSize: 40, offsetX: 0, offsetY: 0 },
  },
  'chat-message-self': {
    'cat': { frameSize: 70, avatarSize: 40, offsetX: 0, offsetY: 0 },
    'demon': { frameSize: 75, avatarSize: 38, offsetX: 0, offsetY: 2 },
    'default': { frameSize: 65, avatarSize: 40, offsetX: 0, offsetY: 0 },
  },
  'sidebar': {
    'cat': { frameSize: 70, avatarSize: 42, offsetX: 0, offsetY: 0 },
    'default': { frameSize: 65, avatarSize: 40, offsetX: 0, offsetY: 0 },
  },
  'persona-detail': {
    'cat': { frameSize: 140, avatarSize: 90, offsetX: 0, offsetY: 0 },
    'demon': { frameSize: 150, avatarSize: 85, offsetX: 0, offsetY: 5 },
    'default': { frameSize: 130, avatarSize: 90, offsetX: 0, offsetY: 0 },
  },
};

const AvatarFrame: React.FC<Props> = ({ 
  avatarUrl, 
  frameName, 
  size = 'md',
  className = '',
  onClick,
  onDoubleClick,  // 👈 接收双击事件
  frameSize: propFrameSize,
  avatarSize: propAvatarSize,
  offsetX: propOffsetX,
  offsetY: propOffsetY,
}) => {
  const containerSize = sizeMap[size];
  
  const locationKey = className.includes('chat-message') ? 'chat-message-other' 
    : className.includes('sidebar') ? 'sidebar'
    : className.includes('persona-detail') ? 'persona-detail'
    : 'chat-message-other';
  
  const frameKey = frameName || 'default';
  const adjustments = frameAdjustments[locationKey]?.[frameKey] || frameAdjustments[locationKey]?.default || { frameSize: 65, avatarSize: 40, offsetX: 0, offsetY: 0 };
  
  const frameSize = propFrameSize ?? adjustments.frameSize;
  const avatarSize = propAvatarSize ?? adjustments.avatarSize;
  const offsetX = propOffsetX ?? adjustments.offsetX;
  const offsetY = propOffsetY ?? adjustments.offsetY;
  
  const frameUrl = frameName ? `/frames/${frameName}.png` : null;
  const defaultAvatar = `https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&size=128`;
  
  if (!frameUrl) {
    return (
      <div 
        className={`rounded-full overflow-hidden ${className}`}
        style={{ width: containerSize, height: containerSize }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}  // 👈 添加双击
      >
        <img src={avatarUrl || defaultAvatar} alt="头像" className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: containerSize, height: containerSize, overflow: 'visible' }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}  // 👈 添加双击
    >
      {/* 头像 */}
      <img
        src={avatarUrl || defaultAvatar}
        alt="头像"
        className="absolute rounded-full object-cover"
        style={{
          width: avatarSize,
          height: avatarSize,
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
          zIndex: 1,
        }}
      />
      {/* 头像框 */}
      <img
        src={frameUrl}
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
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default AvatarFrame;