import React, { useState, useEffect } from 'react';

interface Transaction {
  _id: string;
  type: 'daily' | 'chat' | 'purchase' | 'invite' | 'reward';
  amount: number;
  description: string;
  date: string;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      // TODO: 后端需要实现交易记录接口
      // 暂时使用模拟数据，后续替换为真实 API
      const mockTransactions: Transaction[] = [
        { _id: '1', type: 'daily', amount: 50, description: '每日登录奖励', date: new Date().toISOString() },
        { _id: '2', type: 'chat', amount: 10, description: '聊天发言奖励', date: new Date(Date.now() - 86400000).toISOString() },
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('获取交易记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, { icon: string; bg: string; color: string }> = {
      daily: { icon: '📅', bg: 'bg-emerald-100', color: 'text-emerald-600' },
      chat: { icon: '💬', bg: 'bg-blue-100', color: 'text-blue-600' },
      purchase: { icon: '🛒', bg: 'bg-purple-100', color: 'text-purple-600' },
      invite: { icon: '👥', bg: 'bg-amber-100', color: 'text-amber-600' },
      reward: { icon: '🎁', bg: 'bg-pink-100', color: 'text-pink-600' },
    };
    return icons[type] || { icon: '💰', bg: 'bg-gray-100', color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-center py-8 text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-medium text-gray-800 mb-4">交易记录</h2>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">暂无交易记录</div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const { icon, bg, color } = getTypeIcon(tx.type);
            return (
              <div key={tx._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition">
                <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center text-lg`}>
                  {icon}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                </div>
                
                <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;