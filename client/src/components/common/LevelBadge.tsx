// client/src/components/common/LevelBadge.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface LevelBadgeProps {
  level: number;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTitle?: boolean;
}

const sizeConfig = {
  sm: { badge: 'w-6 h-6 text-[10px]', icon: 'text-[8px]', title: 'text-xs' },
  md: { badge: 'w-8 h-8 text-sm', icon: 'text-[10px]', title: 'text-sm' },
  lg: { badge: 'w-10 h-10 text-base', icon: 'text-xs', title: 'text-base' },
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  title,
  size = 'md',
  className = '',
  showTitle = false,
}) => {
  const config = sizeConfig[size];

  // 根据等级返回不同颜色
  const getLevelColor = (lvl: number) => {
    if (lvl >= 50) return 'from-amber-400 to-yellow-500 shadow-amber-500/50';
    if (lvl >= 40) return 'from-purple-400 to-pink-500 shadow-purple-500/50';
    if (lvl >= 30) return 'from-blue-400 to-cyan-500 shadow-blue-500/50';
    if (lvl >= 20) return 'from-emerald-400 to-teal-500 shadow-emerald-500/50';
    if (lvl >= 10) return 'from-blue-500 to-indigo-600 shadow-blue-500/50';
    return 'from-gray-400 to-gray-500 shadow-gray-500/50';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${getLevelColor(level)} text-white font-bold shadow-lg ${config.badge}`}
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <span className="relative z-10">Lv.{level}</span>
      </motion.div>
      {showTitle && title && (
        <span className={`font-medium text-gray-600 dark:text-gray-300 ${config.title}`}>
          {title}
        </span>
      )}
    </div>
  );
};