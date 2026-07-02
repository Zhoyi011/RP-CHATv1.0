// client/src/components/diamond/DiamondBalance.tsx

import React, { useState, useEffect } from 'react';
import { diamondApi } from '../../services/diamondApi';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  enabled?: boolean; // 🆕 是否启用请求，默认 true
}

const DiamondBalance: React.FC<Props> = ({ 
  className = '', 
  size = 'md',
  enabled = true // 🆕 默认启用
}) => {
  const [diamonds, setDiamonds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const fetchBalance = async () => {
    // 🆕 如果未启用，跳过请求
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await diamondApi.getBalance();
      setDiamonds(data.diamonds);
    } catch (err) {
      // 🆕 静默处理错误，不显示 toast（避免在公开页面弹出错误提示）
      console.error('获取钻石失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [enabled]); // 🆕 添加 enabled 依赖

  // 🆕 如果未启用，显示占位符
  if (!enabled) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <svg className={`${iconSizes[size]} text-gray-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
        <span className={`${sizeClasses[size]} font-medium text-gray-400`}>
          --
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg className={`${iconSizes[size]} text-blue-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
      {loading ? (
        <span className={`${sizeClasses[size]} text-gray-400 animate-pulse`}>...</span>
      ) : (
        <span className={`${sizeClasses[size]} font-medium text-gray-700`}>
          {diamonds?.toLocaleString() || 0}
        </span>
      )}
    </div>
  );
};

export default DiamondBalance;