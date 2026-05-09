const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = () => localStorage.getItem('token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

// 类型定义
export interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
  metadata?: any;
}

export interface CoinStats {
  totalEarned: number;
  totalSpent: number;
  current: number;
}

export interface LeaderboardUser {
  username: string;
  displayName: string;
  avatar: string;
  coins: number;
}

// API 方法
export const coinApi = {
  // 获取当前余额
  getBalance: () => request<{ coins: number }>('/coin/balance'),
  
  // 获取交易记录
  getTransactions: (limit = 50, skip = 0) => 
    request<{ transactions: Transaction[]; stats: CoinStats }>(`/coin/transactions?limit=${limit}&skip=${skip}`),
  
  // 每日登录领取
  dailyLogin: () => request<{ claimed: boolean; reward?: number; streak?: number; newBalance?: number; reason?: string }>('/coin/daily-login'),
  
  // 获取统计
  getStats: () => request<CoinStats>('/coin/stats'),
  
  // 获取排行榜
  getLeaderboard: (limit = 10) => 
    request<{ users: LeaderboardUser[] }>(`/coin/leaderboard?limit=${limit}`),
};