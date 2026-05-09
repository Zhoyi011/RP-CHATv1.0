import React, { useState, useEffect } from 'react';
import { coinApi } from '../../services/coinApi';

// 本地定义类型，避免导入问题
interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface CoinStats {
  totalEarned: number;
  totalSpent: number;
  current: number;
}

const CoinHistory: React.FC<{ limit?: number; showStats?: boolean }> = ({ 
  limit = 20, 
  showStats = true 
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<CoinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await coinApi.getTransactions(limit, page * limit);
      if (page === 0) {
        setTransactions(data.transactions);
      } else {
        setTransactions(prev => [...prev, ...data.transactions]);
      }
      setStats(data.stats);
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const getTypeInfo = (type: string) => {
    const map: Record<string, { name: string; icon: string }> = {
      daily_login: { name: '每日登录', icon: '📅' },
      message: { name: '发言奖励', icon: '💬' },
      invite: { name: '邀请好友', icon: '👥' },
      purchase: { name: '购买物品', icon: '🛒' },
      reward: { name: '活动奖励', icon: '🎁' },
      admin: { name: '管理员调整', icon: '👑' },
      refund: { name: '退款', icon: '↩️' },
    };
    return map[type] || { name: type, icon: '💰' };
  };

  if (loading && page === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      {showStats && stats && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">累计获得</p>
              <p className="text-lg font-bold text-green-600">+{stats.totalEarned.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">累计消费</p>
              <p className="text-lg font-bold text-red-600">-{stats.totalSpent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">当前余额</p>
              <p className="text-lg font-bold text-amber-600">{stats.current.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* 交易记录列表 */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">交易记录</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无交易记录</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => {
              const { name, icon } = getTypeInfo(tx.type);
              const isPositive = tx.amount > 0;
              
              return (
                <div key={tx._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
                  <div className="text-xl">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800">{name}</p>
                      <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{tx.amount}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{tx.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-3 text-center text-sm text-emerald-600 hover:bg-gray-50 transition border-t border-gray-100"
        >
          加载更多
        </button>
      </div>
    </div>
  );
};

export default CoinHistory;