import React, { useState, useEffect } from 'react';
import { diamondApi } from '../../services/diamondApi';

// ✅ 直接在组件内定义类型
interface DailyInfo {
  hasClaimed: boolean;
  currentStreak: number;
  nextReward: number;
  rewards: number[];
}

interface Props {
  onClaimSuccess?: () => void;
}

const DailyDiamond: React.FC<Props> = ({ onClaimSuccess }) => {
  const [info, setInfo] = useState<DailyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const loadInfo = async () => {
    try {
      setLoading(true);
      const data = await diamondApi.getDailyInfo();
      setInfo(data);
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
        await loadInfo();
        onClaimSuccess?.();
        alert(`领取成功！获得 ${result.reward} 钻石，连续 ${result.streak} 天`);
      } else {
        alert(result.reason || '领取失败');
      }
    } catch (error: any) {
      alert(error.message || '领取失败');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-5 text-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const rewards = info?.rewards || [5, 5, 8, 8, 10, 15, 20];
  const currentStreak = info?.currentStreak || 0;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-medium text-gray-800 mb-4">每日钻石奖励</h2>
      
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 mb-4 text-center">
        <p className="text-sm text-gray-600">连续签到</p>
        <p className="text-2xl font-bold text-blue-600">{currentStreak} 天</p>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {rewards.map((reward, index) => {
          const dayNum = index + 1;
          const isToday = !info?.hasClaimed && currentStreak === index;
          const isPast = currentStreak > index;
          
          return (
            <div
              key={index}
              className={`text-center p-2 rounded-xl ${
                isToday
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                  : isPast
                  ? 'bg-blue-100 opacity-60'
                  : 'bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium mb-1">第{dayNum}天</p>
              <p className="text-sm font-bold">+{reward}</p>
              {isPast && (
                <svg className="w-4 h-4 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleClaim}
        disabled={info?.hasClaimed || claiming}
        className={`w-full py-3 rounded-xl font-medium transition shadow-md ${
          info?.hasClaimed || claiming
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
        }`}
      >
        {claiming ? '领取中...' : info?.hasClaimed ? '今日已领取' : `领取 ${info?.nextReward || 5} 钻石`}
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        连续签到天数越多，奖励越丰厚！最高可得20钻石
      </p>
    </div>
  );
};

export default DailyDiamond;