// client/src/components/wallet/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowUp, ArrowDown, Gift, ShoppingBag, Coins, Calendar, Send, Heart } from 'lucide-react';
import { getTransactionHistory } from '../../services/transactionApi';
import { useTheme } from '../../contexts/ThemeContext';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  diamondType: 'paid' | 'free';
  description: string;
  relatedName: string;
  balanceAfter: number;
  createdAt: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  recharge: {
    icon: <Coins className="w-4 h-4" />,
    label: '充值',
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  daily_sign: {
    icon: <Calendar className="w-4 h-4" />,
    label: '每日签到',
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  redpacket_send: {
    icon: <Send className="w-4 h-4" />,
    label: '发红包',
    color: 'text-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30'
  },
  redpacket_receive: {
    icon: <Gift className="w-4 h-4" />,
    label: '抢红包',
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  gift_send: {
    icon: <Heart className="w-4 h-4" />,
    label: '送礼物',
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30'
  },
  gift_receive: {
    icon: <Heart className="w-4 h-4" />,
    label: '收到礼物',
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30'
  },
  shop_buy: {
    icon: <ShoppingBag className="w-4 h-4" />,
    label: '购买物品',
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30'
  },
  refund: {
    icon: <ArrowUp className="w-4 h-4" />,
    label: '退款',
    color: 'text-yellow-500',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30'
  }
};

// 🔥 修改：显示完整时间
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

export const TransactionHistory: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getTransactionHistory(50);
      setTransactions(res.transactions);
      setStats(res.stats);
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <Coins className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500">暂无交易记录</p>
        <p className="text-sm text-gray-400 mt-1">充值、签到、红包等都会记录在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx, index) => {
        const config = typeConfig[tx.type] || {
          icon: <Coins className="w-4 h-4" />,
          label: '交易',
          color: 'text-gray-500',
          bg: 'bg-gray-100 dark:bg-gray-700'
        };
        const isIncome = tx.amount > 0;
        
        return (
          <motion.div
            key={tx._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {config.label}
                </span>
                {tx.diamondType === 'paid' ? (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">充值</span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">免费</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{tx.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                {isIncome ? `+${tx.amount}` : `${tx.amount}`}
              </p>
              <p className="text-xs text-gray-400">余额 {tx.balanceAfter}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};