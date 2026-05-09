import React, { useState, useEffect } from 'react';
import { coinApi } from '../../services/coinApi';

interface Props {
  onClaimSuccess?: () => void;
}

const DailyLogin: React.FC<Props> = ({ onClaimSuccess }) => {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastReward, setLastReward] = useState<{ reward: number; streak: number } | null>(null);
  const [checking, setChecking] = useState(true);

  // 检查今日是否已领取
  useEffect(() => {
    const checkTodayClaim = async () => {
      try {
        const today = new Date().toDateString();
        const lastClaim = localStorage.getItem('lastDailyClaim');
        setClaimed(lastClaim === today);
      } catch (error) {
        console.error('检查失败:', error);
      } finally {
        setChecking(false);
      }
    };
    checkTodayClaim();
  }, []);

  const handleClaim = async () => {
    if (claimed) return;
    
    setLoading(true);
    try {
      const result = await coinApi.dailyLogin();
      
      if (result.claimed) {
        const today = new Date().toDateString();
        localStorage.setItem('lastDailyClaim', today);
        setClaimed(true);
        setLastReward({ reward: result.reward!, streak: result.streak! });
        onClaimSuccess?.();
        alert(`领取成功！获得 ${result.reward} 金币，连续登录 ${result.streak} 天`);
      } else {
        alert(result.reason || '领取失败');
      }
    } catch (error: any) {
      console.error('领取失败:', error);
      alert(error.message || '领取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 模拟本周奖励
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const todayIndex = new Date().getDay() || 7;
  const rewards = [50, 60, 70, 80, 90, 100, 200];

  if (checking) {
    return (
      <div className="bg-white rounded-2xl shadow p-5 text-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-medium text-gray-800 mb-4">每日登录奖励</h2>
      
      {lastReward && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm text-gray-600">上次领取</p>
          <p className="text-lg font-bold text-emerald-600">
            +{lastReward.reward} 金币
          </p>
          <p className="text-xs text-gray-500">连续 {lastReward.streak} 天</p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-5">
        {weekDays.map((day, index) => {
          const dayNumber = index + 1;
          const isToday = dayNumber === todayIndex;
          const isPast = dayNumber < todayIndex;
          const reward = rewards[index];

          return (
            <div
              key={day}
              className={`text-center p-2 rounded-xl ${
                isToday && !claimed
                  ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400'
                  : isPast || claimed
                  ? 'bg-emerald-50 opacity-60'
                  : 'bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium text-gray-600 mb-1">周{day}</p>
              <p className="text-sm font-bold text-amber-600">{reward}</p>
              {(isPast || (isToday && claimed)) && (
                <svg className="w-4 h-4 mx-auto text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleClaim}
        disabled={claimed || loading}
        className={`w-full py-3 rounded-xl font-medium transition shadow-md ${
          claimed || loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600'
        }`}
      >
        {loading ? '领取中...' : claimed ? '今日已领取' : '领取今日奖励'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        连续登录天数越多，奖励越丰厚！
      </p>
    </div>
  );
};

export default DailyLogin;