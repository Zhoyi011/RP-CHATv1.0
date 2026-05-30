import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';

interface AFKStatusProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDuration?: boolean;
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const iconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 30 }
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } }
} as const;

const tooltipVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.1 } }
} as const;

export const AFKStatus: React.FC<AFKStatusProps> = ({ 
  className = '', 
  size = 'md',
  showDuration = true 
}) => {
  const { isAFK, afkDuration } = useAFK();
  const [showTooltip, setShowTooltip] = React.useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分钟${secs > 0 ? `${secs}秒` : ''}`;
    }
    return `${secs}秒`;
  };

  if (!isAFK) return null;

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.div
        variants={iconVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`${sizeMap[size]} rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 cursor-pointer`}
      >
        <svg 
          className="w-4 h-4 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
      </motion.div>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute left-full ml-2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded-md shadow-lg z-50"
          >
            隐私保护模式已开启
            {showDuration && afkDuration > 0 && (
              <span className="ml-1 text-gray-300">
                ({formatDuration(afkDuration)})
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};