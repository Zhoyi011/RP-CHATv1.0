import React, { useState } from 'react';

const DailyLogin = () => {
  const [claimed, setClaimed] = useState(false);
  const [streak, setStreak] = useState(3); // 连续登录天数

  const handleClaim = () => {
    // TODO: 调用后端领取接口
    setClaimed(true);
  };

  // 模拟本周的每日奖励
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const today = new Date().getDay() || 7; // 今天是周几（1-7）
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-medium mb-3">每日登录奖励</h2>
      
      {/* 连续登录天数 */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-gray-600">连续登录</p>
        <p className="text-2xl font-bold text-yellow-600">{streak} 天</p>
      </div>

      {/* 本周奖励 */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((day, index) => {
          const dayNumber = index + 1;
          const isToday = dayNumber === today;
          const isPast = dayNumber < today;
          const reward = [50, 60, 70, 80, 90, 100, 200][index];

          return (
            <div
              key={day}
              className={`text-center p-2 rounded-lg ${
                isToday && !claimed
                  ? 'bg-yellow-100 border-2 border-yellow-500'
                  : isPast || claimed
                  ? 'bg-green-50 opacity-50'
                  : 'bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium mb-1">周{day}</p>
              <p className="text-sm font-bold text-yellow-600">{reward}</p>
              {(isPast || (isToday && claimed)) && (
                <svg className="w-4 h-4 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        disabled={claimed}
        className="w-full bg-yellow-500 text-white py-3 rounded-lg font-medium hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {claimed ? '今日已领取' : '领取今日奖励'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        连续登录天数越多，奖励越丰厚！
      </p>
    </div>
  );
};

export default DailyLogin;
