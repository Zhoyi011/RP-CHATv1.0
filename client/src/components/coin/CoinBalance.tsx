import React, { useState, useEffect } from 'react';
import { coinApi } from '../../services/coinApi';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showRefresh?: boolean;
}

const CoinBalance: React.FC<Props> = ({ className = '', size = 'md', showRefresh = true }) => {
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
    try {
      setLoading(true);
      setError(false);
      const data = await coinApi.getBalance();
      setCoins(data.coins);
    } catch (err) {
      console.error('获取金币失败:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    }
    return num.toLocaleString();
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg className={`${iconSizes[size]} text-yellow-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
      {loading ? (
        <span className={`${sizeClasses[size]} text-gray-400 animate-pulse`}>...</span>
      ) : error ? (
        <span className={`${sizeClasses[size]} text-red-400`}>?</span>
      ) : (
        <span className={`${sizeClasses[size]} font-medium text-gray-700 dark:text-gray-200`}>
          {formatNumber(coins || 0)}
        </span>
      )}
      {showRefresh && !loading && !error && (
        <button
          onClick={fetchBalance}
          className="ml-1 p-0.5 hover:bg-gray-100 rounded-full transition"
          title="刷新"
        >
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default CoinBalance;