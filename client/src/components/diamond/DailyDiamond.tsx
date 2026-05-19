import React, { useState, useEffect } from 'react';
import { diamondApi } from '../../services/diamondApi';
import type { DailyInfo } from '../../services/diamondApi';

interface Props {
  onClaimSuccess?: () => void;
}

const DailyDiamond: React.FC<Props> = ({ onClaimSuccess }) => {
  const [info, setInfo] = useState<DailyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [diamonds, setDiamonds] = useState(0);

  const loadInfo = async () => {
    try {
      setLoading(true);
      const [dailyData, balanceData] = await Promise.all([
        diamondApi.getDailyInfo(),
        diamondApi.getBalance()
      ]);
      setInfo(dailyData);
      setDiamonds(balanceData.diamonds);
    } catch (error) {
      console.error('加载每日信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const handleClaim = async () => {
    if (claiming || info?.hasClaimed) return;
    
    setClaiming(true);
    try {
      const result = await diamondApi.claimDaily();
      if (result.claimed) {
        // 重新加载所有数据
        await loadInfo();
        onClaimSuccess?.();
        // 显示成功提示
        alert(`领取成功！获得 ${result.reward} 钻石，连续 ${result.streak} 天`);
      } else {
        alert(result.reason || '领取失败');
      }
    } catch (error: any) {
      if (error.message === '今日已经领取过了') {
        // 刷新状态
        await loadInfo();
        alert('今日已经领取过了，明天再来吧！');
      } else {
        alert(error.message || '领取失败');
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 text-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const rewards = info?.rewards || [5, 5, 8, 8, 10, 15, 20];
  const currentStreak = info?.currentStreak || 0;
  const hasClaimed = info?.hasClaimed || false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
      {/* 头部：钻石余额 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium text-gray-800 dark:text-gray-200">每日钻石奖励</h2>
        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
          <span className="text-yellow-500 text-lg">💎</span>
          <span className="font-bold text-yellow-600 dark:text-yellow-400">{diamonds}</span>
        </div>
      </div>
      
      {/* 连续签到显示 */}
      <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl p-3 mb-4 text-center`}>
        <p className="text-sm text-gray-600 dark:text-gray-400">连续签到</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{currentStreak} 天</p>
        {hasClaimed && (
          <p className="text-xs text-green-500 mt-1">✅ 今日已领取</p>
        )}
      </div>

      {/* 奖励表 */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {rewards.map((reward, index) => {
          const dayNum = index + 1;
          // 判断是否为今天（未领取且连续天数等于当前索引）
          const isToday = !hasClaimed && currentStreak === index;
          // 判断是否已过（已领取且连续天数大于当前索引，或者已领取且今天是今天之前）
          const isPast = hasClaimed ? currentStreak > dayNum : currentStreak > dayNum;
          // 判断是否为明天（未领取且连续天数+1等于当前索引）
          const isTomorrow = !hasClaimed && currentStreak + 1 === dayNum;
          
          let bgClass = 'bg-gray-50 dark:bg-gray-700/50';
          let textClass = 'text-gray-700 dark:text-gray-300';
          
          if (isToday) {
            bgClass = 'bg-gradient-to-r from-blue-500 to-cyan-500';
            textClass = 'text-white';
          } else if (isPast) {
            bgClass = 'bg-green-50 dark:bg-green-900/20';
            textClass = 'text-green-600 dark:text-green-400';
          } else if (isTomorrow) {
            bgClass = 'bg-blue-50 dark:bg-blue-900/20';
            textClass = 'text-blue-500';
          }
          
          return (
            <div
              key={index}
              className={`text-center p-2 rounded-xl ${bgClass}`}
            >
              <p className={`text-xs font-medium mb-1 ${textClass}`}>第{dayNum}天</p>
              <p className={`text-sm font-bold ${textClass}`}>+{reward}</p>
              {isPast && (
                <svg className="w-3 h-3 mx-auto text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isToday && !hasClaimed && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5 animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* 领取按钮 */}
      <button
        onClick={handleClaim}
        disabled={hasClaimed || claiming}
        className={`w-full py-3 rounded-xl font-medium transition shadow-md ${
          hasClaimed || claiming
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 active:scale-[0.98]'
        }`}
      >
        {claiming ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            领取中...
          </span>
        ) : hasClaimed ? (
          '今日已领取 ✓'
        ) : (
          `领取 ${info?.nextReward || 5} 钻石`
        )}
      </button>

      {/* 说明 */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
        💡 连续签到天数越多，奖励越丰厚！第7天可得20钻石
      </p>
    </div>
  );
};

export default DailyDiamond;