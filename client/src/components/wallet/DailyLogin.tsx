import React, { useState, useEffect } from 'react';
import { authApi } from '../../services/api';

interface Props {
  onClaimSuccess?: () => void;
}

const DailyLogin: React.FC<Props> = ({ onClaimSuccess }) => {
  const [claimed, setClaimed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);

  useEffect(() => {
    checkTodayClaim();
  }, []);

  const checkTodayClaim = async () => {
    try {
      const stats = await authApi.getUserStats();
      setStreak(stats.loginStreak);
      
      // 检查今天是否已经领取过
      const today = new Date().toDateString();
      const lastClaim = localStorage.getItem('lastDailyClaim');
      setClaimed(lastClaim === today);
    } catch (error) {
      console.error('获取登录状态失败:', error);
    }
  };

  const handleClaim = async () => {
    if (claimed) return;
    
    setLoading(true);
    try {
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/user/daily-reward', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        const today = new Date().toDateString();
        localStorage.setItem('lastDailyClaim', today);
        setClaimed(true);
        setStreak(data.streak);
        
        alert(`领取成功！获得 ${data.reward} 金币，连续登录 ${data.streak} 天`);
        if (onClaimSuccess) onClaimSuccess();
      } else {
        alert(data.error || '领取失败');
      }
    } catch (error) {
      console.error('领取失败:', error);
      alert('领取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 模拟本周的每日奖励
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const todayIndex = new Date().getDay() || 7;
  const rewards = [50, 60, 70, 80, 90, 100, 200];
  
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-medium text-gray-800 mb-4">每日登录奖励</h2>
      
      {/* 连续登录天数 */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 mb-5">
        <p className="text-sm text-gray-600">连续登录</p>
        <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
          {streak} 天
        </p>
      </div>

      {/* 本周奖励 */}
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

      {/* 领取按钮 */}
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