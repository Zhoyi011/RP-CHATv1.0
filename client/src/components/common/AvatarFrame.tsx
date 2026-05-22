import React from 'react';

interface Props {
  avatarUrl: string;
  frameUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { container: 'w-8 h-8', avatar: 'w-7 h-7' },
  md: { container: 'w-10 h-10', avatar: 'w-9 h-9' },
  lg: { container: 'w-12 h-12', avatar: 'w-11 h-11' },
  xl: { container: 'w-24 h-24', avatar: 'w-20 h-20' },
};

const AvatarFrame: React.FC<Props> = ({ avatarUrl, frameUrl, size = 'md', className = '' }) => {
  const sizes = sizeConfig[size];

  return (
    <div className={`relative flex items-center justify-center ${sizes.container} ${className}`}>
      {/* 头像 */}
      <img
        src={avatarUrl || `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=96`}
        alt="头像"
        className={`${sizes.avatar} rounded-full object-cover`}
      />
      
      {/* 头像框 */}
      {frameUrl && (
        <div className={`absolute inset-0 ${sizes.container} pointer-events-none overflow-hidden rounded-full`}>
          <img
            src={frameUrl}
            alt="头像框"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center' }}
          />
        </div>
      )}
    </div>
  );
};

export default AvatarFrame;