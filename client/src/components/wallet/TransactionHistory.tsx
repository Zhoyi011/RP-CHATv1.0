import React from 'react';

// 模拟交易记录
const mockTransactions = [
  { id: 1, type: 'daily', amount: 50, desc: '每日登录奖励', date: '2026-03-18', time: '10:30' },
  { id: 2, type: 'chat', amount: 10, desc: '聊天发言奖励', date: '2026-03-17', time: '15:20' },
  { id: 3, type: 'purchase', amount: -200, desc: '购买头像框', date: '2026-03-16', time: '09:15' },
  { id: 4, type: 'daily', amount: 50, desc: '每日登录奖励', date: '2026-03-16', time: '08:00' },
  { id: 5, type: 'invite', amount: 100, desc: '邀请好友奖励', date: '2026-03-15', time: '14:30' },
];

const TransactionHistory = () => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'chat':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'purchase':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      case 'invite':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-medium mb-3">交易记录</h2>
      
      <div className="space-y-3">
        {mockTransactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
            {getTypeIcon(tx.type)}
            
            <div className="flex-1">
              <p className="font-medium text-sm">{tx.desc}</p>
              <p className="text-xs text-gray-400">{tx.date} {tx.time}</p>
            </div>
            
            <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionHistory;
