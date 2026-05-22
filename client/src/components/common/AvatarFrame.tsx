import React from 'react';

interface Props {
  avatarUrl: string;
  frameUrl?: string | null;
  frameId?: string | null;  // 新增：头像框ID
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

// 每个头像框的单独配置
const frameConfigs: Record<string, { scale: number; offsetX: number; offsetY: number }> = {
  // 金色传说
  'frame_gold': { scale: 1.3, offsetX: 0, offsetY: 0 },
  // 星辰之环
  'frame_star': { scale: 1, offsetX: 2, offsetY: 10 },
  // 樱花边框
  'frame_sakura': { scale: 1.4, offsetX: 0, offsetY: 3 },
  // 简约边框
  'frame_simple': { scale: 1.1, offsetX: 0, offsetY: 0 },
  // 默认
  'default': { scale: 1.2, offsetX: 0, offsetY: 0 },
};

const sizeConfig = {
  sm: { container: 'w-12 h-12', avatar: 'w-8 h-8', frame: 'w-12 h-12' },
  md: { container: 'w-14 h-14', avatar: 'w-10 h-10', frame: 'w-14 h-14' },
  lg: { container: 'w-20 w-20', avatar: 'w-14 h-14', frame: 'w-20 h-20' },
  xl: { container: 'w-28 h-28', avatar: 'w-20 h-20', frame: 'w-28 h-28' },
};

const AvatarFrame: React.FC<Props> = ({ 
  avatarUrl, 
  frameUrl, 
  frameId,
  size = 'md', 
  className = '',
  onClick 
}) => {
  const sizes = sizeConfig[size];
  
  // 获取该头像框的配置
  const config = frameConfigs[frameId || 'default'] || frameConfigs.default;

  return (
    <div 
      className={`relative flex items-center justify-center ${sizes.container} ${className}`}
      onClick={onClick}
    >
      {/* 头像框 */}
      {frameUrl && (
        <div className={`absolute inset-0 ${sizes.frame} rounded-full overflow-hidden pointer-events-none`}>
          <img
            src={frameUrl}
            alt="头像框"
            className="w-full h-full object-cover"
            style={{ 
              transform: `scale(${config.scale}) translate(${config.offsetX}px, ${config.offsetY}px)`,
            }}
          />
        </div>
      )}
      
      {/* 头像 */}
      <div className={`${sizes.avatar} rounded-full overflow-hidden bg-white dark:bg-gray-800 shadow-sm relative z-10`}>
        <img
          src={avatarUrl || `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=96`}
          alt="头像"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default AvatarFrame;