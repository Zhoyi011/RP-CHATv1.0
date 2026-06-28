// client/src/components/common/ExpBar.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface ExpBarProps {
  exp: number;
  expNeeded: number;
  level: number;
  className?: string;
  showText?: boolean;
  height?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const heightConfig = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

export const ExpBar: React.FC<ExpBarProps> = ({
  exp,
  expNeeded,
  level,
  className = '',
  showText = true,
  height = 'md',
  animated = true,
}) => {
  const percentage = Math.min((exp / expNeeded) * 100, 100);

  // 根据等级渐变
  const getBarColor = (lvl: number) => {
    if (lvl >= 50) return 'from-amber-400 to-yellow-500';
    if (lvl >= 40) return 'from-purple-400 to-pink-500';
    if (lvl >= 30) return 'from-blue-400 to-cyan-500';
    if (lvl >= 20) return 'from-emerald-400 to-teal-500';
    if (lvl >= 10) return 'from-blue-500 to-indigo-600';
    return 'from-blue-400 to-blue-500';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative ${heightConfig[height]}`}>
        <motion.div
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, type: 'spring', damping: 20 }}
          className={`h-full rounded-full bg-gradient-to-r ${getBarColor(level)} relative`}
        >
          {/* 流动光效 */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                transform: 'translateX(-100%)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </motion.div>
      </div>
      {showText && (
        <div className="flex justify-between mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          <span>{exp} / {expNeeded}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// 添加 shimmer 动画 CSS (需要在全局 CSS 中定义)
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }